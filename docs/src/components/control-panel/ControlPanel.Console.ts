import { nextTick, ref } from 'vue'
import { save } from './ControlPanel.SaveLoad'

export const consoleContainer = ref<HTMLDivElement>(null!)
export const command = ref('')
export const commandIndex = ref(0)

export async function tryFocusLogs(autoScroll: boolean = false) {
  await nextTick()
  const el = consoleContainer.value
  if (!el) return

  const { scrollTop, scrollHeight, clientHeight } = el
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
  if (autoScroll || distanceFromBottom <= 400) {
    el.scrollTop = scrollHeight
  }

  save()
}
