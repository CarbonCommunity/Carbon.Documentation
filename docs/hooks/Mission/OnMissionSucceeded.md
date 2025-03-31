# OnMissionSucceeded
<Badge type="info" text="Mission"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
Called when a player completes a mission successfully.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnMissionSucceeded()
{
	Puts("OnMissionSucceeded has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ BaseMission]
public virtual void MissionSuccess(BaseMission.MissionInstance instance, BasePlayer assignee)
{
	instance.status = BaseMission.MissionStatus.Accomplished;
	MissionEnded(instance, assignee);
	MissionComplete(instance, assignee);
}

```
:::
