# OnDemoRecordingStopped
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called after the server has stopped recording a demo.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnDemoRecordingStopped(BasePlayer basePlayer, BasePlayer self1)
{
	Puts("OnDemoRecordingStopped has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
public void StopDemoRecording()
{
	if (net != null && net.connection != null && net.connection.IsRecording)
	{
		UnityEngine.Debug.Log(ToString() + " recording stopped: " + net.connection.RecordFilename);
		net.connection.StopRecording();
		CancelInvoke(MonitorDemoRecording);
	}
}

```
:::
