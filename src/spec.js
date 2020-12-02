const { BeaconStatus } = require('./constants');
const { ERRORS, ActionExecutionError } = require('./error');

/**
 * Waits a given milliseconds before resolving.
 * @param {number} time - The time to wait
 * @return {Promise<unknown>}
 */
const wait = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));  

/**
 * Delays a promise resolve with a given time.
 * @param {number} time - The time to wait.
 * @return {Promise<unknown>}
 */
const delayResolve = (time = 100) => new Promise((resolve) => setTimeout(resolve, time));

describe('lib/readinessManager', () => {
    let readyManager;

    beforeEach(() => {
        jest.isolateModules(() => {
            readyManager = require('./index');
        });
    });

    afterEach(jest.clearAllMocks);

    describe('API', () => {
        it.each([
            'register',
            'run',
            'onReady',
            'onActionReady',
            'status',
            'onError'
        ])('Exposes public API (%p)', (property) => {
            expect(typeof readyManager[property]).toBe('function');
        });

        it.each([
            'beacons',
            'callbacks',
            'execute',
            'updateBeacon'
        ])('Encapsulates private properties (%p)', (property) => {
            expect(readyManager[property]).toBeUndefined();
        });
    });

    describe('status', () => {
        describe('When no actions are registered', () => {
            it('Return an empty object', () => {
                expect(readyManager.status()).toEqual({});
            });
        });

        describe('When some actions exists', () => {
            it('Group registered actions with same status', async() => {
                readyManager.register('success', () => Promise.resolve());
                readyManager.register('other', () => Promise.resolve());
                readyManager.register('fail', () => Promise.reject(new Error()));

                readyManager.run();
                await wait(10);

                const status = readyManager.status();

                expect(status[BeaconStatus.RESOLVED]).toEqual(['success', 'other']);
                expect(status[BeaconStatus.REJECTED]).toEqual(['fail']);
            });
        });
    });

    describe('register', () => {
        describe('When given action name is unique', () => {
            it('Registers action and name as beacon with not_started status', () => {
                readyManager.register('action', () => true);

                expect(readyManager.status()[BeaconStatus.NOT_STARTED])
                    .toHaveLength(1);
            });
        });

        describe('When action name was already registered', () => {
            it('Throws upon registration', () => {
                readyManager.register('once', () => true);

                expect(() => readyManager.register('once'))
                    .toThrowError(ERRORS.BEACON_ALREADY_EXISTS);
            });
        });
    });

    describe('run', () => {
        beforeEach(() => {
            readyManager.register('action1', delayResolve);
            readyManager.register('action2', delayResolve);
        });

        it('Executes all given actions', async() => {
            expect(readyManager.status()[BeaconStatus.NOT_STARTED])
                .toHaveLength(2);

            readyManager.run();

            expect(readyManager.status()[BeaconStatus.NOT_STARTED])
                .toBeUndefined();

            expect(readyManager.status()[BeaconStatus.PENDING])
                .toHaveLength(2);
        });
    });

    describe('ready', () => {
        it('Returns false by default', () => {
            expect(readyManager.ready).toBeFalsy();
        });

        describe('When all actions resolves', () => {
            beforeEach(() => {
                readyManager.register('action1', () => true);
                readyManager.register('action2', () => true);

                readyManager.run();
            });

            it('Is ready', () => expect(readyManager.ready).toBeTruthy());
        });

        describe('When some action fails', () => {
            beforeEach(() => {
                readyManager.register('action1', () => true);
                readyManager.register('action2', () => { throw new Error('What?'); });

                readyManager.run();
            });

            it('Is not ready', () => expect(readyManager.ready).toBeFalsy());
        });
    });

    describe('onReady', () => {
        let callback;

        beforeEach(() => callback = jest.fn());

        const ensureFresh = () => {
            readyManager.register('action1', () => true);
            expect(callback).toHaveBeenCalledTimes(0);
        };

        describe('When process is not ready', () => {
            const callback = jest.fn();

            it('Registers given callback', () => {
                ensureFresh();

                readyManager.onReady(callback);
                readyManager.run();

                expect(callback).toHaveBeenCalledTimes(1);
            });
        });

        describe('When process is already ready', () => {
            it('Activates immediately given callback', () => {
                ensureFresh();

                readyManager.run();
                readyManager.onReady(callback);

                expect(callback).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('onActionReady', () => {
        let callback;

        beforeEach(() => callback = jest.fn());

        it('Throws when action does not exists', () => {
            expect(() => readyManager.onActionReady('Hey', () => false))
                .toThrowError(ERRORS.BEACON_DOES_NOT_EXISTS);
        });

        describe('When action is not ready', () => {
            it('Triggers callback once desired aciton is ready', async() => {
                readyManager.register('some', () => true);
                readyManager.register('thing', () => delayResolve(500));
                readyManager.register('other', () => delayResolve(1000));

                readyManager.onActionReady('thing', callback);

                readyManager.run();
                expect(callback).toHaveBeenCalledTimes(0);

                await wait(500);

                expect(callback).toHaveBeenCalledTimes(1);
            });
        });

        describe('When action is already resolved', () => {
            it('Triggers immediately given callback', () => {
                readyManager.register('some', () => true);

                readyManager.run();
                readyManager.onActionReady('some', callback);

                expect(callback).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('onError', () => {
        let logger;
        beforeEach(() => logger = jest.fn());

        describe('When no errors occur', () => {
            beforeEach(() => {
                readyManager.register('success', () => true);
                readyManager.onError((error) => {
                    logger(error);
                });
                readyManager.run();
            });

            it('Won\'t trigger error handler', () => {
                expect(logger).toHaveBeenCalledTimes(0);
            });
        });

        describe('When error occur', () => {
            const error = new Error('Oh man, that did not worked!');

            beforeEach(() => {
                readyManager.register('success', () => { throw error; });

                readyManager.onError((error) => {
                    logger(error);
                });

                readyManager.run();
            });

            it('Triggers consumer handler with beacon execution error', () => {
                expect(logger).toHaveBeenCalledWith(
                    new ActionExecutionError('success', error)
                );
            });
        });
    });
});
