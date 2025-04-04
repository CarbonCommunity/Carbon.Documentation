# OnPlayerChat
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)<Badge type="info" text="MetadataOnly"/>
Triggered when a player sends a chat message.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnPlayerChat(BasePlayer player, string message, ConVar.Chat.ChatChannel channel)
{
	Puts("OnPlayerChat has been fired!");
}
```
```csharp [Source — Carbon.Common @ Carbon.Core.CorePlugin]
public static object IOnPlayerChat(ulong playerId, string playerName, string message, ChatChannel channel, BasePlayer basePlayer)
{
	//IL_0065: Unknown result type (might be due to invalid IL or missing references)
	//IL_004f: Unknown result type (might be due to invalid IL or missing references)
	if (string.IsNullOrEmpty(message) || message.Equals("text"))
	{
		return Carbon.Cache.True;
	}
	if ((Object)(object)basePlayer == (Object)null || !basePlayer.IsConnected)
	{
		return Carbon.HookCaller.CallStaticHook(4068177051u, playerId, playerName, message, channel);
	}
	object obj = Carbon.HookCaller.CallStaticHook(2032160890u, basePlayer, message, channel);
	object obj2 = Carbon.HookCaller.CallStaticHook(2894159933u, basePlayer.AsIPlayer(), message);
	return obj ?? obj2;
}

```
:::
