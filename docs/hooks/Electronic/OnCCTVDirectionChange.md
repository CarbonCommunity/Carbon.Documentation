# OnCCTVDirectionChange
<Badge type="info" text="Electronic"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a CCTV camera or remotely controlled turret changes its viewing direction (rotates orientation).

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnCCTVDirectionChange(CCTV_RC cCTV_RC, BasePlayer local0)
{
	Puts("OnCCTVDirectionChange has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ CCTV_RC]
[BaseEntity.RPC_Server]
public void Server_SetDir(BaseEntity.RPCMessage msg)
{
	if (!IsStatic())
	{
		BasePlayer player = msg.player;
		if (player.CanBuild() && player.IsBuildingAuthed())
		{
			UnityEngine.Vector3 direction = UnityEngine.Vector3Ex.Direction(player.eyes.position, yaw.transform.position);
			direction = base.transform.InverseTransformDirection(direction);
			UnityEngine.Vector3 vector = BaseMountable.ConvertVector(UnityEngine.Quaternion.LookRotation(direction).eulerAngles);
			pitchAmount = UnityEngine.Mathf.Clamp(vector.x, pitchClamp.x, pitchClamp.y);
			yawAmount = UnityEngine.Mathf.Clamp(vector.y, yawClamp.x, yawClamp.y);
			SendNetworkUpdate();
		}
	}
}

```
:::
