# OnHealingItemUse
<Badge type="info" text="Item"/>[<Badge type="danger" text="Carbon Compatible"/>](https://github.com/CarbonCommunity/Carbon)[<Badge type="warning" text="Oxide Compatible"/>](https://github.com/OxideMod/Oxide.Rust)
Called when a healing item (medical tool) is used on a player.

### Return
Returning a non-null value cancels default behavior.

### Usage
::: code-group
```csharp [Example]
private object OnHealingItemUse(MedicalTool medicalTool)
{
	Puts("OnHealingItemUse has been fired!");
	return (object)default;
}
```
```csharp [Source — Assembly-CSharp @ MedicalTool]
public void GiveEffectsTo(BasePlayer player)
{
	if (!player)
	{
		return;
	}
	ItemDefinition ownerItemDefinition = GetOwnerItemDefinition();
	ItemModConsumable component = ownerItemDefinition.GetComponent<ItemModConsumable>();
	if (!component)
	{
		UnityEngine.Debug.LogWarning("No consumable for medicaltool :" + base.name);
		return;
	}
	BasePlayer ownerPlayer = GetOwnerPlayer();
	Facepunch.Rust.Analytics.Azure.OnMedUsed(ownerItemDefinition.shortname, ownerPlayer, player);
	if (player != ownerPlayer && player.IsWounded() && canRevive)
	{
		player.StopWounded(ownerPlayer);
	}
	foreach (ItemModConsumable.ConsumableEffect effect in component.effects)
	{
		if (effect.type == MetabolismAttribute.Type.Health)
		{
			player.health += effect.amount;
			player.ProcessMissionEvent(BaseMission.MissionEventType.HEAL, prefabID, effect.amount);
		}
		else
		{
			player.metabolism.ApplyChange(effect.type, effect.amount, effect.time);
		}
	}
	if (player is BasePet)
	{
		player.SendNetworkUpdateImmediate();
	}
}

```
:::
