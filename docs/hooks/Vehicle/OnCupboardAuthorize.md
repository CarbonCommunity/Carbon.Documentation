# OnCupboardAuthorize
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
- Called when a player is authorized on a tool cupboard.

- Use this to track or restrict cupboard authorizations.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnCupboardAuthorize(VehiclePrivilege vehiclePrivilege, BasePlayer player)
{
	Puts("OnCupboardAuthorize has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ VehiclePrivilege]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.MaxDistance(3f)]
public void AddSelfAuthorize(BaseEntity.RPCMessage rpc)
{
	if (rpc.player.CanInteract() && IsDriver(rpc.player))
	{
		AddPlayer(rpc.player);
		SendNetworkUpdate();
	}
}

```
:::
