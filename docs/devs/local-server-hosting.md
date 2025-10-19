<script setup lang="ts">
import { BugOffIcon, DownloadIcon, ListIcon, PlayIcon, ServerIcon } from 'lucide-vue-next'
</script>

# <ServerIcon class="carbon-icon" /> Local Server Hosting

This is a guide on how to get started with the
[`Carbon.QuickStart`](https://github.com/CarbonCommunity/Carbon.QuickStart/tree/main/win) repository on
running a local server (for development purposes).

## <DownloadIcon class="carbon-icon" /> Download

1. Visit the [**Carbon.QuickStart**](https://github.com/CarbonCommunity/Carbon.QuickStart/tree/main/win)
   repository
2. Download the Windows (`win`) files
3. Extract contents to a new folder

## <ListIcon class="carbon-icon" /> Batch Steps

Run any `update_*.bat` file corresponding to your preferred Rust/Carbon branch. These files automate:

1. **SteamCMD Setup**  
   Downloads & updates SteamCMD in `<root>/steam`
2. **Carbon Installation**  
   Fetches selected Carbon branch build to `<root>/server/carbon`
3. **Rust Server**  
   Installs Rust dedicated server in `<root>/server`

:::tip Automation
The batch files handle everything - no manual intervention required!
:::

## <BugOffIcon class="carbon-icon" /> Debugger Setup (Optional)

Enable debugging for plugin development by editing `<root>/doorstop_config.ini`:

```ini
[UnityMono]
debug_enabled=true
debug_suspend=true
debug_address=127.0.0.1:5337
```

:::warning Configuration Note
Running any `update_*.bat` will overwrite `doorstop_config.ini` with default values.  
Backup your changes before updating.
:::

:::danger Configuration Note #2
Be aware that `debug_suspend=true` will prevent the server from starting until you attach a debugger.
:::

## <PlayIcon class="carbon-icon" /> Run Your Server

1. Edit `run.bat` to configure:
   - Ports
   - Folder paths
   - Server settings
2. Save changes and double-click `run.bat` to launch
