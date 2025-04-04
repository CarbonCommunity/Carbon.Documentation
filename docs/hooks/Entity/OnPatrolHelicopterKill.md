# OnPatrolHelicopterKill
<Badge type="info" text="Entity"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when the patrol helicopter is killed/destroyed.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnPatrolHelicopterKill(PatrolHelicopter patrolHelicopter, HitInfo info)
{
	Puts("OnPatrolHelicopterKill has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ PatrolHelicopter]
public override void Hurt(HitInfo info)
{
	bool flag = false;
	if (info.damageTypes.Total() >= base.health)
	{
		base.health = 10000f;
		myAI.CriticalDamage();
		flag = true;
	}
	base.Hurt(info);
	if (flag)
	{
		return;
	}
	myAI.OtherDamaged(info);
	PatrolHelicopter.weakspot[] array = weakspots;
	foreach (PatrolHelicopter.weakspot weakspot in array)
	{
		string[] bonenames = weakspot.bonenames;
		foreach (string str in bonenames)
		{
			if (info.HitBone == StringPool.Get(str))
			{
				weakspot.Hurt(info.damageTypes.Total(), info);
				myAI.WeakspotDamaged(weakspot, info);
			}
		}
	}
}

```
:::
