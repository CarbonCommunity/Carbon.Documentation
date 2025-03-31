# OnLiquidWeaponFiringStopped
<Badge type="info" text="Weapon"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnLiquidWeaponFiringStopped(LiquidWeapon liquidWeapon)
{
	Puts("OnLiquidWeaponFiringStopped has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ LiquidWeapon]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsActiveItem]
public void StopFiring()
{
	CancelInvoke(FireTick);
	if (!RequiresPumping)
	{
		pressure = MaxPressure;
	}
	SetFlag(BaseEntity.Flags.On, b: false);
	if (base.isServer)
	{
		SendNetworkUpdateImmediate();
	}
}

```
:::
