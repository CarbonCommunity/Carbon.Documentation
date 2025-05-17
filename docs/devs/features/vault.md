---
title: Vault
description: Carbon.Vault is an encrypted and locally stored database dedicated to storing sensitive information in plugin configurations and more.
---

# Vault
`Carbon.Vault` is an encrypted and locally stored database dedicated to storing sensitive information in plugin
configurations and more.

<CarbonButton href="https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Components/Vault.cs" icon="code" text="Source Code" external/>

:::tip STORAGE
It's an encrypted, compressed and locally stored file named `<root>/server/identity/carbon.vault` in which all the
encrypted strings get stored.
:::

## Commands

The system comes with 3 built-in RCon commands.

- `c.vault` — Prints a whole list of all vault factory and item keys without any protected values
- `c.vault_add` — Adds a new element to the vault
- `c.vault_remove` — Removes an element from the vault

```csharp
> c.vault // [!code focus]
factory     items  encrypted  value
 plain      test1  False      aaa
 passwords  test2  True
 global     pwd    True

> c.find vault // [!code focus]
command          value  help
 c.vault                Prints a whole list of all vault factory and item keys without any protected values
 c.vault_add            Adds a new element to the vault
 c.vault_remove         Removes an element from the vault
> c.vault_add // [!code focus]
Syntax: c.vault_add <key> <value> [encrypted|true] [factory|global]
```

## Config Files

This is the format the config properties will look like;

```json
{
  "Username": null,
  "Password": "{global:pwd}"
}
```

The properties with the `[JsonConverter(typeof(Vault.Protected))]` attribute will only pick up protected keys.

:::danger VALUES
The format of the values are `{factory:id}`. The `factory` is basically a 'folder' of encrypted and non-encrypted
strings, and the `id` is the identifier or name of a string in the factory.
:::

```csharp
public class ConfigTest
{
    public string Username;
#if CARBON // [!code focus]
    [JsonConverter(typeof(Vault.Protected))] // [!code focus]
#endif // [!code focus]
    public string Password;
}
```

## Backward Compatibility

It's backward compatible with Oxide if you just use the `#if CARBON` conditional symbol, in which people place the real
plain text string of the sensitive data in the config since Oxide doesn't have something like this.

This works for data files as well but nobody uses them as configuration files, right?
