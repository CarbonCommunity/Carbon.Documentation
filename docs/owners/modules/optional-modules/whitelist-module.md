# Whitelist Module

The Whitelist Module is an **optional Carbon module** that restricts server access to players who are explicitly
permitted. It uses permission-based access control to allow or deny logins and includes localization support for denial
messages.

> **Note:** This module is **not enabled by default**. When enabled, only whitelisted users (via permission or group)
> can connect to the server.

## Overview

![Whitelist Module](/misc/whitelist_a.webp){width=1640px height=502px}

- **Class Name:** `WhitelistModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/WhitelistModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/WhitelistModule)
- **Forces Modded Tag:** No

This module enforces a simple, permission-based access list when players attempt to connect.

## Configuration

Defined in `WhitelistConfig`:

```json
{
  "BypassPermission": "whitelist.bypass",
  "BypassGroup": "whitelisted"
}
```

### Bypass Logic

Players can join the server if they:

- Have the `whitelist.bypass` permission\
**or**
- Are in the `whitelisted` group\
**or**
- Have an `authLevel` of 2 or higher (admin)

Grant permission or add to group via:

```bash
c.grant user 7656119XXXXXX whitelist.bypass
c.usergroup add 7656119XXXXXX whitelisted
```

Default Lang `en`:

```json
{
  "denied": "Not whitelisted"
}
```

You can add support for other languages by modifying the `GetDefaultPhrases` method.

## Use Cases

- Private or invite-only servers
- Whitelist-based events
- Staging/test environments

---

The Whitelist Module is perfect for small communities or controlled access scenarios where public connection is not
desired.

