---
title: Async Shutdown
description: Grants the ability for plugins to let the server know that it should wait for a bit for the plugin to properly shut down after a while.
---

# Async Shutdown

This is a `CarbonPlugin` specific feature, which allows developers to halt (in a non-laggy way) the server shutdown to
complete processes that require more than one frame to complete.

:::danger Important
This affects the process of the **direct shutdown** and **queued restart** of the server.
:::

## How It Works

Carbon plugins inherit a virtual method for handling shutdowns:

```csharp
public virtual async ValueTask OnAsyncServerShutdown()
{
    await Task.CompletedTask;
}
```

Override this method in your plugin to execute asynchronous cleanup logic.
The server shutdown process will wait until completion.

## Implementation Example

Here’s how to override `OnAsyncServerShutdown` to delay shutdown for critical tasks:

```csharp
public override async ValueTask OnAsyncServerShutdown()
{
    // Simulate a 3-second cleanup task.
    await AsyncEx.WaitForSeconds(3f);

    // Wait for a full web request call
    await webrequest.EnqueueAsync(
        "https://google.com", 
        null, 
        (code, data) =>
        {
            if (code != 200)
                return; // Handle errors
            // Process response data
        }, 
        this
    );
}
```
