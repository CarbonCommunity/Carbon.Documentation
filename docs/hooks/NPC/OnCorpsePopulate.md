<Badge type="danger" text="Carbon Compatible"/><Badge type="warning" text="Oxide Compatible"/>
# OnCorpsePopulate
```csharp
public override BaseCorpse CreateCorpse(BasePlayer.PlayerFlags flagsOnDeath, UnityEngine.Vector3 posOnDeath, UnityEngine.Quaternion rotOnDeath, System.Collections.Generic.List<TriggerBase> triggersOnDeath, bool forceServerSide = false)
{
	using (TimeWarning.New("Create corpse"))
	{
		NPCPlayerCorpse nPCPlayerCorpse = DropCorpse(CorpsePath, flagsOnDeath, modelState) as NPCPlayerCorpse;
		if ((bool)nPCPlayerCorpse)
		{
			if (NavAgent != null)
			{
				nPCPlayerCorpse.transform.position += UnityEngine.Vector3.down * NavAgent.baseOffset;
			}
			nPCPlayerCorpse.SetLootableIn(2f);
			nPCPlayerCorpse.SetFlag(BaseEntity.Flags.Reserved5, HasPlayerFlag(BasePlayer.PlayerFlags.DisplaySash));
			nPCPlayerCorpse.SetFlag(BaseEntity.Flags.Reserved2, b: true);
			if (CopyInventoryToCorpse)
			{
				nPCPlayerCorpse.TakeFrom(this, base.inventory.containerMain, base.inventory.containerWear, base.inventory.containerBelt);
			}
			else
			{
				nPCPlayerCorpse.CreateEmptyContainer(base.inventory.containerMain.capacity);
			}
			nPCPlayerCorpse.playerName = OverrideCorpseName;
			nPCPlayerCorpse.playerSteamID = userID;
			nPCPlayerCorpse.Spawn();
			if (ShouldCorpseTakeChildren)
			{
				nPCPlayerCorpse.TakeChildren(this);
			}
			for (int i = 0; i < nPCPlayerCorpse.containers.Length; i++)
			{
				ItemContainer itemContainer = nPCPlayerCorpse.containers[i];
				if (!KeepCorpseClothingIntact || i != 1)
				{
					itemContainer.Clear();
				}
			}
			ApplyLoot(nPCPlayerCorpse);
		}
		return nPCPlayerCorpse;
	}
}

```
