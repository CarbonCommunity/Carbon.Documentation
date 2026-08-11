import { nextTick, ref } from 'vue'
import { save } from './ControlPanel.SaveLoad'

export const chatContainer = ref<HTMLDivElement>(null!)
export const message = ref('')
export const showingChatColorPicker = ref<boolean>(false)

export async function tryFocusChat(autoScroll: boolean = false) {
  await nextTick()
  const el = chatContainer.value
  if (!el) return

  const { scrollTop, scrollHeight, clientHeight } = el
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
  if (autoScroll || distanceFromBottom <= 400) {
    el.scrollTop = scrollHeight
  }

  save()
}
