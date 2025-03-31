# OnVendingShopOpen
<Badge type="info" text="Vending"/><Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
No description.
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnVendingShopOpen()
{
	Puts("OnVendingShopOpen has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ TravellingVendor]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void SV_OpenMenu(BaseEntity.RPCMessage msg)
{
	if (vendingMachine == null)
	{
		vendingMachine = GetComponentInChildren<NPCVendingMachine>();
	}
	vendingMachine.OpenShop(msg.player);
}

```
:::
