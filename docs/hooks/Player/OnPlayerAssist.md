# OnPlayerAssist
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Triggered when a wounded player is assisted by another player (revived from the wounded state).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnPlayerAssist(BasePlayer basePlayer, BasePlayer player)
{
	Puts("OnPlayerAssist has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void RPC_Assist(BaseEntity.RPCMessage msg)
{
	if (msg.player.CanInteract() && !(msg.player == this) && IsWounded())
	{
		StopWounded(msg.player);
		msg.player.stats.Add("wounded_assisted", 1, (Stats)5);
		stats.Add("wounded_healed", 1);
	}
}

```
:::
