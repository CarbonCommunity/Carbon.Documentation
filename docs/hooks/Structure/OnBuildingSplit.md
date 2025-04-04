# OnBuildingSplit
<Badge type="info" text="Structure"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnBuildingSplit(BuildingManager.Building building, uint newID)
{
	Puts("OnBuildingSplit has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ ServerBuildingManager]
public void Split(BuildingManager.Building building)
{
	while (building.HasBuildingBlocks())
	{
		BuildingBlock buildingBlock = building.buildingBlocks[0];
		uint newID = BuildingManager.server.NewBuildingID();
		buildingBlock.EntityLinkBroadcast(delegate(BuildingBlock b)
		{
			b.AttachToBuilding(newID);
		});
	}
	while (building.HasBuildingPrivileges())
	{
		BuildingPrivlidge buildingPrivlidge = building.buildingPrivileges[0];
		BuildingBlock nearbyBuildingBlock = buildingPrivlidge.GetNearbyBuildingBlock();
		buildingPrivlidge.AttachToBuilding(nearbyBuildingBlock ? nearbyBuildingBlock.buildingID : 0u);
	}
	while (building.HasDecayEntities())
	{
		DecayEntity decayEntity = building.decayEntities[0];
		BuildingBlock nearbyBuildingBlock2 = decayEntity.GetNearbyBuildingBlock();
		decayEntity.AttachToBuilding(nearbyBuildingBlock2 ? nearbyBuildingBlock2.buildingID : 0u);
	}
	if (ConVar.AI.nav_carve_use_building_optimization)
	{
		building.isNavMeshCarvingDirty = true;
		int ticks = 2;
		UpdateNavMeshCarver(building, ref ticks, 0);
	}
}

```
:::
