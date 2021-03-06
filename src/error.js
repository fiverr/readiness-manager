/**
 * The possible errors that could be thrown.
 * @type {Object<string>}
 */
const ERRORS = {
    BEACON_ALREADY_EXISTS: 'Beacon is already exists, please ensure to use a unique name per beacon',
    BEACON_DOES_NOT_EXISTS: 'Beacon does not exists, make sure to call `register` before trying to set beacon ready hook.',
    BEACON_EXECUTION_FAILED: 'Beacon execution failed'
};

/**
 * The custom error the be thrown when beacon execution fails.
 * @type {ActionExecutionError}
 */
class ActionExecutionError extends Error {
    constructor(name, attempt, error) {
        super();

        Object.assign(this, {
            message: ERRORS.BEACON_EXECUTION_FAILED,
            name,
            attempt,
            stack: error.stack,
            failReason: error.message
        });
    }
}

/**
 * Default error handler to be triggered upon beacon errors.
 * @param beaconError - The beacon error that occur.
 * @type {ActionErrorHandler}
 */
const defaultErrorHandler = (
    beaconError
) => console.log(beaconError); // eslint-disable-line no-console

module.exports = {
    ERRORS,
    ActionExecutionError,
    defaultErrorHandler
};
