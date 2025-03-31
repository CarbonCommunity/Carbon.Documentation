# OnEntityActiveCheck
<Badge type="info" text="Entity"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
Called when checking if an entity (usually an item) is the active item for a player’s RPC call. Plugins can override the active-item validation.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private bool OnEntityActiveCheck(BaseEntity ent, BasePlayer player, uint id, string debugName)
{
	Puts("OnEntityActiveCheck has been fired!");
	return (bool)default;
}
```
:::
