# OnHotAirBalloonToggled
<Badge type="info" text="Entity"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called after a Hot Air Balloon’s burner has been turned on or off.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnHotAirBalloonToggled(HotAirBalloon hotAirBalloon, BasePlayer player)
{
	Puts("OnHotAirBalloonToggled has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ HotAirBalloon]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void EngineSwitch(BaseEntity.RPCMessage msg)
{
	BasePlayer player = msg.player;
	if (!(player == null) && (!OnlyOwnerAccessible() || !(player != creatorEntity)))
	{
		bool b = msg.read.Bit();
		SetFlag(BaseEntity.Flags.On, b);
		if (IsOn())
		{
			Invoke(ScheduleOff, 60f);
		}
		else
		{
			CancelInvoke(ScheduleOff);
		}
	}
}

```
:::
