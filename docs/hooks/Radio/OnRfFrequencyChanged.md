# OnRfFrequencyChanged
<Badge type="info" text="Radio"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Triggered after an RF device's frequency has been changed.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnRfFrequencyChanged(PagerEntity pagerEntity, int local0, BasePlayer player)
{
	Puts("OnRfFrequencyChanged has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ PagerEntity]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void ServerSetFrequency(BaseEntity.RPCMessage msg)
{
	if (!(msg.player == null) && msg.player.CanBuild() && !(UnityEngine.Time.time < nextChangeTime))
	{
		nextChangeTime = UnityEngine.Time.time + 2f;
		int newFrequency = msg.read.Int32();
		RFManager.ChangeFrequency(frequency, newFrequency, this, isListener: true);
		frequency = newFrequency;
		SendNetworkUpdateImmediate();
	}
}

```
:::
