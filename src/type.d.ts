type ReadyCallback = () => void;
type ReadyAction = () => void|Promise<void>;
type ActionRetry = () => Promise<void>;
type ActionStatus = 'not_started' | 'pending' | 'resolved' | 'rejected';

interface Beacon {
    name: string;
    action: ReadyAction;
    status: ActionStatus;
    callbacks: ReadyCallback[];
}

type BeaconsMap = { [name: string] : Beacon };

interface ActionExecutionError extends Error {
    name: string;
    stack: string;
    failReason: string;
}

type ActionErrorHandler = (error: ActionExecutionError, retry: ActionRetry) => void;

type ActionsStatus = {
    [status in ActionStatus]: string[];
};

interface ReadinessManager {
    register: (name: string, action: ReadyAction) => void;
    run: () => void;
    onReady:(callback: ReadyCallback) => void;
    onActionReady:(name: string, callback: ReadyCallback) => void;
    onError:(errorHandler: ActionErrorHandler) => void;
    status:() => ActionsStatus;
    ready: boolean;
}
