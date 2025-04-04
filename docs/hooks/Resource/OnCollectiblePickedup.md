# OnCollectiblePickedup
<Badge type="info" text="Resource"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called after a collectible item has been picked up by a player.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private void OnCollectiblePickedup(CollectibleEntity collectibleEntity, BasePlayer reciever, Item local6)
{
	Puts("OnCollectiblePickedup has been fired!");
}
```
```csharp [Source — Assembly-CSharp @ CollectibleEntity]
public void DoPickup(BasePlayer reciever, bool eat = false)
{
	if (itemList == null)
	{
		return;
	}
	float num = ((reciever.modifiers != null) ? reciever.modifiers.GetValue(Modifier.ModifierType.Collectible_DoubleYield) : 0f);
	bool flag = num != 0f && UnityEngine.Random.value < num;
	ItemAmount[] array = itemList;
	foreach (ItemAmount itemAmount in array)
	{
		if (reciever != null && reciever.IsInTutorial && itemAmount.ignoreInTutorial)
		{
			continue;
		}
		Item item = ItemManager.Create(itemAmount.itemDef, flag ? ((int)itemAmount.amount * 2) : ((int)itemAmount.amount), 0uL);
		if (item == null)
		{
			continue;
		}
		item.SetItemOwnership(reciever, ItemOwnershipPhrases.GatheredPhrase);
		if (eat && item.info.category == ItemCategory.Food && reciever != null)
		{
			ItemModConsume component = item.info.GetComponent<ItemModConsume>();
			if (component != null)
			{
				component.DoAction(item, reciever);
				continue;
			}
		}
		if ((bool)reciever)
		{
			Facepunch.Rust.Analytics.Azure.OnGatherItem(item.info.shortname, item.amount, this, reciever);
			reciever.GiveItem(item, BaseEntity.GiveItemReason.ResourceHarvested);
		}
		else
		{
			item.Drop(base.transform.position + UnityEngine.Vector3.up * 0.5f, UnityEngine.Vector3.up);
		}
	}
	itemList = null;
	if (pickupEffect.isValid)
	{
		Effect.server.Run(pickupEffect.resourcePath, base.transform.position, base.transform.up);
	}
	RandomItemDispenser randomItemDispenser = PrefabAttribute.server.Find<RandomItemDispenser>(prefabID);
	if (randomItemDispenser != null)
	{
		randomItemDispenser.DistributeItems(reciever, base.transform.position);
	}
	Kill();
}

```
:::
