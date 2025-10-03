import { nextTick, ref } from 'vue'
import { save } from './ControlPanel.SaveLoad'

export const chatContainer = ref<HTMLDivElement>(null!)
export const message = ref('')
export const showingChatColorPicker = ref<boolean>(false)

export async function tryFocusChat(autoScroll: boolean = false) {
  await nextTick()
  if (chatContainer.value?.scrollHeight && (autoScroll || chatContainer.value.scrollHeight - chatContainer.value?.scrollTop < 2000)) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
  save()
}
