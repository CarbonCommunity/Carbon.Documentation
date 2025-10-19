---
title: Bridge
description: A self-managing bridge system dedicated to allow server owners and plugin developers communicate between the server network, directly.
---

<script setup lang="ts">
import CarbonButton from '@/components/CarbonButton.vue'
import { CodeIcon } from 'lucide-vue-next'
</script>

# Bridge
A self-managing bridge system dedicated to allow server owners and plugin developers communicate between the server network, directly. It uses Rust's network reading/writing with the only difference being, this allows you to communicate with one or multiple servers at once.

<CarbonButton href="https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Components/Bridge.cs" :icon="CodeIcon" text="Source Code" external/>

## Server
At its core, it uses `Fleck` (AKA Facepunch `RCon`'s listener). It's entirely independent to Rust's `RCon` system, it just uses the core components at base (connection and memory management, etc.).

:::tip USEFUL
Carbon attempts to boot up **Carbon.Bridge** right before Rust's `RCon` attempts to get online. It looks for `-bridge.ip` [optional], `-bridge-port` [optional] and `-bridge.password` [required]. 

> By default, **the Bridge server won't boot**, unless the password is set in the command-line.

```csharp
Carbon.Components.Bridge.Server.Start(
    port: Carbon.Switches.GetBridgePort(defaultValue: $"{RCon.Port + 1}").ToInt(),
    password: Carbon.Switches.GetBridgePassword(defaultValue: "unset"),
    ip: Carbon.Switches.GetBridgeIp());
```
:::

## Client
A simple client websocket connector. Designed to connect to `BridgeServer` infrastructure and easily understand/communicate Bridge messages back and forth.

You can create multiple `BridgeClient` connections to many of your servers, as necessary.

This class is as straightforward as it gets. It connects to the server, disconnects from it when you choose to or the server goes down, and sends a data packet in the form of `BridgeWrite`, while listening to incoming server packets to ensure that back-n-forth communication. 

## Messages
A default message set for the bridge events and channels. **Carbon.Bridge** comes with the following channels you can use for various things.

:::tip
- `OnRpc(BridgeRead read)` — Designed to execute methods the same way Rust entities do.
- `OnCommand(BridgeRead read)` — Handles events such as commands with arguments and such.
- `OnCustom(BridgeRead read)` — Completely custom or separate handling of packets, designed the way you want.
- `OnUnhandled(BridgeRead read)` — These are leftover events, to ensure there's no spilling of packets. 
:::

## Example
Here's a fully working example of how this whole thing works. It's a good starting point too. Just follow summaries and don't let yourself be overwhelmed, it's actually easier than you think.

:::info OUTPUT
This is the output of the following code:

```
Loaded plugin BridgeExample v1.0.0 by Carbon Community [113ms]
Carbon.Bridge Started on 28608
Mrs Manuela has 43.7% chance of survival! [Client] [Thread Pool Worker|82]
Hello world! [Thread Pool Worker|79]
5 + 10 = 15 [Server] [Thread Pool Worker|75]
```
:::

```cs:line-numbers
using Carbon.Components;
using Facepunch;

namespace Carbon.Plugins;

[Info("BridgeExample", "Carbon Community", "1.0")]
public class BridgeExample : CarbonPlugin
{
	public BridgeClient client;

	private async void OnServerInitialized()
	{
		var messages = new CustomBridgeMessages();

		Bridge.Server?.Shutdown();

		// Start a Bridge server on this Rust process
		Bridge.Server ??= new();
		Bridge.Server.Start(RCon.Port + 1, "supersecretpass", null, messages);

		// Connect to that same Bridge server, can adjust it to connect to another local or external server, make sure ports are open
		client = await Bridge.StartClient("localhost", RCon.Port + 1, "supersecretpass", messages);

		var rpc = BridgeWrite.Rent();
		rpc.BridgeMessage(BridgeMessages.Channels.Rpc);
		rpc.Int32(123);
		rpc.String("Manuela");
		rpc.Float(43.7f);
		await client.Send(rpc);
		BridgeWrite.Return(ref rpc);

		var command = BridgeWrite.Rent();
		command.BridgeMessage(BridgeMessages.Channels.Command);
		command.String("env.time");
		command.Int32(1);
		command.String("12.5");
		await client.Send(command);
		BridgeWrite.Return(ref command);

		var custom = BridgeWrite.Rent();
		custom.BridgeMessage(BridgeMessages.Channels.Custom);
		custom.String("Hello world!");
		await client.Send(custom);
		BridgeWrite.Return(ref custom);

		foreach (var connection in Bridge.Server.Connections.Values)
		{
			var rpc2 = BridgeWrite.Rent();
			rpc2.BridgeMessage(BridgeMessages.Channels.Rpc);
			rpc2.Int32(865);
			rpc2.Int32(5);
			rpc2.Int32(10);
			connection.Send(rpc2);
			BridgeWrite.Return(ref rpc2);
		}
	}

	private async void Unload()
	{
		if (client != null)
		{
			await client.Disconnect();
			client = null;
		}
	}

	public class CustomBridgeMessages : BridgeMessages
	{
		/// <summary>
		/// You can handle your own custom identified packets here, just like how Rust RPCs work.
		/// </summary>
		/// <param name="read"></param>
		protected override void OnRpc(BridgeRead read)
		{
			var rpcId = read.Int32();
			switch (rpcId)
			{
				case 123:
				{
					var val1 = read.String();
					var val2 = read.Float();
					Logger.Log(
						$"Mrs {val1} has {val2}% chance of survival! [{(read.Connection == null ? "Server" : "Client")}]");
					break;
				}
				case 865:
				{
					var val1 = read.Int32();
					var val2 = read.Int32();
					Logger.Log($"{val1} + {val2} = {val1 + val2} [{(read.Connection == null ? "Server" : "Client")}]");
					break;
				}
			}
		}

		/// <summary>
		/// Can fire server server/unrestricted commands if you want.
		/// </summary>
		/// <param name="read"></param>
		protected override void OnCommand(BridgeRead read)
		{
			using var args = Pool.Get<PooledList<object>>();
			var command = read.String();
			var argCount = read.Int32();
			for (var i = 0; i < argCount; i++)
			{
				args.Add(read.String());
			}

			ConsoleSystem.Run(ConsoleSystem.Option.Server, command, args.ToArray());
		}
		
		/// <summary>
		/// Go wild doing whatever you need to be doing. Imma just print this log real quick.
		/// </summary>
		/// <param name="read"></param>
		protected override void OnCustom(BridgeRead read)
		{
			Logger.Log(read.String());
		}

		/// <summary>
		/// Good to keep track if stuff goes out of hand. Literally.
		/// </summary>
		/// <param name="read"></param>
		protected override void OnUnhandled(BridgeRead read)
		{
		}
	}
}
```
