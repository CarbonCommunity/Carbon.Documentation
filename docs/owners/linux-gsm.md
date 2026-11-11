---
title: Linux GSM
description: Carbon now ships with LinuxGSM and can be installed and updated using the included one-liner install scripts!
slug: linux-gsm
---

# 🐧 Linux Game Server Managers
![LinuxGSM](/misc/linuxgsm.webp){width=1640px height=502px}

## Setup

Carbon now ships with [`LinuxGSM`](https://linuxgsm.com) and can be installed and updated using the included one-liner install scripts!

### Install

```bash
./rustserver mods-install
```

> Upon running that, you'll be prompted with a list of available mods. You want to specify `rustcarbon`.

### Update

```bash
./rustserver mods-update
```

### Uninstall

```bash
./rustserver mods-removes
```

> If you're not familiar with LinuxGSM commands please have a look
> at [their documentation](https://linuxgsm.com/servers/rustserver/#v-pills-usage) for a quick overview.
