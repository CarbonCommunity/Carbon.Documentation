---
title: Commands
description: Comprehensive guide to command types and authentication in Carbon plugins for Rust
---

# Command System Overview

Carbon provides multiple command types to handle different interaction scenarios, along with powerful authentication
mechanisms to control access.

:::info Core Concept
Commands are the primary interface between players/admins and your plugin functionality. Carbon extends upon Rust and
Oxide command systems with enhanced security and flexibility features.
:::

## Command Types Overview

### 1. Chat Commands

**Client-only execution** through in-game chat.

```csharp
[ChatCommand("welcome")]
private void WelcomeCommand(BasePlayer player, string command, string[] args)
{
    player.ChatMessage("Welcome to our server! Type /help for guides.");
}
```

### 2. Console Commands

Available in F1 console and server terminal or RCon.

```csharp
[ConsoleCommand("mycommand2")]
private void MyCommand2(ConsoleSystem.Arg arg)
{
    arg.ReplyWith("Just got called!");
}
```

:::tip Reply Context
`arg.ReplyWith` will print a reply log from the place where it was called, for example calling
`mycommand` from the client F1 console, it'll print that log only there.
:::

### 3. Universal Commands

Accessible through all interfaces (chat, F1, console, RCon).

```csharp
[Command("myunicommand")]
private void MyUniversalCommand(BasePlayer player, string command, string[] args)
{
    if (player == null)
    {
        Puts("woo Wee!");
    }
    else
    {
        player.ChatMessage("Wee woo!");
    }
}
```

:::danger Note
Always check for `null` player when handling universal commands.
:::

### 4. Protected Commands

Secure commands with randomized identifiers

> This is a special type of command mainly used by Carbon CUI elements
> (e.g. `ProtectedButton`, `ProtectedInputField`)
> which randomizes the command in a server-specific way to protect servers from players calling plugin commands that are
> meant to be called using the authority-based UIs and having the ability to do so if they own the said plugins, and
> know
> what the commands of the plugin are.

```csharp
[ProtectedCommand("mydopecommand")]
private void SuperSecret(ConsoleSystem.Arg arg)
{
    Puts("How'd you do that!?");
}

// Demonstration
private void OnServerInitialized()
{
    var callableCommand = Community.Protect("mydopecommand");
    Puts($"{callableCommand}");

    // Command that can be called by the clients:
    //     carbonprotecc_npomamd1mompd8d2

    ConsoleSystem.Run(ConsoleSystem.Option.Server, callableCommand);
}
```

:::danger Security Note
It is highly recommended that ALL your plugins that have commands that aren't
supposed to be manually called (in console/chat by players) should consider using `ProtectedCommand`.
:::

## Authentication Attributes

### Permission attribute (multiple allowed)

Will only allow players which are granted the permission(s) (or their groups) to execute the command.

```csharp
[ConsoleCommand("helloworld"), Permission("plugin.use")]
private void HelloWorld(ConsoleSystem.Arg arg) { }
```

### Group attribute (multiple allowed)

Will only allow players which are granted the groups(s) to execute the command.

```csharp
[ChatCommand("helloworld"), Group("admin"), Group("vip")]
private void HelloWorld(BasePlayer player, string command, string[] args) { }
```

### AuthLevel attribute

Will only allow players which minimally have the auth-level set to execute the command.

```csharp
[ConsoleCommand("helloworld"), AuthLevel(2)]
private void HelloWorld(ConsoleSystem.Arg arg) { }
```

| Level | Player type |
|:-----:|:-----------:|
|  `0`  |   Player    |
|  `1`  |  Moderator  |
|  `2`  |    Owner    |
|  `3`  |  Developer  |

### Cooldown attribute

This will disallow players from executing a command too fast. It's relative to player calls, meaning others can call the
command.

```csharp
// Cools down the command for 5 seconds.
[ChatCommand("helloworld"), Cooldown(5_000)]
private void HelloWorld(BasePlayer player, string command, string[] args) { }
```

### Multiple authentication levels

You may use one (like above) or multiple authentication levels, like the following example:

```csharp
// Players must have the 'plugin.use' permission,
// have assigned owner AuthLevel and will only allow
// the command to be called every 10 seconds by the same player.
[ChatCommand("helloworld"),
 Permission("plugin.use"),
 AuthLevel(2),
 Cooldown(10_000)]
private void HelloWorld(BasePlayer player, string command, string[] args) { }
```

:::tip Recommendations

- Combine multiple authentication layers for sensitive operations
- Use **Cooldown** to prevent abuse of resource-intensive commands
  :::

## Reference Table

| Command Type         | Chat | F1 Console | Server Terminal & RCon |
|----------------------|:----:|:----------:|:----------------------:|
| `[ChatCommand]`      |  ✅   |     ❌      |           ❌            |
| `[ConsoleCommand]`   |  ❌   |     ✅      |           ✅            |
| `[RConCommand]`      |  ❌   |     ❌      |           ✅            |
| `[Command]`          |  ✅   |     ✅      |           ✅            |
| `[ProtectedCommand]` |  ❌   |     ⚠️     |           ⚠️           |
