---
title: Web Requests
description: Make HTTP requests from your Carbon plugins using the built-in webrequest API, with both callback-based and async/await styles.
---

# Web Requests

Carbon provides a built-in `webrequest` API for making outbound HTTP requests from plugins. It is fully compatible with
Oxide and extends it with an async/await variant for use in Carbon-only plugins.

:::info Availability
`webrequest` is available in both `RustPlugin` and `CarbonPlugin`. The async variant (`EnqueueAsync`) requires
`CarbonPlugin`.
:::

## GET Request

The simplest request — fetch data from a URL.

```csharp
private void OnServerInitialized()
{
    webrequest.EnqueueGet("https://api.example.com/status", OnStatusReceived, this);
}

private void OnStatusReceived(int code, string response)
{
    if (code != 200 || response == null)
    {
        PrintError($"Request failed: {code}");
        return;
    }

    Puts($"Server status: {response}");
}
```

## POST Request

Send data to an endpoint.

```csharp
private void SendReport(string payload)
{
    webrequest.EnqueuePost(
        "https://api.example.com/report",
        payload,
        (code, response) =>
        {
            if (code != 200)
            {
                PrintError($"Report failed ({code}): {response}");
                return;
            }

            Puts("Report sent successfully.");
        },
        this
    );
}
```

## Custom Headers

Pass a `Dictionary<string, string>` as the `headers` parameter. Common use case: Authorization tokens.

```csharp
private void FetchProtectedData()
{
    var headers = new Dictionary<string, string>
    {
        ["Authorization"] = "Bearer my-secret-token",
        ["Content-Type"]  = "application/json",
    };

    webrequest.EnqueueGet(
        "https://api.example.com/private",
        (code, response) => Puts(response),
        this,
        headers
    );
}
```

## Timeout

Requests default to 30 seconds. Pass a custom timeout (in seconds) as the last parameter.

```csharp
// 10-second timeout
webrequest.EnqueueGet(
    "https://api.example.com/slow-endpoint",
    (code, response) => Puts(response),
    this,
    null,
    10f
);
```

## Async / Await (Carbon-only)

`CarbonPlugin` exposes `EnqueueAsync`, which returns an awaitable `Task`. This lets you write linear code
without nested callbacks — useful inside `OnAsyncServerShutdown` or any `async` method.

```csharp
private async void OnServerInitialized()
{
    await webrequest.EnqueueAsync(
        "https://api.example.com/init",
        null,
        (code, response) =>
        {
            if (code != 200)
            {
                PrintError($"Init call failed: {code}");
                return;
            }

            Puts($"Init response: {response}");
        },
        this
    );

    Puts("Web request completed, continuing initialization.");
}
```

:::tip Oxide Compatibility
Use the `#if CARBON` conditional to call `EnqueueAsync` only on Carbon while falling back to `EnqueueGet`
on Oxide:

```csharp
private void OnServerInitialized()
{
#if CARBON
    _ = EnqueueAsyncInit();
#else
    webrequest.EnqueueGet("https://api.example.com/init", OnInitResponse, this);
#endif
}

#if CARBON
private async System.Threading.Tasks.Task EnqueueAsyncInit()
{
    await webrequest.EnqueueAsync(
        "https://api.example.com/init",
        null,
        OnInitResponse,
        this
    );
}
#endif

private void OnInitResponse(int code, string response)
{
    if (code == 200) Puts($"Init OK: {response}");
}
```

:::

## Sending JSON

Serialize your payload with `JsonConvert` and set `Content-Type` accordingly.

```csharp
private void PostJson(object payload)
{
    var body    = JsonConvert.SerializeObject(payload);
    var headers = new Dictionary<string, string>
    {
        ["Content-Type"] = "application/json",
    };

    webrequest.EnqueuePost(
        "https://api.example.com/data",
        body,
        (code, response) =>
        {
            if (code != 200)
            {
                PrintError($"POST failed ({code}): {response}");
                return;
            }

            var result = JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
            Puts($"Got: {result?["message"]}");
        },
        this,
        headers
    );
}
```

## Method Reference

| Method | Oxide | Carbon | Notes |
|---|:---:|:---:|---|
| `webrequest.EnqueueGet(url, callback, owner, headers, timeout)` | ✅ | ✅ | Shorthand for GET |
| `webrequest.EnqueuePost(url, body, callback, owner, headers, timeout)` | ✅ | ✅ | Shorthand for POST |
| `webrequest.Enqueue(url, body, callback, owner, method, headers, timeout)` | ✅ | ✅ | Any `RequestMethod` (GET, POST, PUT, DELETE, …) |
| `webrequest.EnqueueAsync(url, body, callback, owner, method, headers, timeout)` | ❌ | ✅ | Awaitable; requires `CarbonPlugin` |

:::danger Important
Always check the status code before using the response. A non-200 code or a `null` response means the
request failed. Treating a failed response as valid data is a common source of `NullReferenceException`.
:::
