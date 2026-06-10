import { createFsm, setGone, update, EXIT_FADE_MS, type Fsm } from './fsm'
import { createRenderer } from './renderer'
import { attachInput } from './input'

const STRIP_H = 120 // canvas strip height along the container bottom
const GROUND_PAD = 12 // room under the feet for the shadow

export interface DestroyOpts {
  fade?: boolean // default true; false rips the cat out instantly
}

export interface CatHandle {
  destroy(opts?: DestroyOpts): Promise<void>
  inspect(): Readonly<Fsm> // for the harness debug panel
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('greenroom: 2d canvas unavailable')
  return ctx
}

export function createCat(container: HTMLElement): CatHandle {
  const doc = container.ownerDocument
  const canvas = doc.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.left = '0'
  canvas.style.bottom = '0'
  canvas.style.width = '100%'
  canvas.style.height = `${STRIP_H}px`
  canvas.style.pointerEvents = 'none'
  canvas.style.opacity = '1'
  canvas.style.transition = `opacity ${EXIT_FADE_MS}ms ease-out`
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }
  container.appendChild(canvas)

  const ctx = get2d(canvas)

  let cssW = 0
  function resize(): void {
    cssW = container.clientWidth
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(cssW * dpr))
    canvas.height = Math.round(STRIP_H * dpr)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(container)

  const fsm = createFsm(cssW, STRIP_H - GROUND_PAD)
  const renderer = createRenderer()
  const detachInput = attachInput(doc, canvas, fsm)

  let alive = true
  let raf = 0
  let last = performance.now()
  function frame(now: number): void {
    if (!alive) return
    const dt = Math.min(50, now - last) // clamp tab-switch jumps
    last = now
    update(fsm, dt, cssW)
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, STRIP_H)
    ctx.imageSmoothingEnabled = false
    renderer.draw(ctx, fsm, now, dt)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  let destroyed = false
  async function destroy(opts: DestroyOpts = {}): Promise<void> {
    if (destroyed) return
    destroyed = true
    setGone(fsm)
    if (opts.fade !== false) {
      canvas.style.opacity = '0'
      await new Promise((r) => setTimeout(r, EXIT_FADE_MS))
    }
    alive = false
    cancelAnimationFrame(raf)
    detachInput()
    ro.disconnect()
    canvas.remove()
  }

  return { destroy, inspect: () => fsm }
}
