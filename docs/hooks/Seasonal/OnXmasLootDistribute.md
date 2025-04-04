# OnXmasLootDistribute
<Badge type="info" text="Seasonal"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Triggered when the Xmas event begins distributing presents and stocking items.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnXmasLootDistribute(XMasRefill xMasRefill)
{
	Puts("OnXmasLootDistribute has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ XMasRefill]
public override void ServerInit()
{
	base.ServerInit();
	if (!ConVar.XMas.enabled)
	{
		Invoke(RemoveMe, 0.1f);
		return;
	}
	goodKids = ((BasePlayer.activePlayerList != null) ? new System.Collections.Generic.List<BasePlayer>(BasePlayer.activePlayerList) : new System.Collections.Generic.List<BasePlayer>());
	stockings = ((Stocking.stockings != null) ? new System.Collections.Generic.List<Stocking>(Stocking.stockings.Values) : new System.Collections.Generic.List<Stocking>());
	Invoke(RemoveMe, 60f);
	InvokeRepeating(DistributeLoot, 3f, 0.02f);
	Invoke(SendBells, 0.5f);
}

```
:::
