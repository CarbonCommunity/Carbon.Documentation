# OnEngineLoadoutRefresh
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnEngineLoadoutRefresh(Rust.Modular.EngineStorage engineStorage)
{
	Puts("OnEngineLoadoutRefresh has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ Rust.Modular.EngineStorage]
public void RefreshLoadoutData()
{
	isUsable = base.inventory.IsFull() && System.Linq.Enumerable.All(base.inventory.itemList, (Item item) => !item.isBroken);
	accelerationBoostPercent = GetContainerItemsValueFor(Rust.Modular.EngineItemTypeEx.BoostsAcceleration) / (float)accelerationBoostSlots;
	topSpeedBoostPercent = GetContainerItemsValueFor(Rust.Modular.EngineItemTypeEx.BoostsTopSpeed) / (float)topSpeedBoostSlots;
	fuelEconomyBoostPercent = GetContainerItemsValueFor(Rust.Modular.EngineItemTypeEx.BoostsFuelEconomy) / (float)fuelEconomyBoostSlots;
	SendNetworkUpdate();
	GetEngineModule()?.RefreshPerformanceStats(this);
}

```
:::
