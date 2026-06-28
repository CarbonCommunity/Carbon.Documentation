// Runtime syntax highlighting for the generated code, reusing the same engine (Shiki) VitePress uses
// for docs code blocks. Fine-grained imports — csharp + json + one theme, the JS regex engine (no
// WASM) — keep this small; it lands in its own chunk and only loads on the tool page. Highlighting
// runs client-side only (onMounted), so SSR renders the plain-text fallback.
import { refDebounced } from '@vueuse/core'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import csharp from '@shikijs/langs/csharp'
import json from '@shikijs/langs/json'
import githubDark from '@shikijs/themes/github-dark'
import { computed, onMounted, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'

const THEME = 'github-dark'
export type CodeLang = 'csharp' | 'json'

// One highlighter shared across every pane that highlights (Code + Debug); created on first use.
let highlighterPromise: Promise<HighlighterCore> | null = null
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDark],
      langs: [csharp, json],
      engine: createJavaScriptRegexEngine({ forgiving: true }), // never throw on an odd token
    })
  }
  return highlighterPromise
}

/** Reactive Shiki-highlighted HTML for `code` in `lang`; null until the highlighter has loaded (the
 *  caller falls back to a plain <pre> then). The input is debounced so a live drag — which
 *  regenerates the code continuously — doesn't re-highlight on every frame. */
export function useShiki(code: MaybeRefOrGetter<string>, lang: MaybeRefOrGetter<CodeLang>) {
  const highlighter = shallowRef<HighlighterCore | null>(null)
  onMounted(async () => {
    highlighter.value = await getHighlighter()
  })

  const codeRef = computed(() => toValue(code))
  const debounced = refDebounced(codeRef, 60)

  const html = computed(() => {
    const h = highlighter.value
    if (!h) return null
    try {
      return h.codeToHtml(debounced.value, { lang: toValue(lang), theme: THEME })
    } catch {
      return null // fall back to the plain <pre>
    }
  })

  return { html }
}
