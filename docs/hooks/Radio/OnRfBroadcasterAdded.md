<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnRfBroadcasterAdded
Called after an RF broadcaster has been added to a frequency.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnRfBroadcasterAdded()
{
	Puts("OnRfBroadcasterAdded has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ RFManager]
public static void AddBroadcaster(int frequency, IRFObject obj)
{
	frequency = ClampFrequency(frequency);
	System.Collections.Generic.HashSet<IRFObject> broadcasterSet = GetBroadcasterSet(frequency);
	if (broadcasterSet.RemoveWhere((IRFObject b) => b == null || !b.IsValidEntityReference()) > 0)
	{
		UnityEngine.Debug.LogWarning($"Found null entries in the RF broadcaster set for frequency {frequency}... cleaning up.");
	}
	if (broadcasterSet.Add(obj) && (!_isFrequencyBroadcasting.TryGetValue(frequency, out var value) || !value))
	{
		_isFrequencyBroadcasting[frequency] = true;
		UpdateListenersForFrequency(frequency, isBroadcasting: true);
	}
}

```
:::
