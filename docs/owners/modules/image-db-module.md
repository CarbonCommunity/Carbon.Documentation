# Image Database Module

The Image Database Module is a **core module** included in the Carbon modding framework for Rust. It manages
downloading, storing, mapping, and reusing images via Rust's `FileStorage` system and Carbon’s own identifiers.

> **Note:** This module is **built into Carbon** and does not require installation like traditional plugins. It is
> always enabled and cannot be disabled.

## Overview

- **Class Name:** `ImageDatabaseModule`
- **Enabled by default:** Yes
- **Force enabled:** Yes (cannot be disabled)
- **Supports Configuration:** No
- **Source:** [`Carbon.Common/ImageDatabaseModule`](https://github.com/CarbonCommunity/Carbon.Common/blob/develop/src/Carbon/Modules/ImageDatabaseModule/ImageDatabaseModule.cs)
- **Forces Modded Tag:** No

This module allows **plugins to download images from URLs**, assign internal keys to them, and reuse them efficiently
with caching. It also supports QR code generation.

## Accessing the Module in Plugins

```csharp
var imageDb = Carbon.Base.BaseModule.GetModule<ImageDatabaseModule>();
```

## How It Works

### Queue Image

```csharp
imageDb.Queue("my-key", "https://example.com/image.png");
```

You can also directly add raw image data:

```csharp
var imagePath = "carbon/data/someimage.png";
var bytes = File.ReadAllBytes(imagePath);
imageDb.AddImage("my-key", bytes);
```

Retrieve the stored image ID:

```csharp
var imageId = imageDb.GetImage("my-key");
```

## QR Code Generation

```csharp
var qrId = imageDb.GetQRCode("https://carbonmod.gg");
```

## Image Removal

```csharp
imageDb.DeleteImage("https://example.com/image.png");
```

## Default Images

These default images are queued automatically on startup or can be manually reloaded using the console command
`imagedb.loaddefaults`:

| Key              | URL                                                                  | IMAGE                                                                                    |
|------------------|----------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| carbonb          | https://cdn.carbonmod.gg/carbonlogo_b.png                         	  | ![carbonb](https://cdn.carbonmod.gg/carbonlogo_b.png)                               	 |
| carbonw          | https://cdn.carbonmod.gg/carbonlogo_w.png                         	  | ![carbonw](https://cdn.carbonmod.gg/carbonlogo_w.png)                               	 |
| carbonbs         | https://cdn.carbonmod.gg/carbonlogo_bs.png                        	  | ![carbonbs](https://cdn.carbonmod.gg/carbonlogo_bs.png)                             	 |
| carbonws         | https://cdn.carbonmod.gg/carbonlogo_ws.png                        	  | ![carbonws](https://cdn.carbonmod.gg/carbonlogo_ws.png)                             	 |
| cflogo           | https://cdn.carbonmod.gg/content/codefling-logo.png               	  | ![cflogo](https://cdn.carbonmod.gg/content/codefling-logo.png)                      	 |
| checkmark        | https://cdn.carbonmod.gg/content/checkmark.png                    	  | ![checkmark](https://cdn.carbonmod.gg/content/checkmark.png)                        	 |
| umodlogo         | https://cdn.carbonmod.gg/content/umod-logo.png                    	  | ![umodlogo](https://cdn.carbonmod.gg/content/umod-logo.png)                         	 |
| clouddl          | https://cdn.carbonmod.gg/content/cloud-dl.png                     	  | ![clouddl](https://cdn.carbonmod.gg/content/cloud-dl.png)                           	 |
| trashcan         | https://cdn.carbonmod.gg/content/trash-can.png                    	  | ![trashcan](https://cdn.carbonmod.gg/content/trash-can.png)                         	 |
| shopping         | https://cdn.carbonmod.gg/content/shopping-cart.png                	  | ![shopping](https://cdn.carbonmod.gg/content/shopping-cart.png)                     	 |
| installed        | https://cdn.carbonmod.gg/content/installed.png                    	  | ![installed](https://cdn.carbonmod.gg/content/installed.png)                        	 |
| reload           | https://cdn.carbonmod.gg/content/reload.png                       	  | ![reload](https://cdn.carbonmod.gg/content/reload.png)                              	 |
| update-pending   | https://cdn.carbonmod.gg/content/update-pending.png               	  | ![update-pending](https://cdn.carbonmod.gg/content/update-pending.png)              	 |
| magnifying-glass | https://cdn.carbonmod.gg/content/magnifying-glass.png             	  | ![magnifying-glass](https://cdn.carbonmod.gg/content/magnifying-glass.png)          	 |
| filter           | https://cdn.carbonmod.gg/content/filter.png                       	  | ![filter](https://cdn.carbonmod.gg/content/filter.png)                              	 |
| star             | https://cdn.carbonmod.gg/content/star.png                         	  | ![star](https://cdn.carbonmod.gg/content/star.png)                                  	 |
| glow             | https://cdn.carbonmod.gg/content/glow.png                         	  | ![glow](https://cdn.carbonmod.gg/content/glow.png)                                  	 |
| gear             | https://cdn.carbonmod.gg/content/gear.png                         	  | ![gear](https://cdn.carbonmod.gg/content/gear.png)                                  	 |
| sort             | https://cdn.carbonmod.gg/content/sort.png                         	  | ![sort](https://cdn.carbonmod.gg/content/sort.png)                                  	 |
| close            | https://cdn.carbonmod.gg/content/close.png                        	  | ![close](https://cdn.carbonmod.gg/content/close.png)                                	 |
| fade             | https://cdn.carbonmod.gg/content/fade.png                         	  | ![fade](https://cdn.carbonmod.gg/content/fade.png)                                  	 |
| graph            | https://cdn.carbonmod.gg/content/graph.png                        	  | ![graph](https://cdn.carbonmod.gg/content/graph.png)                                	 |
| maximize         | https://cdn.carbonmod.gg/content/maximize.png                     	  | ![maximize](https://cdn.carbonmod.gg/content/maximize.png)                          	 |
| minimize         | https://cdn.carbonmod.gg/content/minimize.png                     	  | ![minimize](https://cdn.carbonmod.gg/content/minimize.png)                          	 |
| folder           | https://cdn.carbonmod.gg/content/folder.png                       	  | ![folder](https://cdn.carbonmod.gg/content/folder.png)                              	 |
| file             | https://cdn.carbonmod.gg/content/file.png                         	  | ![file](https://cdn.carbonmod.gg/content/file.png)                                  	 |
| translate        | https://cdn.carbonmod.gg/content/translate.png                    	  | ![translate](https://cdn.carbonmod.gg/content/translate.png)                        	 |
| cf_hero          | https://cdn.carbonmod.gg/content/cf_hero.png           	  | ![cf_hero](https://cdn.carbonmod.gg/content/cf_hero.png)                 	 |
| umod_hero        | https://cdn.carbonmod.gg/content/umod_hero.png         	  | ![umod_hero](https://cdn.carbonmod.gg/content/umod_hero.png)             	 |
| installed_hero   | https://cdn.carbonmod.gg/content/installed_hero.png    	  | ![installed_hero](https://cdn.carbonmod.gg/content/installed_hero.png)   	 |
| hero_fade        | https://cdn.carbonmod.gg/content/hero_fade.png         	  | ![hero_fade](https://cdn.carbonmod.gg/content/hero_fade.png)             	 |
| fade_flip        | https://cdn.carbonmod.gg/content/fade_flip.png         	  | ![fade_flip](https://cdn.carbonmod.gg/content/fade_flip.png)             	 |
| empty_star       | https://cdn.carbonmod.gg/content/empty_star.png        	  | ![empty_star](https://cdn.carbonmod.gg/content/empty_star.png)           	 |
| half_star        | https://cdn.carbonmod.gg/content/half_star.png         	  | ![half_star](https://cdn.carbonmod.gg/content/half_star.png)             	 |
| full_star        | https://cdn.carbonmod.gg/content/full_star.png         	  | ![full_star](https://cdn.carbonmod.gg/content/full_star.png)             	 |
| top_left         | https://cdn.carbonmod.gg/content/top_left.png          	  | ![top_left](https://cdn.carbonmod.gg/content/top_left.png)               	 |
| default_profile  | https://cdn.carbonmod.gg/content/default_profile.jpg   	  | ![default_profile](https://cdn.carbonmod.gg/content/default_profile.jpg) 	 |
| bsod  		   | https://cdn.carbonmod.gg/content/bsod.png	  			  	  | ![bsod](https://cdn.carbonmod.gg/content/bsod.png) 	   						 |

## Example Use in Plugin

```csharp
imageDb.Queue("logo", "https://mydomain.com/logo.png");
var id = imageDb.GetImage("logo");
```

---

For maximum compatibility, always check `HasImage(key)` before trying to use it in a UI.
