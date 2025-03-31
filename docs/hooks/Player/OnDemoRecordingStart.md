# OnDemoRecordingStart
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when server demo recording is about to start.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnDemoRecordingStart(string local0, BasePlayer basePlayer)
{
	Puts("OnDemoRecordingStart has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
public void StartDemoRecording()
{
	if (net != null && net.connection != null && !net.connection.IsRecording)
	{
		string text = $"demos/{UserIDString}/{System.DateTime.Now:yyyy-MM-dd-hhmmss}.dem";
		UnityEngine.Debug.Log(ToString() + " recording started: " + text);
		net.connection.StartRecording(text, new ConVar.Demo.Header
		{
			version = ConVar.Demo.Version,
			level = UnityEngine.Application.loadedLevelName,
			levelSeed = World.Seed,
			levelSize = World.Size,
			checksum = World.Checksum,
			localclient = userID,
			position = eyes.position,
			rotation = eyes.HeadForward(),
			levelUrl = World.Url,
			recordedTime = System.DateTime.Now.ToBinary()
		});
		SendNetworkUpdateImmediate();
		SendGlobalSnapshot();
		SendFullSnapshot();
		SendEntityUpdate();
		TreeManager.SendSnapshot(this);
		ServerMgr.SendReplicatedVars(net.connection);
		InvokeRepeating(MonitorDemoRecording, 10f, 10f);
	}
}

```
:::
