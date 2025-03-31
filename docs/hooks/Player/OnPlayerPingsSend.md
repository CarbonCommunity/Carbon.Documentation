# OnPlayerPingsSend
<Badge type="info" text="Player"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
Called when quick ping markers or notifications are being sent to a player (e.g., map pings).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnPlayerPingsSend(BasePlayer basePlayer, ProtoBuf.MapNoteList local0)
{
	Puts("OnPlayerPingsSend has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
public void SendPingsToClient()
{
	using ProtoBuf.MapNoteList mapNoteList = Facepunch.Pool.Get<ProtoBuf.MapNoteList>();
	mapNoteList.notes = Facepunch.Pool.Get<System.Collections.Generic.List<ProtoBuf.MapNote>>();
	mapNoteList.notes.AddRange(State.pings);
	ClientRPC(RpcTarget.Player("Client_ReceivePings", this), mapNoteList);
	mapNoteList.notes.Clear();
}

```
:::
