# OnEntitySnapshot
<Badge type="info" text="Entity"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when an entity snapshot is sent to a player (when a player first receives data about an entity on entering the network range).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnEntitySnapshot(BaseNetworkable ent, BasePlayer basePlayer)
{
	Puts("OnEntitySnapshot has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
public void SendEntitySnapshot(BaseNetworkable ent)
{
	using (TimeWarning.New("SendEntitySnapshot"))
	{
		if (!(ent == null) && ent.net != null && ent.ShouldNetworkTo(this))
		{
			Network.NetWrite netWrite = Network.Net.sv.StartWrite();
			net.connection.validate.entityUpdates++;
			BaseNetworkable.SaveInfo saveInfo = default(BaseNetworkable.SaveInfo);
			saveInfo.forConnection = net.connection;
			saveInfo.forDisk = false;
			BaseNetworkable.SaveInfo saveInfo2 = saveInfo;
			netWrite.PacketID(Network.Message.Type.Entities);
			netWrite.UInt32(net.connection.validate.entityUpdates);
			ent.ToStreamForNetwork(netWrite, saveInfo2);
			netWrite.Send(new Network.SendInfo(net.connection));
		}
	}
}

```
:::
