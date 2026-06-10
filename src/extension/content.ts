// Content script: watches the lobby with a MutationObserver, mounts the cat
// in a closed shadow DOM, and enforces the exit rule — the most important
// code in this repo. Detector flips inactive -> 200ms fade -> unmount and
// disconnect everything. No end card, no message, no sound.

import { createCat, type CatHandle } from '../cat/mount'
import { zoomDetector } from './detectors/zoom'
import { meetDetector } from './detectors/meet'
import type { Detector } from './detectors/types'

const DEBOUNCE_MS = 300 // SPA re-renders must not double-spawn or flap
const POLL_MS = 1500 // safety net for changes the observer can miss
const MIN_DETECT_GAP_MS = 100 // don't walk the DOM 60x/s during mutation storms

function pickDetector(): Detector | null {
  if (/(^|\.)zoom\.us$/.test(location.hostname)) return zoomDetector
  if (location.hostname === 'meet.google.com') return meetDetector
  return null
}

function run(detector: Detector): void {
  let cat: CatHandle | null = null
  let container: HTMLDivElement | null = null
  let confirmTimer: number | null = null
  // performance.now() can be < MIN_DETECT_GAP_MS in a fresh iframe; seed so
  // the initial check is never throttled away.
  let lastDetect = -MIN_DETECT_GAP_MS

  const observer = new MutationObserver(onSignal)
  const poll = window.setInterval(onSignal, POLL_MS)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // SPAs mutate constantly, so a trailing debounce that re-arms per mutation
  // would never fire. Instead: when detection disagrees with the mounted
  // state, start a 300ms confirmation timer; cancel it if detection agrees
  // again before it fires. Flapping cancels itself, storms are ignored.
  function onSignal(): void {
    const now = performance.now()
    if (now - lastDetect < MIN_DETECT_GAP_MS) return // poll will re-check
    lastDetect = now
    const active = detector.detect().active
    const applied = cat !== null
    if (active === applied) {
      if (confirmTimer !== null) {
        window.clearTimeout(confirmTimer)
        confirmTimer = null
      }
      return
    }
    if (confirmTimer === null) {
      confirmTimer = window.setTimeout(confirm, DEBOUNCE_MS)
    }
  }

  function confirm(): void {
    confirmTimer = null
    const d = detector.detect()
    if (d.active && !cat) mount(d.deadSpaceRect)
    else if (!d.active && cat) void unmountAndDisconnect()
  }

  function mount(rect: DOMRect | null): void {
    if (!rect) return
    container = document.createElement('div')
    container.style.cssText = [
      'position: fixed',
      'left: 0',
      'right: 0',
      'bottom: 24px', // keep the cat off footer/copyright text
      `height: ${Math.round(rect.height)}px`,
      'pointer-events: none', // never steal a click from the lobby UI
      'z-index: 2147483000',
    ].join(';')
    // Closed shadow DOM so neither side's CSS leaks.
    const shadow = container.attachShadow({ mode: 'closed' })
    const host = document.createElement('div')
    host.style.cssText = 'position: relative; width: 100%; height: 100%;'
    shadow.appendChild(host)
    document.body.appendChild(container)
    cat = createCat(host)
  }

  async function unmountAndDisconnect(): Promise<void> {
    const c = cat
    cat = null
    observer.disconnect()
    window.clearInterval(poll)
    if (confirmTimer !== null) window.clearTimeout(confirmTimer)
    if (c) await c.destroy({ fade: true }) // 200ms opacity fade (EXIT_FADE_MS)
    container?.remove()
    container = null
  }

  onSignal()
}

declare global {
  interface Window {
    __greenroomLoaded?: true
  }
}

if (!window.__greenroomLoaded) {
  window.__greenroomLoaded = true
  const detector = pickDetector()
  if (detector) run(detector)
}
