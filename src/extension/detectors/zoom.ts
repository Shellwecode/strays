// Zoom lobby detector, wording confirmed against the real client:
// - host hasn't started:  "Waiting for the host to start this meeting"
// - waiting room (admit): "The host will let you in soon." /
//                         "The host will admit you when they're ready"

import { bottomStrip, findTextNode, type Detection, type Detector } from './types'

const WAITING_RE = /waiting for (the )?host to start|host will (admit you|let you in)/i

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
    if (hasWebclientChildFrame() || !findTextNode(WAITING_RE)) {
      return { active: false, deadSpaceRect: null }
    }
    return { active: true, deadSpaceRect: bottomStrip() }
  },
}
