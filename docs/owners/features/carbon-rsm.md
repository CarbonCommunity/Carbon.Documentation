---
title: Carbon Rust Server Metrics
description: A metrics gathering Harmony-based module for Rust game servers using Carbon.
---

# Rust Server Metrics

**Carbon Rust Server Metrics (RSM)** is a Harmony-based module that collects metrics from Rust game servers running Carbon forked from [Rust.ServerMetrics](https://github.com/RustyMoose/Rust.ServerMetrics).

**Source:** [CarbonCommunity/Carbon.RSM](https://github.com/CarbonCommunity/Carbon.RSM)

## Setup

1. Install **Grafana 9 or newer** and **InfluxDB 1.8** on a server. InfluxDB 2.0 and newer are not compatible.
2. Set both `max-values-per-tag` and `max-series-per-database` to `0` in the InfluxDB configuration. This is required for the volume of data stored by player metrics.
3. Restart InfluxDB to apply the changes.
4. Create an InfluxDB database with an appropriate retention policy. A suggested starting point is **12 weeks** of retention with a **24-hour shard group duration**.
5. Create a user with **write** permissions on that database.
6. Import the [dashboard](https://raw.githubusercontent.com/CarbonCommunity/Carbon.RSM/master/res/Grafana-Dashboard.json) into Grafana and configure the **DataSource** variable.
7. Stop the Rust server.
8. Download the latest `Carbon.Windows.RSM.dll` or `Carbon.Linux.RSM.dll` from the [RSM release page](https://github.com/CarbonCommunity/Carbon.RSM/releases/tag/main_build) and copy it to `carbon/managed/modules` in the server directory.
9. Start the Rust server.
10. Once the server has started and the module has loaded, edit `HarmonyMods_Data/ServerMetrics/Configuration.json` using the configuration details below.
11. Run `servermetrics.reloadcfg` to reload the configuration.

:::warning InfluxDB limits
Leaving the default `max-values-per-tag` and `max-series-per-database` limits in place will eventually cause metric submissions to fail and data to be lost.
:::

:::warning DLL changes
Never update or delete a Harmony mod DLL while the Rust server is running. Doing so can cause invalid IL exceptions and eventually crash the server.
:::

## Configuration

### Example

:::tabs
===HarmonyMods_Data/ServerMetrics/Configuration.json
```json
{
  "Enabled": true,
  "Influx Database Url": "https://my-influx-database:8086",
  "Influx Database Name": "rust-server-metrics",
  "Influx Database User": "my-database-user",
  "Influx Database Password": "my-super-secret-password-thats-a-decent-size",
  "Server Tag": "us-10x",
  "Debug Logging": false,
  "Amount of metrics to submit in each request": 1000
}
```
:::

### Settings

| Setting | Description |
| --- | --- |
| `Enabled` | When `true`, collects metrics and submits them to the configured InfluxDB database. |
| `Influx Database Url` | The URL used to access InfluxDB. A valid SSL certificate is strongly recommended when accessing the database over the internet. |
| `Influx Database Name` | The name of the database created during setup. |
| `Influx Database User` | The username of the database user created during setup. |
| `Influx Database Password` | The password for that database user. |
| `Server Tag` | A static tag added to every record submitted by the server. Use a different tag for each Rust server. |
| `Debug Logging` | Logs the raw HTTP response for failed submissions. Disable this after the server is connected, as it can cause performance issues. |
| `Amount of metrics to submit in each request` | The number of statistics records sent in each HTTP request. The minimum value is `1000`. |

:::tip Multiple servers
Multiple Rust servers can submit data to the same InfluxDB database when each uses a different `Server Tag`.
:::

### Submission Batch Size

Setting `Amount of metrics to submit in each request` too high can increase submission times and affect server FPS. Setting it too low can cause records to be discarded if they are generated faster than they can be sent.

The project reports testing servers with **200–600 players** without issues at a batch size of `1000`.

## Commands

| Command | Description |
| --- | --- |
| `servermetrics.reloadcfg` | Reloads changes made to the configuration file. |
| `servermetrics.status` | Shows whether the module is ready to collect metrics, whether the uploader is sending an HTTP request, and how many records are in the send buffer. |

## Report Buffer

The report buffer has a fixed capacity of **100,000 reports**. Once this capacity is exceeded, reports are discarded, resulting in missing data in Grafana.

Monitor the buffer size when changing `Amount of metrics to submit in each request`.

## Securing InfluxDB 1.8

:::warning Database access
An unsecured InfluxDB instance can expose data to the public. Complete the security steps below.
:::

### Enable Authentication

1. Open `influxdb.conf`, usually located in `/etc/influxdb/`.
2. Set `auth-enabled` to `true` in the `[http]` section:

   ```toml
   [http]
     auth-enabled = true
   ```

3. Restart InfluxDB to apply the change:

   ```bash
   sudo systemctl restart influxdb
   ```

4. Open the InfluxDB shell:

   ```bash
   influx
   ```

5. Create an administrator account, replacing `<username>` and `<password>` with the required credentials:

   ```sql
   CREATE USER <username> WITH PASSWORD '<password>' WITH ALL PRIVILEGES
   ```

6. Optionally, create additional users with fewer privileges as needed.

### Enable HTTPS

1. Obtain SSL certificates using a service such as Let's Encrypt, or generate a self-signed certificate.
2. Enable HTTPS in the `[http]` section of `influxdb.conf` and provide the certificate and private-key paths:

   ```toml
   [http]
     https-enabled = true
     https-certificate = "/path/to/your/certificate.pem"
     https-private-key = "/path/to/your/privatekey.pem"
   ```

3. Restart InfluxDB to apply the changes:

   ```bash
   sudo systemctl restart influxdb
   ```

### Firewall Configuration

Configure the firewall to allow only trusted traffic to the InfluxDB ports.

### Updates

Regularly check for and apply InfluxDB security patches.

### Backups

Back up the database regularly to prevent data loss in the event of a security breach or failure.
