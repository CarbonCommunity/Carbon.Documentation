# OnTeamInvite
<Badge type="info" text="Team"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a team invite is sent to a player.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnTeamInvite(BasePlayer local0, BasePlayer local3)
{
	Puts("OnTeamInvite has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ RelationshipManager]
[ServerUserVar]
public static void sendinvite(ConsoleSystem.Arg arg)
{
	BasePlayer basePlayer = UnityEngine.ArgEx.Player(arg);
	RelationshipManager.PlayerTeam playerTeam = ServerInstance.FindTeam(basePlayer.currentTeam);
	if (playerTeam == null || playerTeam.GetLeader() == null || playerTeam.GetLeader() != basePlayer)
	{
		return;
	}
	ulong uLong = arg.GetULong(0, 0uL);
	if (uLong == 0L)
	{
		return;
	}
	BasePlayer basePlayer2 = BaseNetworkable.serverEntities.Find(new NetworkableId(uLong)) as BasePlayer;
	if ((bool)basePlayer2 && basePlayer2 != basePlayer && !basePlayer2.IsNpc && basePlayer2.currentTeam == 0L)
	{
		float num = 7f;
		if (!(UnityEngine.Vector3.Distance(basePlayer2.transform.position, basePlayer.transform.position) > num))
		{
			playerTeam.SendInvite(basePlayer2);
		}
	}
}

```
:::
