<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnBuyVendingItem
```csharp
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
[BaseEntity.RPC_Server.CallsPerSecond(5uL)]
public void BuyItem(BaseEntity.RPCMessage rpc)
{
	if (!OccupiedCheck(rpc.player))
	{
		return;
	}
	int num = rpc.read.Int32();
	int numberOfTransactions = rpc.read.Int32();
	if (IsVending())
	{
		rpc.player.ShowToast(GameTip.Styles.Red_Normal, WaitForVendingMessage, false);
		return;
	}
	int num2 = 0;
	for (int i = 0; i < sellOrders.sellOrders.Count; i++)
	{
		ItemDefinition itemDefinition = ItemManager.FindItemDefinition(sellOrders.sellOrders[i].itemToSellID);
		ItemDefinition itemDefinition2 = ItemManager.FindItemDefinition(sellOrders.sellOrders[i].currencyID);
		if (itemDefinition.IsAllowedInEra(CurrentEraRestriction) && itemDefinition2.IsAllowedInEra(CurrentEraRestriction))
		{
			if (num2 == num)
			{
				num = i;
				break;
			}
			num2++;
		}
	}
	SetPendingOrder(rpc.player, num, numberOfTransactions);
	Invoke(CompletePendingOrder, GetBuyDuration());
}

```
