<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnStructureRotate
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnStructureRotate()
{
	Puts("OnStructureRotate has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ BuildingBlock]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.MaxDistance(3f)]
public void DoRotation(BaseEntity.RPCMessage msg)
{
	if (msg.player.CanInteract() && CanRotate(msg.player) && blockDefinition.canRotateAfterPlacement)
	{
		base.transform.localRotation *= UnityEngine.Quaternion.Euler(blockDefinition.rotationAmount);
		RefreshEntityLinks();
		UpdateSurroundingEntities();
		UpdateSkin(force: true);
		RefreshNeighbours(linkToNeighbours: false);
		SendNetworkUpdateImmediate();
		ClientRPC(RpcTarget.NetworkGroup("RefreshSkin"));
		if (!globalNetworkCooldown)
		{
			globalNetworkCooldown = true;
			GlobalNetworkHandler.server.TrySendNetworkUpdate(this);
			CancelInvoke(ResetGlobalNetworkCooldown);
			Invoke(ResetGlobalNetworkCooldown, 15f);
		}
	}
}

```
:::
