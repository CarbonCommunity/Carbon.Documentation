# OnRackedWeaponSwap
<Badge type="info" text="Item"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a player swaps their held weapon with one on a rack.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnRackedWeaponSwap(Item local0, WeaponRackSlot local2, BasePlayer player, WeaponRack weaponRack)
{
	Puts("OnRackedWeaponSwap has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ WeaponRack]
public void SwapPlayerWeapon(BasePlayer player, int gridCellIndex, int takeFromBeltIndex, int rotation)
{
	Item item = player.GetHeldEntity()?.GetItem();
	if (item == null)
	{
		return;
	}
	WorldModelRackMountConfig forItemDef = WorldModelRackMountConfig.GetForItemDef(item.info);
	if (forItemDef == null)
	{
		return;
	}
	WeaponRackSlot weaponAtIndex = GetWeaponAtIndex(gridCellIndex);
	if (weaponAtIndex != null)
	{
		int mountSlotIndex = gridCellIndex;
		if (CustomRackType != 0)
		{
			gridCellIndex = 0;
		}
		int bestPlacementCellIndex = GetBestPlacementCellIndex(GetXYForIndex(gridCellIndex), forItemDef, rotation, weaponAtIndex);
		if (bestPlacementCellIndex != -1)
		{
			item.RemoveFromContainer();
			GivePlayerWeapon(player, mountSlotIndex, takeFromBeltIndex, tryHold: false);
			MountWeapon(item, player, bestPlacementCellIndex, rotation, sendUpdate: false);
			ItemManager.DoRemoves();
			SendNetworkUpdateImmediate();
		}
	}
}

```
:::
