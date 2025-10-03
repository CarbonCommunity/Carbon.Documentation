<script setup lang="ts">
import CarbonButton from '@/components/CarbonButton.vue'
import { BedIcon, CloudDownloadIcon, DatabaseIcon, DownloadIcon, FilePenIcon, FilePlusIcon, FolderPlusIcon, PlayIcon, PowerIcon, ScrollTextIcon, SnailIcon } from 'lucide-vue-next'
</script>

# <DatabaseIcon class="carbon-icon" /> Creating Your Project

This section will guide you through creating your project and linking it to a local development server.

A local server ensures you have the latest DLLs for both Rust and Carbon.

:::tabs
== Template
You can download the Visual Studio 2022 project template for Carbon below. This acts as a self-contained server and
development environment for Carbon plugins.

### **Features:**

- Batch file to download
  the [Carbon QuickStart Repository](https://github.com/CarbonCommunity/Carbon.QuickStart/tree/main/win)
- Preconfigured `.csproj` file pointing to `Carbon.targets`
- Self-contained local server within the project folder

<CarbonButton href="https://cdn.carbonmod.gg/TemplateProject.zip" text="TemplateProject.zip" :icon="CloudDownloadIcon" external/> 
== Instructions
1. Download `TemplateProject.zip` and move it to:
   `%USERPROFILE%\Documents\Visual Studio 2022\Templates\ProjectTemplates\`
2. Open Visual Studio 2022 → `Create a new project` → search `carbon` → select `Carbon Template`
3. Set project `Name` and `Location`, check `Place solution and project in the same directory`, then click `Create`
4. Run `Rust/Download_Quickstart.bat` followed by `update_edge.bat` – wait for each to complete
5. Edit and run `run.bat`
6. Restart Visual Studio after the server boots
:::

## <CloudDownloadIcon class="carbon-icon" /> Choosing an IDE

For optimal development, install either:

- [**Visual Studio 2022**](https://visualstudio.microsoft.com/vs/)
- [**Rider**](https://www.jetbrains.com/rider/)

:::tip Visual Studio 2022
This tutorial assumes you're using **VS2022**
:::

## <FolderPlusIcon class="carbon-icon" /> Step 1: Create Your Directory Structure

Create a base directory (e.g., `F:\RustModding`) with two subfolders:

1. `Carbon Server` – Contains server files
2. `Plugin Dev` – For plugin development

:::danger Important
**Windows has a 256-character path limit.**  
Keep folders close to your root directory to avoid issues.
:::

## <DownloadIcon class="carbon-icon" /> Step 2: Download the Carbon QuickStart Files

Download from the [Carbon QuickStart Repository](https://github.com/CarbonCommunity/Carbon.QuickStart/tree/main/win) and
place contents in `Carbon Server`.

:::info Installation Guide
See [Installation Instructions](/devs/local-server-hosting) for server setup details.
:::

## <ScrollTextIcon class="carbon-icon" /> Step 3: Update Carbon

Run the `update_edge.bat` file inside the Carbon Server folder. This will download the latest files required for Carbon
to function.

:::tip Branch Selection
For specific branches, run corresponding update files:

- `update_production.bat`
- `update_preview.bat`
- `update_edge.bat`
- `update_rustbeta_staging.bat`

:::

## <FilePenIcon class="carbon-icon" /> Step 4: Configure the Server

Edit `run.bat` to modify server settings like name and ports.

:::danger Default Password
Make sure you change your password to something unique.

If your password is the default password, your **RCon** will not work.
:::

## <PlayIcon class="carbon-icon" /> Step 5: Start the Server

Run `run.bat` and wait for the server to fully boot.

## <FilePenIcon class="carbon-icon" /> Step 6: Enable Developer Mode

1. Navigate to `<root>/carbon/config.json`
2. Set `DeveloperMode` to `true`

:::info DLL Management
Developer Mode saves patched DLLs to `carbon/developer/patched_assemblies/` for plugin development. These are referenced
by `Carbon.targets`.
:::

## <FilePlusIcon class="carbon-icon" /> Step 7: Create Plugin Project

When prompted to choose a framework, select `.NET Framework 4.8` and proceed with the project creation.

## <FilePenIcon class="carbon-icon" /> Step 8: Modify the Project File

Inside your newly created project, locate the `.csproj` file. Open it in a text editor and add the following line on the
second line of the file:

```xml
<Import Project="<root>/Carbon.targets"/>
```

This ensures that your project has access to the necessary Carbon assemblies. Save the file once done.

## <PowerIcon class="carbon-icon" /> Step 9: Restart Your IDE

To apply the changes, close and reopen your IDE.

---

Once you've completed these steps, your development environment will be fully set up, and you’ll have everything needed
to start creating plugins for Carbon.

🎉 Happy Coding! 🚀

<p>
  <SnailIcon class="carbon-icon" /> Snail for good luck!
</p>

<p>
  <BedIcon class="carbon-icon" /> bed
</p>
