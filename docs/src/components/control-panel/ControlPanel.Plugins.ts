import { selectedServer } from './ControlPanel.SaveLoad';
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
  }, 750);
}
