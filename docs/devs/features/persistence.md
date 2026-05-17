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

## Common API Surface (Typical)

Depending on version/build, the API usually includes:

## Open Database

```csharp
db.Open("mydatabase.db");
```

### Fast Mode (default)

```csharp
db.Open("mydatabase.db", true);
```

Enables internally:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA locking_mode = EXCLUSIVE;
```

---

## Close Database

```csharp
db.Close();
```

---

# Executing SQL

## Execute Raw Query

```csharp
db.Execute("CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT)");
```

## Execute With Parameters

```csharp
db.Execute(
    "INSERT INTO players (id, name) VALUES (?, ?)",
    1,
    "Player"
);
```

Supports multiple overloads up to 10 parameters.

---

# Querying Data

## Single Value

```csharp
int count = db.Query<int>("SELECT COUNT(*) FROM players");
```

## With Parameters

```csharp
string name = db.Query<string, int>(
    "SELECT name FROM players WHERE id = ?",
    1
);
```

## Multiple Rows

```csharp
foreach (var name in db.QueryAll<string>("SELECT name FROM players"))
{
    Console.WriteLine(name);
}
```

# Transactions

## Begin

```csharp
db.BeginTransaction();
```

## Commit

```csharp
db.Commit();
```

## Rollback

```csharp
db.Rollback();
```

### Example

```csharp
db.BeginTransaction();
try
{
    db.Execute(
        "INSERT INTO players (id, name) VALUES (?, ?)",
        1,
        "Player"
    );

    db.Commit();
}
catch
{
    db.Rollback();
}
```

---

# Schema Helpers

## Table Exists

```csharp
bool exists = db.TableExists("players");
```

## Column Exists

```csharp
bool exists = db.ColumnExists("players", "name");
```

## Index Exists

```csharp
bool exists = db.IndexExists("players", "idx_name");
```

---

# Properties

## Affected Rows

```csharp
int rows = db.AffectedRows;
```

## Last Insert ID

```csharp
long id = db.LastInsertRowId;
```

---

# Supported Types

| Type | SQLite Mapping |
|------|----------------|
| string | TEXT |
| int | INTEGER |
| uint | INTEGER |
| long | INTEGER |
| ulong | INTEGER |
| float | REAL |
| double | REAL |
| bool | INTEGER |
| Guid | BLOB |
| byte[] | BLOB |

---

# Notes

- Uses prepared statement caching internally
- WAL mode improves concurrency
- Statements are automatically reset and reused
- `Query<T>()` returns first column of first row
- `QueryAll<T>()` streams results
- Fully supports blob serialization for game data

