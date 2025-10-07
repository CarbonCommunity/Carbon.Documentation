import { nextTick, ref } from 'vue'
import { save } from './ControlPanel.SaveLoad'

export const consoleContainer = ref<HTMLDivElement>(null!)
export const command = ref('')
export const commandIndex = ref(0)

export async function tryFocusLogs(autoScroll: boolean = false) {
  return
  await nextTick()
  if (consoleContainer.value?.scrollHeight && (autoScroll || consoleContainer.value.scrollHeight - consoleContainer.value?.scrollTop < 2000)) {
    consoleContainer.value.scrollTop = consoleContainer.value.scrollHeight
  }
  save()
}
