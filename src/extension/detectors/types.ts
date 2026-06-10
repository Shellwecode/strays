// Detector contract (CLAUDE.md): detect() reports whether the lobby is
// active and where the dead space is. Driven by a MutationObserver in
// content.ts.

export interface Detection {
  active: boolean
  deadSpaceRect: DOMRect | null
}

export interface Detector {
  detect(): Detection
}

// MVP placement: fixed strip along the bottom of the viewport. Measuring
// true empty regions per-site is post-MVP.
export const DEAD_STRIP_H = 160

export function bottomStrip(): DOMRect {
  return new DOMRect(
    0,
    Math.max(0, window.innerHeight - DEAD_STRIP_H),
    window.innerWidth,
    DEAD_STRIP_H,
  )
}

export function findTextNode(re: RegExp): Text | null {
  if (!document.body) return null
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node.nodeValue
      if (!t || !re.test(t)) return NodeFilter.FILTER_SKIP
      const el = node.parentElement
      if (!el || el.closest('script, style, noscript')) return NodeFilter.FILTER_SKIP
      if (el.getClientRects().length === 0) return NodeFilter.FILTER_SKIP // hidden template
      return NodeFilter.FILTER_ACCEPT
    },
  })
  return walker.nextNode() as Text | null
}
