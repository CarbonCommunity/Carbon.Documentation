<script setup lang="ts">
import { FilePenLineIcon, StarIcon } from 'lucide-vue-next'
</script>

# <FilePenLineIcon class="carbon-icon" /> Creating Your First Plugin

If you’re looking at creating Oxide-compatible plugins, it’s as easy as you’ve always known it.
It uses the same syntax, naming and formatting as regular Oxide plugins.

::: code-group

```csharp:line-numbers [MyPlugin.cs]
namespace Oxide.Plugins;

[Info("MyPlugin", "<author>", "1.0.0")]
[Description("<optional_description>")]
public class MyPlugin : RustPlugin
{
    private void OnServerInitialized()
    {
        Puts("Hello world!");
    }
}
```

:::

## <StarIcon class="carbon-icon" /> CarbonPlugin

If you’re looking to create Carbon-only plugins, which **extend** the functionality of regular Oxide plugins and provide
additional tools to ease development, you can use `CarbonPlugin` as your base class.

::: code-group

```csharp:line-numbers [MyPlugin.cs]
namespace Carbon.Plugins;

[Info("MyPlugin", "<author>", "1.0.0")]
[Description("<optional_description>")]
public class MyPlugin : CarbonPlugin
{
    private void OnServerInitialized()
    {
        Puts("Hello world!");
    }
}
```

:::
