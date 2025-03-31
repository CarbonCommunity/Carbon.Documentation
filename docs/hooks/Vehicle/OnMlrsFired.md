<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnMlrsFired
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnMlrsFired()
{
	Puts("OnMlrsFired has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ MLRS]
public void Fire(BasePlayer owner)
{
	UpdateStorageState();
	if (CanFire && !(GetMounted() == null))
	{
		SetFlag(BaseEntity.Flags.Reserved6, b: true);
		radiusModIndex = 0;
		nextRocketIndex = UnityEngine.Mathf.Min(RocketAmmoCount - 1, rocketTubes.Length - 1);
		rocketOwnerRef.Set(owner);
		InvokeRepeating(FireNextRocket, 0f, 0.5f);
	}
}

```
:::
