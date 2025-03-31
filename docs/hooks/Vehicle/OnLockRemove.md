<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnLockRemove
```csharp
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.MaxDistance(3f)]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void RPC_RequestRemoveLock(BaseEntity.RPCMessage msg)
{
	if (HasOccupant && carOccupant.CarLock.HasALock)
	{
		carOccupant.CarLock.RemoveLock();
		Effect.server.Run(addRemoveLockEffect.resourcePath, this, 0u, UnityEngine.Vector3.zero, UnityEngine.Vector3.zero);
	}
}

```
