# OnCounterTargetChange
<Badge type="info" text="Electronic"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a Power Counter’s target value is changed (the threshold it compares against is updated).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnCounterTargetChange()
{
	Puts("OnCounterTargetChange has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ PowerCounter]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void SERVER_SetTarget(BaseEntity.RPCMessage msg)
{
	if (CanPlayerAdmin(msg.player))
	{
		targetCounterNumber = msg.read.Int32();
		MarkDirty();
		SendNetworkUpdate();
	}
}

```
:::
