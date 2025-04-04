# OnTurretAssigned
<Badge type="info" text="Turret"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnTurretAssigned(AutoTurret autoTurret, ulong local0, BasePlayer player)
{
	Puts("OnTurretAssigned has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ AutoTurret]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void AssignToFriend(BaseEntity.RPCMessage msg)
{
	if (AtMaxAuthCapacity() || msg.player == null || !msg.player.CanInteract() || !CanChangeSettings(msg.player))
	{
		return;
	}
	ulong num = msg.read.UInt64();
	if (num != 0L && !IsAuthed(num))
	{
		string username = BasePlayer.SanitizePlayerNameString(msg.read.String(), num);
		ProtoBuf.PlayerNameID playerNameID = new ProtoBuf.PlayerNameID();
		playerNameID.userid = num;
		playerNameID.username = username;
		Facepunch.Rust.Analytics.Azure.OnEntityAuthChanged(this, msg.player, System.Linq.Enumerable.Select(authorizedPlayers, (ProtoBuf.PlayerNameID x) => x.userid), "added", num);
		authorizedPlayers.Add(playerNameID);
		UpdateMaxAuthCapacity();
		SendNetworkUpdate();
	}
}

```
:::
