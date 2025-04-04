# OnCrateHack
<Badge type="info" text="Entity"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a hackable locked crate’s hacking process begins (player starts hacking the crate).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnCrateHack(HackableLockedCrate hackableLockedCrate)
{
	Puts("OnCrateHack has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ HackableLockedCrate]
public void StartHacking()
{
	BroadcastEntityMessage("HackingStarted", 20f, 256);
	SetFlag(BaseEntity.Flags.Reserved1, b: true);
	InvokeRepeating(HackProgress, 1f, 1f);
	ClientRPC(RpcTarget.NetworkGroup("UpdateHackProgress"), 0, (int)requiredHackSeconds);
	RefreshDecay();
}

```
:::
