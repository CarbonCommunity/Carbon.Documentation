# OnMagazineReload
<Badge type="info" text="Weapon"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool OnMagazineReload(BaseProjectile baseProjectile, IAmmoContainer ammoSource, BaseProjectile self1)
{
	Puts("OnMagazineReload has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ BaseProjectile]
public virtual bool TryReloadMagazine(IAmmoContainer ammoSource, int desiredAmount = -1)
{
	if (!TryReload(ammoSource, desiredAmount))
	{
		return false;
	}
	SendNetworkUpdateImmediate();
	ItemManager.DoRemoves();
	BasePlayer ownerPlayer = GetOwnerPlayer();
	if (ownerPlayer != null)
	{
		ownerPlayer.inventory.ServerUpdate(0f);
	}
	if (!fractionalReload)
	{
		UpdateShieldState(bHeld: true);
	}
	else if (primaryMagazine.contents == primaryMagazine.capacity || !ammoSource.HasAmmo(primaryMagazine.definition.ammoTypes))
	{
		UpdateShieldState(bHeld: true);
	}
	return true;
}

```
:::
