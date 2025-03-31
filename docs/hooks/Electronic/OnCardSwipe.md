<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnCardSwipe
Called when a keycard is swiped on a card reader (e.g., attempting to unlock a door with an access card).
### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnCardSwipe()
{
	Puts("OnCardSwipe has been fired!");
	return (System.Object)default;
}
```
```csharp [Source — Assembly-CSharp @ CardReader]
[BaseEntity.RPC_Server]
[BaseEntity.RPC_Server.IsVisible(3f)]
public void ServerCardSwiped(BaseEntity.RPCMessage msg)
{
	if (!IsPowered() || UnityEngine.Vector3Ex.Distance2D(msg.player.transform.position, base.transform.position) > 1f || IsInvoking(GrantCard) || IsInvoking(FailCard) || HasFlag(BaseEntity.Flags.On))
	{
		return;
	}
	NetworkableId uid = msg.read.EntityID();
	Keycard keycard = BaseNetworkable.serverEntities.Find(uid) as Keycard;
	Effect.server.Run(swipeEffect.resourcePath, audioPosition.position, UnityEngine.Vector3.up, msg.player.net.connection);
	if (keycard == null)
	{
		return;
	}
	Item item = keycard.GetItem();
	if (item != null && !(item.parent.playerOwner != msg.player))
	{
		if (keycard.accessLevel == accessLevel && item.conditionNormalized > 0f)
		{
			Facepunch.Rust.Analytics.Azure.OnKeycardSwiped(msg.player, this);
			Invoke(GrantCard, 0.5f);
			item.LoseCondition(1f);
		}
		else
		{
			Invoke(FailCard, 0.5f);
		}
	}
}

```
:::
