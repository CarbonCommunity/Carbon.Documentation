# CanNetworkTo
<Badge type="info" text="Player"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Determines if an entity's network data should be sent to a specific player.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool CanNetworkTo(BasePlayer basePlayer)
{
	Puts("CanNetworkTo has been fired!");
	return (bool)default;
}
```
```csharp [Source — Assembly-CSharp @ BasePlayer]
public override bool ShouldNetworkTo(BasePlayer player)
{
	if (player == this)
	{
		return true;
	}
	if (IsSpectating() && player != this)
	{
		return false;
	}
	bool flag = base.ShouldNetworkTo(player);
	if (ServerOcclusion.OcclusionEnabled && flag)
	{
		bool flag2 = IsBot || IsNpc;
		bool flag3 = player.GetMounted() is ComputerStation;
		flag = OcclusionLineOfSight(player, flag3 || flag2);
	}
	return flag;
}

```
:::
