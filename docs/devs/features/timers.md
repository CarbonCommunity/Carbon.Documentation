---
title: Timers
description: Timers grant you the ability to execute code at set intervals, repeating or every specified time, as well as using `NextFrame` which can be useful in some cases.
---

# Timers

Timers grant you the ability to execute code at set intervals, repeating or every specified time, as well as using
`NextFrame` which can be useful in some cases.

## One-shots

They allow you to execute callbacks once after a certain amount of time.
There's no difference between `In` and `Once`.

```csharp
timer.In(1f, () =>
{
    Puts("Got called!");
});
```

```csharp
timer.Once(1f, () =>
{
    Puts("Got called!");
});
```

## Every specified time

Every timer execute callbacks every specified time, endlessly, as long as the plugin is loaded.

```csharp
timer.Every(60f, () =>
{
    Puts("Got called!");
});
```

## Repeating timers

They execute callbacks every specified amount of seconds, for a limited amount of times.

```csharp
timer.Repeat(10f, 5, () =>
{
    Puts("This gets called 5 times every 10 seconds.");
});
```

## Cancelling timers

You have the ability to cancel and stop timers from continuing their execution.

```csharp
var newTimer = timer.Every(10f, () =>
{
    Puts("Called after 10 seconds, hopefully.");
});

newTimer.Destroy();
```

```csharp
Timer newTimer = default;
var tick = 0;

newTimer = timer.Every(10f, () =>
{
    tick++;

    if (tick >= 50)
    {
        Puts("Cancelled after a condition.");
        newTimer.Destroy();
    }
});
```

## Next frame

In some cases, you would like to execute code right after the current frame finished executing all the various things
your plugin might do.

```csharp
Puts("Frame 1");

NextFrame(() =>
{
    Puts("Frame 2");
});

Puts("Frame 3");

// Output:
//     Frame 1
//     Frame 3
//     Frame 2
```

:::danger Notice
Important to note, `NextFrame` and `NextTick` are the exact same thing. They're both inside of Carbon due to Oxide
compatibility.
:::
