# OnFreeableContainerReleaseStarted
<Badge type="info" text="Entity"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when the release process of a freeable loot container begins.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnFreeableContainerReleaseStarted(FreeableLootContainer freeableLootContainer, BasePlayer player)
{
	Puts("OnFreeableContainerReleaseStarted has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ FreeableLootContainer]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.MaxDistance(3f)]
public void RPC_FreeCrateTimer(BaseEntity.RPCMessage msg)
{
	if (IsTiedDown())
	{
		startUntieTime = UnityEngine.Time.realtimeSinceStartup;
	}
}

```
:::
