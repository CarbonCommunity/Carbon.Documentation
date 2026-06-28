import { onBeforeUnmount, shallowRef } from 'vue'

// Document Picture-in-Picture pop-out for a designer pane.
//
// The pane's live DOM node is *moved* into the PiP window via <Teleport>, so we keep the same JS
// context and Vue reactivity keeps working with zero data-syncing. This composable owns the window
// lifecycle (open / close / cleanup) and the one-time stylesheet copy; the caller wires `pipTarget`
// into a <Teleport :to="pipTarget" :disabled="!pipTarget"> and shows a placeholder while popped.
//
// Chromium-based browsers only. `supported` is false elsewhere — callers hide the control then.

export interface PopoutOptions {
  width?: number
  height?: number
}

export function usePopout(title: () => string, opts: PopoutOptions = {}) {
  const supported = typeof window !== 'undefined' && 'documentPictureInPicture' in window

  // The host element inside the PiP window that Teleport relocates the pane into; null when docked.
  const pipTarget = shallowRef<HTMLElement | null>(null)
  let pipWindow: Window | null = null

  async function open() {
    if (!supported || pipTarget.value) return

    const pip = (window as unknown as { documentPictureInPicture: { requestWindow(o: { width: number; height: number }): Promise<Window> } }).documentPictureInPicture
    const w = await pip.requestWindow({ width: opts.width ?? 480, height: opts.height ?? 600 })
    pipWindow = w

    w.document.title = title()
    copyStyles(w)

    // Carry the VitePress theme class (e.g. `dark`) so --vp-c-* / --c-carbon-* :root vars resolve.
    w.document.documentElement.className = document.documentElement.className

    const body = w.document.body
    body.style.margin = '0'
    body.style.height = '100vh'
    body.style.overflow = 'hidden'

    const host = w.document.createElement('div')
    host.style.height = '100vh'
    host.style.display = 'flex'
    host.style.flexDirection = 'column'
    host.style.background = 'var(--c-carbon-bg-dark)'
    body.appendChild(host)
    pipTarget.value = host

    // User closed the PiP window (or it was closed programmatically) — return the node in place.
    w.addEventListener('pagehide', () => {
      pipTarget.value = null
      pipWindow = null
    })
  }

  function close() {
    // pagehide handler resets pipTarget/pipWindow.
    pipWindow?.close()
  }

  function toggle() {
    if (pipTarget.value) close()
    else void open()
  }

  function copyStyles(w: Window) {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('')
        const style = w.document.createElement('style')
        style.textContent = css
        w.document.head.appendChild(style)
      } catch {
        // Cross-origin stylesheet — cssRules throws. Re-link it instead.
        if (sheet.href) {
          const link = w.document.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          w.document.head.appendChild(link)
        }
      }
    }
  }

  // Don't leave an orphan window if the designer unmounts while popped out.
  onBeforeUnmount(() => pipWindow?.close())

  return { supported, pipTarget, open, close, toggle }
}
