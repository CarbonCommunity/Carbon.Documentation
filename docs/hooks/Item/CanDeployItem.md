# CanDeployItem
<Badge type="info" text="Item"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Determines if a deployable item can be placed in the world.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object CanDeployItem(BasePlayer player, Deployer deployer, NetworkableId local2)
{
	Puts("CanDeployItem has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ Deployer]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsActiveItem]
public void DoDeploy(BaseEntity.RPCMessage msg)
{
	if (!msg.player.CanInteract())
	{
		return;
	}
	Deployable deployable = GetDeployable();
	if (!(deployable == null))
	{
		UnityEngine.Ray ray = msg.read.Ray();
		NetworkableId entityID = msg.read.EntityID();
		if (deployable.toSlot)
		{
			DoDeploy_Slot(deployable, ray, entityID);
		}
		else
		{
			DoDeploy_Regular(deployable, ray);
		}
	}
}

```
:::
