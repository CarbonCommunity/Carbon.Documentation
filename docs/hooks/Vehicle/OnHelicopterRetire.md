# OnHelicopterRetire
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnHelicopterRetire(PatrolHelicopterAI patrolHelicopterAI)
{
	Puts("OnHelicopterRetire has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ PatrolHelicopterAI]
public void Retire()
{
	if (!isRetiring)
	{
		Invoke(DestroyMe, 240f);
		float x = TerrainMeta.Size.x;
		float y = 200f;
		UnityEngine.Vector3 newPos = UnityEngine.Vector3Ex.Range(-1f, 1f);
		newPos.y = 0f;
		newPos.Normalize();
		newPos *= x * 20f;
		newPos.y = y;
		ExitCurrentState();
		isRetiring = true;
		State_Move_Enter(newPos);
	}
}

```
:::
