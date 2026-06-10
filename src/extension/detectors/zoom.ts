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

// Two distinct Zoom lobby flows, wording confirmed against the real client:
// - host hasn't started:  "Waiting for the host to start this meeting"
// - waiting room (admit): "The host will let you in soon." /
//                         "The host will admit you when they're ready"
const WAITING_RE = /waiting for (the )?host to start|host will (admit you|let you in)/i

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

// Zoom's PWA shell (app.zoom.us) repeats the waiting text in its meeting
// card while the real lobby lives in a "webclient" iframe. With all_frames
// the script runs in both; the shell defers to the inner frame so exactly
// one cat spawns.
function hasWebclientChildFrame(): boolean {
  for (const frame of document.querySelectorAll('iframe')) {
    const name = frame.getAttribute('name') ?? ''
    const src = frame.getAttribute('src') ?? ''
    if (name.includes('webclient') || src.includes('webclient') || src.includes('/wc/')) {
      return true
    }
  }
  return false
}

export const zoomDetector: Detector = {
  detect(): Detection {
    if (hasWebclientChildFrame() || !findWaitingTextNode()) {
      return { active: false, deadSpaceRect: null }
    }
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
