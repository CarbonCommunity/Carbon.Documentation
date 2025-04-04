# OnFuelCheck
<Badge type="info" text="Fuel"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when verifying if an entity has any fuel.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool OnFuelCheck(EntityFuelSystem entityFuelSystem)
{
	Puts("OnFuelCheck has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ EntityFuelSystem]
public bool HasFuel(bool forceCheck = false)
{
	if (UnityEngine.Time.time > nextFuelCheckTime || forceCheck)
	{
		cachedHasFuel = (float)GetFuelAmount() > 0f;
		nextFuelCheckTime = UnityEngine.Time.time + UnityEngine.Random.Range(1f, 2f);
	}
	return cachedHasFuel;
}

```
:::
