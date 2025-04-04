# OnUserNameUpdated
<Badge type="info" text="Permissions"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)<Badge type="info" text="MetadataOnly"/>
Called when a user's stored nickname is updated.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnUserNameUpdated(string id, string oldName, string newName)
{
	Puts("OnUserNameUpdated has been fired!");
}
```
```csharp [Source — Carbon.Common @ Oxide.Core.Libraries.Permission]
public virtual void UpdateNickname(string id, string nickname)
{
	if (UserExists(id))
	{
		Oxide.Core.Libraries.UserData userData = GetUserData(id);
		string lastSeenNickname = userData.LastSeenNickname;
		userData.LastSeenNickname = nickname.Sanitize();
		Carbon.HookCaller.CallStaticHook(4255507790u, id, lastSeenNickname, userData.LastSeenNickname);
	}
}

```
:::
