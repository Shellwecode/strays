// Zoom waiting-room detector. Contract (CLAUDE.md): detect() reports whether
// the lobby is active and where the dead space is. Driven externally by a
// MutationObserver in content.ts.

export interface Detection {
  active: boolean
  deadSpaceRect: DOMRect | null
}

export interface Detector {
  detect(): Detection
}

// Tolerant of Zoom's wording variants ("the host" / "host", "this meeting").
const WAITING_RE = /waiting for (the )?host to start/i

// MVP placement: fixed strip along the bottom of the viewport. Measuring
// true empty regions per-site is post-MVP.
const DEAD_STRIP_H = 160

function findWaitingTextNode(): Text | null {
  if (!document.body) return null
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node.nodeValue
      if (!t || !WAITING_RE.test(t)) return NodeFilter.FILTER_SKIP
      const el = node.parentElement
      if (!el || el.closest('script, style, noscript')) return NodeFilter.FILTER_SKIP
      if (el.getClientRects().length === 0) return NodeFilter.FILTER_SKIP // hidden template
      return NodeFilter.FILTER_ACCEPT
    },
  })
  return walker.nextNode() as Text | null
}

export const zoomDetector: Detector = {
  detect(): Detection {
    if (!findWaitingTextNode()) return { active: false, deadSpaceRect: null }
    return {
      active: true,
      deadSpaceRect: new DOMRect(
        0,
        Math.max(0, window.innerHeight - DEAD_STRIP_H),
        window.innerWidth,
        DEAD_STRIP_H,
      ),
    }
  },
}
