// Google Meet lobby detector: the "Ready to join?" pre-join panel and the
// "Asking to be let in" wait state. Meet renders in the top frame.

import { bottomStrip, findTextNode, type Detection, type Detector } from './types'

const WAITING_RE = /ready to join\?|asking to be let in|will let you in soon|waiting for (the )?host/i

export const meetDetector: Detector = {
  detect(): Detection {
    if (!findTextNode(WAITING_RE)) return { active: false, deadSpaceRect: null }
    return { active: true, deadSpaceRect: bottomStrip() }
  },
}
