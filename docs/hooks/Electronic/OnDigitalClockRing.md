# OnDigitalClockRing
<Badge type="info" text="Electronic"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a digital alarm clock starts ringing.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnDigitalClockRing(DigitalClock digitalClock)
{
	Puts("OnDigitalClockRing has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ DigitalClock]
public void Ring()
{
	isRinging = true;
	ClientRPC(RpcTarget.NetworkGroup("RPC_StartRinging"));
	Invoke(StopRinging, 5f);
	MarkDirty();
}

```
:::
