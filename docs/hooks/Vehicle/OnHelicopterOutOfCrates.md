# OnHelicopterOutOfCrates
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool OnHelicopterOutOfCrates(CH47HelicopterAIController cH47HelicopterAIController)
{
	Puts("OnHelicopterOutOfCrates has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ CH47HelicopterAIController]
public bool OutOfCrates()
{
	return numCrates <= 0;
}

```
:::
