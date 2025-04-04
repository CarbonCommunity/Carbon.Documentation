# OnUserGroupRemoved
<Badge type="info" text="Permissions"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)<Badge type="info" text="MetadataOnly"/>
Called when a user is removed from a permission group.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnUserGroupRemoved(string playerId, string group)
{
	Puts("OnUserGroupRemoved has been fired!");
}
```
```csharp [Source — Carbon.Common @ Oxide.Core.Libraries.Permission]
public virtual void RemoveUserGroup(string id, string name)
{
	if (!GroupExists(name))
	{
		return;
	}
	Oxide.Core.Libraries.UserData userData = GetUserData(id);
	if (name.Equals(StarStr))
	{
		if (userData.Groups.Count <= 0)
		{
			return;
		}
		foreach (string group in userData.Groups)
		{
			Carbon.HookCaller.CallStaticHook(1018697706u, id, group);
		}
		userData.Groups.Clear();
	}
	else if (userData.Groups.Remove(name.ToLower()))
	{
		Carbon.HookCaller.CallStaticHook(1018697706u, id, name);
	}
}

```
:::
