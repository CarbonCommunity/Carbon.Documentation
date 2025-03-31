<Badge type="danger" text="Carbon Compatible"/>
# IMixingSpeedMultiplier
```csharp
public void StartMixing(BasePlayer player)
{
	if (IsOn() || !CanStartMixing(player))
	{
		return;
	}
	MixStartingPlayer = player;
	bool itemsAreContiguous;
	System.Collections.Generic.List<Item> orderedContainerItems = GetOrderedContainerItems(base.inventory, out itemsAreContiguous);
	currentRecipe = RecipeDictionary.GetMatchingRecipeAndQuantity(Recipes, orderedContainerItems, out var quantity);
	currentQuantity = quantity;
	if (!(currentRecipe == null) && itemsAreContiguous && (!currentRecipe.RequiresBlueprint || !(currentRecipe.ProducedItem != null) || player.blueprints.HasUnlocked(currentRecipe.ProducedItem)))
	{
		if (base.isServer)
		{
			lastTickTimestamp = UnityEngine.Time.realtimeSinceStartup;
		}
		RemainingMixTime = currentRecipe.MixingDuration * (float)currentQuantity;
		TotalMixTime = RemainingMixTime;
		ReturnExcessItems(orderedContainerItems, player);
		if (RemainingMixTime == 0f)
		{
			ProduceItem(currentRecipe, currentQuantity);
			return;
		}
		InvokeRepeating(TickMix, 1f, 1f);
		SetFlag(BaseEntity.Flags.On, b: true, recursive: false, networkupdate: false);
		SendNetworkUpdateImmediate();
	}
}

```
