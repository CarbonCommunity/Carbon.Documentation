# SelectiveEAC Module

The SelectiveEAC Module is an **optional Carbon module** that allows certain users to bypass
`EAC (Easy Anti-Cheat)` **encryption enforcement**.
This is done using permission and group-based access control, making it ideal for custom clients, testers, or
offline developer environments.

> **Note:** This module is best used in controlled or private environments. It modifies EAC behavior and may conflict
> with strict anti-cheat setups.

## Overview

![SelectiveEAC Module](/misc/selectiveeac_a.webp){width=1640px height=502px}

- **Class Name:** `SelectiveEACModule`
- **Enabled by default:** No
- **Supports Configuration:** Yes
- **Source:** [`Carbon.Modules/SelectiveEACModule`](https://github.com/CarbonCommunity/Carbon.Modules/tree/develop/src/SelectiveEACModule)
- **Forces Modded Tag:** No

When enabled, this module patches internal Rust server methods to override how encryption and `EAC` validation work on
join.

## Configuration

The config is defined in `SelectiveEACConfig`:

```json
{
  "UsePermission": "selectiveeac.use",
  "UseGroup": "selectiveeac"
}
```

- **UsePermission** – Grant this permission to allow EAC bypass.
- **UseGroup** – Users in this group also bypass EAC.

You can grant permission like:

```bash
c.grant user 7656119XXXXXX selectiveeac.use
```

Or assign a user to the group:

```bash
c.usergroup add 7656119XXXXXX selectiveeac
```

## Use Cases

- Developer/test servers with custom clients
- Admins using modified tools or builds
- Partial `EAC` test environments

> ⚠️ **Warning:** Misuse of this module can compromise server integrity. Use only when necessary and with trusted
> players.

---

This module is a **low-level override** and should be used with care. It provides a unique capability for advanced Rust
server setups needing more flexibility around client validation.
