const {
    ERRORS,
    ActionExecutionError,
    defaultErrorHandler
} = require('./error');
const { BeaconStatus } = require('./constants');

/**
 * Sets of private attributes which should not be exposed / accessed by consumer.
 * @type {Object<Symbol>}
 */
const Symbols = [
    'beacons',
    'callbacks',
    'execute',
    'trackBeaconUpdate',
    'updateBeacon',
    'errorHandler'
].reduce((acc, key) => ({ ...acc, [key]: Symbol() }), {});

/**
 * The internal "ready" state to determine process readiness.
 * @type {boolean}
 */
let readyState = false;

/**
 * @type ReadinessManager
 */
class ReadinessManager {
    constructor() {
        this[Symbols.beacons] = {};
        this[Symbols.callbacks] = [];
        this[Symbols.errorHandler] = defaultErrorHandler;

        this[Symbols.execute] = this[Symbols.execute].bind(this);
    }

    /**
     * Returns true if current process state is considered as "ready".
     * @return {boolean}
     */
    get ready() {
        return readyState;
    }

    /**
     * Returns current registered actions status
     * @return {ActionsStatus}
     */
    status() {
        return Object.values(this[Symbols.beacons])
            .reduce((acc, { name, status }) => {
                const current = acc[status] || [];
                return Object.assign(acc, { [status]: [...current, name] });
            }, {});
    }

    /**
     * Registers a given name and action as beacon under manager.
     * @param {string} name - The operation name to register with.
     * @param {ReadyAction} action - The ready emitter to condition the process readiness with.
     */
    register(name, action) {
        if (this.ready) { return; }

        if (this[Symbols.beacons][name]) { throw new Error(ERRORS.BEACON_ALREADY_EXISTS); }

        const beacon = {
            name,
            action,
            callbacks: [],
            status: BeaconStatus.NOT_STARTED
        };

        Object.assign(this[Symbols.beacons], { [name]: beacon });
    }

    /**
     * Runs current registered beacons execution to determine process "ready" state.
     */
    run() {
        readyState = false;

        Object.values(this[Symbols.beacons])
            .map(this[Symbols.execute]);
    }

    /**
     * Registers a given callback to be triggered once process is marked as "ready".
     * @param {ReadyCallback} callback
     */
    onReady(callback) {
        if (readyState) {
            // Invokes immediately given callback if process is already ready.
            return callback();
        }

        this[Symbols.callbacks].push(callback);
    }

    /**
     * Registers a given callback on a specific action resolved..
     * @param {string} name - The name of the action the callback should be attached to.
     * @param {ReadyCallback} callback - The callback to run upon beacon resolved.
     */
    onActionReady(name, callback) {
        const beacon = this[Symbols.beacons][name];
        if (!beacon) { throw new Error(ERRORS.BEACON_DOES_NOT_EXISTS); }

        if (beacon.status === BeaconStatus.RESOLVED) {
            // Invokes immediately given callback if beacon status is already resolved.
            return callback();
        }

        this[Symbols.beacons][name].callbacks.push(callback);
    }

    /**
     * Registers a given error handler under manager errors.
     * @param {ActionErrorHandler} errorHandler - The handler to trigger upon action errors.
     */
    onError(errorHandler) {
        Object.assign(this, { [Symbols.errorHandler]: errorHandler });
    }

    /**
     * Tracks a given beacon action
     * @param {Beacon} beacon
     * @throws {ActionExecutionError}
     * @private
     */
    async [Symbols.execute](beacon) {
        const { name, action } = beacon;

        const update = (status) => this[Symbols.updateBeacon](name, status);

        update(BeaconStatus.PENDING);

        try {
            // The actual beacon execution we want to keep track on.
            const result = action();

            if (result instanceof Promise) {
                await result;
            }

            update(BeaconStatus.RESOLVED);
        } catch (error) {
            update(BeaconStatus.REJECTED);

            // Invokes consumer error hook with a retry method and the beacon error.
            this[Symbols.errorHandler](
                new ActionExecutionError(name, error),
                () => this[Symbols.execute](beacon)
            );
        }
    }

    /**
     * Updates a given beacon name with a given status.
     * @param name - The beacon name to update.
     * @param status - The beacon status to set.
     * @private
     */
    [Symbols.updateBeacon](name, status) {
        Object.assign(
            this[Symbols.beacons][name],
            { status }
        );

        // Resolves specific beacon ready listeners.
        if (status === BeaconStatus.RESOLVED) {
            this[Symbols.beacons][name].callbacks.map(
                (callback) => callback()
            );
        }

        this[Symbols.trackBeaconUpdate]();
    }

    /**
     * Tracks an beacon update event, checks whether process is "ready".
     * If so, will trigger registered `onReady` callbacks.
     * @private
     */
    [Symbols.trackBeaconUpdate]() {
        if (readyState) { return; }

        readyState = Object.values(this[Symbols.beacons])
            .every((beacon) => beacon.status === BeaconStatus.RESOLVED);

        readyState && this[Symbols.callbacks].map((callback) => callback());
    }
}

module.exports = new ReadinessManager();
