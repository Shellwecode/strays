// Pointer proximity + click hit-testing. Listeners go on the document so the
// cat's eyes can follow the cursor anywhere in the lobby, and so the canvas
// itself stays pointer-events: none (clicks never get stolen from lobby UI).

import { bbox, click, pointerGone, pointerMove, type Fsm } from './fsm'

export function hitTest(f: Fsm, x: number, y: number): boolean {
  const b = bbox(f)
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
}

export function attachInput(target: Document, canvas: HTMLCanvasElement, f: Fsm): () => void {
  const local = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onMove = (e: Event): void => {
    const p = local(e as PointerEvent)
    pointerMove(f, p.x, p.y)
  }
  const onDown = (e: Event): void => {
    const p = local(e as PointerEvent)
    click(f, hitTest(f, p.x, p.y))
  }
  const onLeave = (): void => pointerGone(f)

  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerdown', onDown)
  target.addEventListener('pointerleave', onLeave)
  return () => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerdown', onDown)
    target.removeEventListener('pointerleave', onLeave)
  }
}
