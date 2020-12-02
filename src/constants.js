/**
 * The possible beacon status.
 * @type {{ NOT_STARTED: string, RESOLVED: string, PENDING: string, REJECTED: string }}
 */
const BeaconStatus = {
    NOT_STARTED: 'not_started',
    PENDING: 'pending',
    RESOLVED: 'resolved',
    REJECTED: 'rejected'
};

module.exports = {
    BeaconStatus
};
