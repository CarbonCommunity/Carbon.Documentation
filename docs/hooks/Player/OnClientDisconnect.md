# OnClientDisconnect
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a client disconnect event is initiated.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnClientDisconnect(Network.Connection connection, string local0)
{
	Puts("OnClientDisconnect has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ ServerMgr]
public void ReadDisconnectReason(Network.Message packet)
{
	string text = packet.read.String(4096);
	string text2 = packet.connection.ToString();
	if (!string.IsNullOrEmpty(text) && !string.IsNullOrEmpty(text2))
	{
		UnityEngine.DebugEx.Log(text2 + " disconnecting: " + text);
	}
}

```
:::
