# OnPlayerWantsMount
<Badge type="info" text="Player"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
Called when a player attempts to mount an entity (before mounting occurs).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnPlayerWantsMount()
{
	Puts("OnPlayerWantsMount has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ BaseMountable]
public void WantsMount(BasePlayer player)
{
	if (!player.IsValid() || !player.CanInteract())
	{
		return;
	}
	if (!DirectlyMountable())
	{
		BaseVehicle baseVehicle = VehicleParent();
		if (baseVehicle != null)
		{
			baseVehicle.WantsMount(player);
			return;
		}
	}
	AttemptMount(player);
}

```
:::
