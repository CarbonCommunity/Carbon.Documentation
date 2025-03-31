<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnFireworkDesignChanged
Called after a firework's design has been updated.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnFireworkDesignChanged()
{
	Puts("OnFireworkDesignChanged has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ PatternFirework]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
[BaseEntity.RPC_Server.CallsPerSecond(5uL)]
public void ServerSetFireworkDesign(BaseEntity.RPCMessage rpc)
{
	if (!PlayerCanModify(rpc.player))
	{
		return;
	}
	ProtoBuf.PatternFirework.Design design = ProtoBuf.PatternFirework.Design.Deserialize(rpc.read);
	if (design?.stars != null)
	{
		while (design.stars.Count > MaxStars)
		{
			int index = design.stars.Count - 1;
			design.stars[index].Dispose();
			design.stars.RemoveAt(index);
		}
		foreach (ProtoBuf.PatternFirework.Star star in design.stars)
		{
			star.position = new UnityEngine.Vector2(UnityEngine.Mathf.Clamp(star.position.x, -1f, 1f), UnityEngine.Mathf.Clamp(star.position.y, -1f, 1f));
			star.color = new UnityEngine.Color(UnityEngine.Mathf.Clamp01(star.color.r), UnityEngine.Mathf.Clamp01(star.color.g), UnityEngine.Mathf.Clamp01(star.color.b), 1f);
		}
		design.editedBy = rpc.player.userID;
	}
	Design?.Dispose();
	Design = design;
	SendNetworkUpdateImmediate();
}

```
:::
