# OnHorseUnhitch
<Badge type="info" text="Animal"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
Called when a horse is unhitched from a hitching post (released from being tied).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnHorseUnhitch()
{
	Puts("OnHorseUnhitch has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ HitchTrough]
public void UnHitch(HitchTrough.IHitchable hitchable)
{
	HitchTrough.HitchSpot[] array = hitchSpots;
	foreach (HitchTrough.HitchSpot hitchSpot in array)
	{
		if (hitchSpot.GetHitchable(base.isServer) == hitchable)
		{
			hitchSpot.SetOccupiedBy(null);
			hitchable.SetHitch(null, null);
		}
	}
}

```
:::
