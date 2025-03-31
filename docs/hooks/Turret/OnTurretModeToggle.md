# OnTurretModeToggle
<Badge type="info" text="Turret"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnTurretModeToggle()
{
	Puts("OnTurretModeToggle has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ AutoTurret]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void SERVER_AttackAll(BaseEntity.RPCMessage rpc)
{
	if (IsAuthed(rpc.player))
	{
		SetPeacekeepermode(isOn: false);
	}
}

```
:::
