
Controlling node application readiness state.

## Motivation

In many cases node application depends on external resources that should be available before truly starting up.
This manager gives you the ability to orchestrate several actions independently. It is waiting for their completion to defines your app readiness state.

This comes truly handy when your application runs inside Kubernetes which can check its readiness state.

## Getting started

Register at any point an async action with a declarative alias and run them once your app starts.

```js
// app.index.js
const axios = require('axios');
const ReadinessManager = require('readiness-manager');

ReadinessManager.register('vendors', () => axios.get('https://www.cdn.vendors.com'));
ReadinessManager.register('translations', () => axios.get('https://www.translations.com'));

// Starts all registered actions
ReadinessManager.run();

// Will be triggered once all registered actions are successfully resolved.
ReadinessManager.onReady(() => console.log('App is ready! \o/'));
```

This will allow you to set up an health check route, checking if you app readiness state as following:

```js
// routes.health.js

if (ReadinessManager.ready) {
    res.status(200).end(`App is ready and running well`);
    return;
} else {
    res.status(503).end('App is not ready');
}
```

## API

### ready: boolean

Returns `true` if all the registered actions has been ran without exceptions/rejections.

### register(name: string, action: ReadyAction): void

Registers a given name and action under `ReadinessManager`, registered actions will be observed once ran in order to determine the process readiness state.

```ts
type ReadyAction = () => void|Promise<void>;
```

### run(): void

Runs all registered actions, once all actions are resolved successfully your'e app state will be determined as `ready`.

### onReady(callback: ReadyCallback): void

Registers a given callback on the global manager ready event.

```ts
type ReadyCallback = () => void;
```

### onActionReady(name: string callback: ReadyCallback): void

```ts
type ReadyCallback = () => void;
```

Registers a given callback on a specific action completion event.

### onError(errorHandler: ActionErrorHandler): void

```ts
type ActionErrorHandler = (error: ActionExecutionError, retry: ActionRetry) => void;

type ActionRetry = () => Promise<void>;
```

Registers given error handler under the `ReadinessManager`. Any error that will be thrown from execution one of the registered actions will trigger this handler.

> You can use the `retry` method provided to your error handler according to any failure strategy you like.

### status(): ActionsStatus

Returns a status report for current registered actions.

```ts
type ActionsStatus = {
    [status in ActionStatus]: string[];
};

type ActionStatus = 'not_started' | 'pending' | 'resolved' | 'rejected';
```

### Errors handling

You can register an error handler over the manager, which will be triggered from any thrown error from it's registered actions.
Once an error rises, the manager will trigger the error handler with both occurred error and a `retry` method used to re-execute the failing action if desired.

> The default error handle will just log errors to console and thus strongly recommended to register your'e own handler.

```js
// app.index.js
const ReadinessManager = require('readiness-manager');

let count = 0;
const unstableAction = () => new Promise((resolve, reject) => {
    count++;
    if (counter <= 1) { return reject(new Error('Not yet')); }

    resolve('Ok');
});

ReadinessManager.register('action', unstableAction);

ReadinessManager.onError((error, retry) => {
   console.log(error);
   if (count <= 1) retry();
});

ReadinessManager.run();
```
