# OnPlayerDismountFailed
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Triggered when a player's attempt to dismount an entity fails.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnPlayerDismountFailed(BasePlayer local0, BaseMountable baseMountable)
{
	Puts("OnPlayerDismountFailed has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BaseMountable]
[BaseEntity.RPC_Server]
public void RPC_WantsDismount(BaseEntity.RPCMessage msg)
{
	BasePlayer player = msg.player;
	if (HasValidDismountPosition(player) && (!(player != null) || !player.IsRestrained))
	{
		AttemptDismount(player);
	}
}

```
:::
