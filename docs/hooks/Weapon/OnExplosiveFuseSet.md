# OnExplosiveFuseSet
<Badge type="info" text="Weapon"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnExplosiveFuseSet(TimedExplosive timedExplosive, float fuseLength)
{
	Puts("OnExplosiveFuseSet has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ TimedExplosive]
public virtual void SetFuse(float fuseLength)
{
	if (base.isServer)
	{
		Invoke(Explode, fuseLength);
		SetFlag(BaseEntity.Flags.Reserved2, b: true);
	}
}

```
:::
