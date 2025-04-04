# CanDismountEntity
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called to check if a player can dismount from an entity at that moment.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object CanDismountEntity(BasePlayer player, BaseMountable baseMountable)
{
	Puts("CanDismountEntity has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ BaseMountable]
public void DismountPlayer(BasePlayer player, bool lite = false)
{
	if (_mounted == null || _mounted != player)
	{
		return;
	}
	BaseVehicle baseVehicle = VehicleParent();
	if (lite)
	{
		if (baseVehicle != null)
		{
			baseVehicle.PrePlayerDismount(player, this);
		}
		_mounted.DismountObject();
		_mounted = null;
		if (baseVehicle != null)
		{
			baseVehicle.PlayerDismounted(player, this);
		}
		OnPlayerDismounted(player);
		return;
	}
	if (!GetDismountPosition(player, out var res) || Distance(res) > 10f)
	{
		if (baseVehicle != null)
		{
			baseVehicle.PrePlayerDismount(player, this);
		}
		res = player.transform.position;
		_mounted.DismountObject();
		_mounted.MovePosition(res);
		_mounted.transform.rotation = UnityEngine.Quaternion.identity;
		_mounted.ClientRPC(RpcTarget.Player("ForcePositionTo", _mounted), res);
		BasePlayer mounted = _mounted;
		_mounted = null;
		UnityEngine.Debug.LogWarning("Killing player due to invalid dismount point :" + player.displayName + " / " + player.userID.Get() + " on obj : " + base.gameObject.name);
		mounted.Hurt(1000f, Rust.DamageType.Suicide, mounted, useProtection: false);
		if (baseVehicle != null)
		{
			baseVehicle.PlayerDismounted(player, this);
		}
		OnPlayerDismounted(player);
		return;
	}
	if (baseVehicle != null)
	{
		baseVehicle.PrePlayerDismount(player, this);
	}
	if (AntiHack.TestNoClipping(_mounted, res, res, _mounted.NoClipRadius(ConVar.AntiHack.noclip_margin), ConVar.AntiHack.noclip_backtracking, out var _, vehicleLayer: true))
	{
		_mounted.PauseVehicleNoClipDetection(5f);
	}
	_mounted.DismountObject();
	_mounted.transform.rotation = UnityEngine.Quaternion.LookRotation(UnityEngine.Vector3.forward, UnityEngine.Vector3.up);
	_mounted.OverrideViewAngles(UnityEngine.Vector3.zero);
	_mounted.MovePosition(res);
	_mounted.SendNetworkUpdateImmediate();
	_mounted.SendModelState(force: true);
	_mounted = null;
	if (baseVehicle != null)
	{
		baseVehicle.PlayerDismounted(player, this);
	}
	player.ForceUpdateTriggers();
	if ((bool)player.GetParentEntity())
	{
		BaseEntity baseEntity = player.GetParentEntity();
		player.ClientRPC(RpcTarget.Player("ForcePositionToParentOffset", player), baseEntity.transform.InverseTransformPoint(res), baseEntity.net.ID);
	}
	else
	{
		player.ClientRPC(RpcTarget.Player("ForcePositionTo", player), res);
		player.ClientRPC(RpcTarget.NetworkGroup("ForceResetRotation", player));
	}
	Facepunch.Rust.Analytics.Azure.OnDismountEntity(player, this, baseVehicle);
	OnPlayerDismounted(player);
}

```
:::
