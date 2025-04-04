# CanLock
<Badge type="info" text="Vehicle"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a player attempts to lock an entity (using a code or key lock).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool CanLock(BasePlayer player, ModularCarCodeLock modularCarCodeLock, ModularCarCodeLock self1)
{
	Puts("CanLock has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ ModularCarCodeLock]
public bool HasLockPermission(ulong steamId)
{
	if (!HasALock)
	{
		return true;
	}
	return whitelistPlayers.Contains(steamId);
}

```
:::
