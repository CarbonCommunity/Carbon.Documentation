# CanHelicopterStrafeTarget
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool CanHelicopterStrafeTarget(PatrolHelicopterAI patrolHelicopterAI)
{
	Puts("CanHelicopterStrafeTarget has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ PatrolHelicopterAI]
public bool ValidRocketTarget(BasePlayer ply)
{
	if (ply == null)
	{
		return false;
	}
	return !ply.IsNearEnemyBase();
}

```
:::
