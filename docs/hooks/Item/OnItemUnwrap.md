# OnItemUnwrap
<Badge type="info" text="Item"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when an item (like a gift present) is unwrapped.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnItemUnwrap(Item item, BasePlayer player, ItemModUnwrap itemModUnwrap)
{
	Puts("OnItemUnwrap has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ ItemModUnwrap]
public override void ServerCommand(Item item, string command, BasePlayer player)
{
	if (command == "unwrap" && item.amount > 0)
	{
		item.UseItem();
		int num = UnityEngine.Random.Range(minTries, maxTries + 1);
		ItemOwnershipShare ownership = default(ItemOwnershipShare);
		if (OwnershipPhrase != null && !string.IsNullOrEmpty(OwnershipPhrase.token))
		{
			ItemOwnershipShare itemOwnershipShare = default(ItemOwnershipShare);
			itemOwnershipShare.username = player.displayName;
			itemOwnershipShare.reason = OwnershipPhrase.token;
			ownership = itemOwnershipShare;
		}
		for (int i = 0; i < num; i++)
		{
			revealList.SpawnIntoContainer(player.inventory.containerMain, ownership);
		}
		if (successEffect.isValid)
		{
			Effect.server.Run(successEffect.resourcePath, player.eyes.position);
		}
	}
}

```
:::
