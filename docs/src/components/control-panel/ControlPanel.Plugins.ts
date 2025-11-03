import { selectedServer, addPopup } from './ControlPanel.SaveLoad';
import { ref } from 'vue';

export const pluginThinking = ref<string>('')

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

export async function pluginDetails(plugin: string) {
  addPopup((await import(`@/components/control-panel/ControlPanel.Popup.PluginInfo.vue`)).default, { textie: 'yolao' })
}
