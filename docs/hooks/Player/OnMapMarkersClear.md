<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnMapMarkersClear
Called when all map markers are about to be cleared.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnMapMarkersClear()
{
	Puts("OnMapMarkersClear has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.FromOwner(false)]
[BaseEntity.RPC_Server.CallsPerSecond(1uL)]
public void Server_ClearMapMarkers(BaseEntity.RPCMessage msg)
{
	ServerCurrentDeathNote?.Dispose();
	ServerCurrentDeathNote = null;
	if (State.pointsOfInterest != null)
	{
		foreach (ProtoBuf.MapNote item in State.pointsOfInterest)
		{
			item?.Dispose();
		}
		State.pointsOfInterest.Clear();
	}
	DirtyPlayerState();
	TeamUpdate();
}

```
:::
