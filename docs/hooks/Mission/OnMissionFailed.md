# OnMissionFailed
<Badge type="info" text="Mission"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a player fails a mission.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnMissionFailed(BaseMission baseMission)
{
	Puts("OnMissionFailed has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BaseMission]
public virtual void MissionFailed(BaseMission.MissionInstance instance, BasePlayer assignee, BaseMission.MissionFailReason failReason)
{
	if (!instance.GetMission().completeSilently)
	{
		assignee.ChatMessage("You have failed the mission : " + missionName.english);
	}
	DoMissionEffect(failedEffect.resourcePath, assignee);
	Facepunch.Rust.Analytics.Server.MissionFailed(this, failReason);
	Facepunch.Rust.Analytics.Azure.OnMissionComplete(assignee, this, failReason);
	instance.status = BaseMission.MissionStatus.Failed;
	MissionEnded(instance, assignee);
}

```
:::
