# OnBookmarkControlStarted
<Badge type="info" text="Bookmark"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called after a player has successfully started controlling a remote entity via a Computer Station.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnBookmarkControlStarted(ComputerStation computerStation, BasePlayer local0, string local1, IRemoteControllable local2)
{
	Puts("OnBookmarkControlStarted has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ ComputerStation]
[BaseEntity.RPC_Server]
public void BeginControllingBookmark(BaseEntity.RPCMessage msg)
{
	BasePlayer player = msg.player;
	if (!IsPlayerAdmin(player))
	{
		return;
	}
	string text = msg.read.String();
	if (!IsValidIdentifier(text) || !controlBookmarks.Contains(text))
	{
		return;
	}
	IRemoteControllable remoteControllable = RemoteControlEntity.FindByID(text);
	if (remoteControllable == null)
	{
		return;
	}
	BaseEntity ent = remoteControllable.GetEnt();
	if (ent == null)
	{
		UnityEngine.Debug.LogWarning("RC identifier " + text + " was found but has a null or destroyed entity, this should never happen");
	}
	else if (remoteControllable.CanControl(player.userID) && !(UnityEngine.Vector3.Distance(base.transform.position, ent.transform.position) >= remoteControllable.MaxRange))
	{
		BaseEntity baseEntity = currentlyControllingEnt.Get(serverside: true);
		if ((bool)baseEntity)
		{
			baseEntity.GetComponent<IRemoteControllable>()?.StopControl(new CameraViewerId(currentPlayerID, 0L));
		}
		player.net.SwitchSecondaryGroup(ent.net.group);
		player.SetRcEntityPosition(ent.transform.position);
		currentlyControllingEnt.uid = ent.net.ID;
		currentPlayerID = player.userID;
		bool b = remoteControllable.InitializeControl(new CameraViewerId(currentPlayerID, 0L));
		SetFlag(BaseEntity.Flags.Reserved2, b, recursive: false, networkupdate: false);
		SendNetworkUpdateImmediate();
		SendControlBookmarks(player);
		if (Rust.GameInfo.HasAchievements && remoteControllable.GetEnt() is CCTV_RC)
		{
			InvokeRepeating(CheckCCTVAchievement, 1f, 3f);
		}
		InvokeRepeating(ControlCheck, 0f, 0f);
	}
}

```
:::
