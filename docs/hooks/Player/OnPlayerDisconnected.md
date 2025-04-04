# OnPlayerDisconnected
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a player disconnects from the server.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnPlayerDisconnected(BasePlayer local0, string strReason)
{
	Puts("OnPlayerDisconnected has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ ServerMgr]
public void OnDisconnected(string strReason, Network.Connection connection)
{
	Facepunch.Rust.Analytics.Azure.OnPlayerDisconnected(connection, strReason);
	GlobalNetworkHandler.server.OnClientDisconnected(connection);
	connectionQueue.TryAddReservedSlot(connection);
	connectionQueue.RemoveConnection(connection);
	ConnectionAuth.OnDisconnect(connection);
	if (connection.authStatusSteam == "ok")
	{
		PlatformService.Instance.EndPlayerSession(connection.userid);
	}
	EACServer.OnLeaveGame(connection);
	BasePlayer basePlayer = connection.player as BasePlayer;
	if (basePlayer != null)
	{
		basePlayer.OnDisconnected();
	}
	if (connection.authStatusNexus == "ok")
	{
		NexusServer.Logout(connection.userid);
	}
}

```
:::
