// Runtime syntax highlighting for the generated code, reusing the same engine (Shiki) VitePress uses
// for docs code blocks. Fine-grained imports — csharp + json + one theme, the JS regex engine (no
// WASM) — keep this small; it lands in its own chunk and only loads on the tool page. Highlighting
// runs client-side only (onMounted), so SSR renders the plain-text fallback.
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import csharp from '@shikijs/langs/csharp'
import json from '@shikijs/langs/json'
import githubDark from '@shikijs/themes/github-dark'
import { computed, onMounted, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'

const THEME = 'github-dark'
export type CodeLang = 'csharp' | 'json'

// One highlighter shared across every pane that highlights (Code + Debug); created on first use.
// Uses the Oniguruma (inlined WASM) engine — the same one VitePress uses to build docs code blocks,
// so the generated code is tokenised exactly like a docs C#/JSON block. (The JS regex engine is
// lighter but mis-tokenises parts of the C# grammar, collapsing argument lists into one plain run.)
let highlighterPromise: Promise<HighlighterCore> | null = null
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDark],
      langs: [csharp, json],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    })
  }
  return highlighterPromise
}

/** Reactive Shiki-highlighted HTML for `code` in `lang`; null until the highlighter has loaded (the
 *  caller falls back to a plain <pre> then). `code` is re-highlighted whenever it changes, so the caller
 *  is responsible for feeding it at a sane cadence — CodeOutput debounces the INPUT to code generation,
 *  so a live drag never reaches here per frame (and we avoid a second, first-paint-delaying debounce). */
export function useShiki(code: MaybeRefOrGetter<string>, lang: MaybeRefOrGetter<CodeLang>) {
  const highlighter = shallowRef<HighlighterCore | null>(null)
  onMounted(async () => {
    highlighter.value = await getHighlighter()
  })

  const html = computed(() => {
    const h = highlighter.value
    const src = toValue(code)
    if (!h || !src) return null // no highlighter yet, or highlighting disabled for this input
    try {
      return h.codeToHtml(src, { lang: toValue(lang), theme: THEME })
    } catch {
      return null // fall back to the plain <pre>
    }
  })

  return { html }
}
