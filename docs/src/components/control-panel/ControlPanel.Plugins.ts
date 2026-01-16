import { selectedServer, addPopup } from './ControlPanel.SaveLoad';
import { ref } from 'vue';

export const pluginThinking = ref<string>('')
export const pluginDetails = ref<any | null>(null)

export function unloadPlugin(plugin: string) {
  pluginThinking.value = plugin
  selectedServer.value?.sendCall('PluginsUnload', plugin)
  selectedServer.value?.sendCall('Plugins')
}

export function loadPlugin(plugin: string) {
  pluginThinking.value = plugin
  selectedServer.value?.sendCall('PluginsLoad', plugin)
  setTimeout(() => {
    selectedServer.value?.sendCall('Plugins')
  }, 500);
}

export function reloadPlugin(plugin: string) {
  pluginThinking.value = plugin
  selectedServer.value?.sendCall('PluginsUnload', plugin)
  
  setTimeout(() => {
    selectedServer.value?.sendCall('PluginsLoad', plugin)
    setTimeout(() => {
      selectedServer.value?.sendCall('Plugins')
    }, 500); 
  }, 500);
}

export function refreshPlugins() {
  pluginThinking.value = 'refresh'
  selectedServer.value?.sendCall('Plugins')
}

export async function openPluginDetails(plugin: string) {
  const props = { title: 'Plugin Details', subtitle: 'In-depth information about ' + plugin + ' and its runtime performance.', isLoading: ref<boolean>(true) }
   selectedServer.value?.setRpc('PluginDetails', read => {
    pluginDetails.value = {}
    pluginDetails.value.name = plugin
    pluginDetails.value.compileTime = read.int32()
    pluginDetails.value.intCallHookGenTime = read.int32()
    pluginDetails.value.uptime = read.int32()
    pluginDetails.value.memoryUsed = read.int32()
    pluginDetails.value.hasInternalHookOverride = read.bool()
    pluginDetails.value.hasConditionals = read.bool()
    pluginDetails.value.permissions = []
    pluginDetails.value.hooks = []
    const permissionsCount = read.int32()
    for (let i = 0; i < permissionsCount; i++) {
      pluginDetails.value.permissions.push(read.string())
    }
    const hooksCount = read.int32()
    for (let i = 0; i < hooksCount; i++) {
      pluginDetails.value.hooks.push({
        name: read.string(),
        id: read.uint32(),
        time: read.float(),
        fires: read.int32(),
        memoryUsage: read.int32(),
        lagSpikes: read.int32(),
        asyncOverloads: read.int32(),
        debuggedOverloads: read.int32()
      })
    }
    props.isLoading.value = false
   })
  selectedServer.value?.sendCall('PluginDetails', plugin)
  addPopup((await import(`@/components/control-panel/ControlPanel.Popup.PluginInfo.vue`)).default, props)
}
