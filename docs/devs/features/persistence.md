---
title: persistence
description: Reference documentation for Carbon permissions system
---

# Facepunch SQLite 

This document describes a wrapper for existing Facepunch SQLite.

---

## Namespace

```csharp
using Facepunch.Sqlite;
```

All core functionality is exposed through:

- `Facepunch.Sqlite.Database`

---

## Overview

Facepunch SQLite is a lightweight wrapper around SQLite designed for:

- Game server persistence
- High-performance data storage
- Low-overhead SQL execution
- Binary blob storage support

It is commonly used in dedicated server environments.

---

## Creating a Database

```csharp
private Facepunch.Sqlite.Database _db;
string path = Path.Combine(ConVar.Server.filesStorageFolder, "mydb.db");
db.Open(path, createIfMissing: true);
```
Existing database directory that holds game server .db files, can be found at `<root>\server\server\myrustserver`

---

## Basic Execution

### Execute SQL 

Used for table creation, inserts, updates, deletes:

```csharp
db.Execute("CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, name TEXT)");
db.Execute("INSERT INTO players (id, name) VALUES (1, 'Alice')");
```

---

## Common API Surface (Typical)

Depending on version/build, the API usually includes:

### Database

- `Open(string path, bool createIfMissing)`
- `Close()`
- `Execute(string sql, params object[] args)`
