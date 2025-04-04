# OnLiquidWeaponFired
<Badge type="info" text="Weapon"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnLiquidWeaponFired(LiquidWeapon liquidWeapon, BasePlayer local0)
{
	Puts("OnLiquidWeaponFired has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ LiquidWeapon]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsActiveItem]
public void StartFiring(BaseEntity.RPCMessage msg)
{
	BasePlayer player = msg.player;
	if (OnCooldown())
	{
		return;
	}
	if (!RequiresPumping)
	{
		pressure = MaxPressure;
	}
	if (CanFire(player))
	{
		CancelInvoke(FireTick);
		InvokeRepeating(FireTick, 0f, FireRate);
		SetFlag(BaseEntity.Flags.On, b: true);
		StartCooldown(FireRate);
		if (base.isServer)
		{
			SendNetworkUpdateImmediate();
		}
	}
}

```
:::
