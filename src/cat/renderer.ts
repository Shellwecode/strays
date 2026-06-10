// Draws the cat by blitting sprite-sheet frames at 2x integer scale.
// Procedural layers on top: swaying tail (so it moves continuously), pupil
// overlay on the sit frames (eyes track the cursor), pet squish, hearts,
// sleep z's, and the ground shadow.

import {
  BREATHE_HZ,
  EAT_MS,
  GAIT_FRAME_MS,
  GAZE_RANGE_PX,
  PET_MS,
  ROLL_MS,
  TAIL_SWAY_HZ,
  WAKE_STRETCH_MS,
  YAWN_MS,
  type Fsm,
} from './fsm'
import {
  BLINK_FRAME,
  EAT_FRAMES,
  FRAME_H,
  FRAME_W,
  IDLE_FRAMES,
  IDLE_FRAME_MS,
  ORIGIN_X,
  ORIGIN_Y,
  ROLL_FRAMES,
  SIT_PUPILS,
  SLEEP_FRAMES,
  STRETCH_FRAMES,
  WALK_FRAMES,
  YAWN_FRAMES,
  loadSpriteSheet,
} from './sprites'

const U = 3 // pixel scale: 1 sprite pixel = 3 css px

// Only the procedural layers need colors; the rest live in the sheet.
const TABBY = '#6c6459'
const TABBY_DARK = '#4b453d'
const PUPIL = '#2b2118'
const PINK = '#e9a9b2'
const SHADOW = 'rgba(0, 0, 0, 0.07)'

interface Heart {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
}

export interface Renderer {
  draw(ctx: CanvasRenderingContext2D, f: Fsm, nowMs: number, dtMs: number): void
}

export function createRenderer(): Renderer {
  const sheet = loadSpriteSheet()
  let hearts: Heart[] = []

  function spawnHearts(f: Fsm): void {
    const n = 5 + (Math.random() < 0.5 ? 0 : 1)
    const hx = f.x + f.facing * 7 * U
    const hy = f.groundY - 26 * U
    for (let i = 0; i < n; i++) {
      hearts.push({
        x: hx + (Math.random() - 0.5) * 30,
        y: hy + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 26,
        vy: -(26 + Math.random() * 18),
        age: 0,
        life: 750 + Math.random() * 350,
      })
    }
  }

  function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    ctx.scale(U, U)
    ctx.globalAlpha = alpha
    ctx.fillStyle = PINK
    ctx.fillRect(1, 0, 2, 1)
    ctx.fillRect(4, 0, 2, 1)
    ctx.fillRect(0, 1, 7, 2)
    ctx.fillRect(1, 3, 5, 1)
    ctx.fillRect(2, 4, 3, 1)
    ctx.fillRect(3, 5, 1, 1)
    ctx.restore()
  }

  // Pupil nudge toward the cursor: ±1 sprite px, only within gaze range.
  function pupilOffset(f: Fsm): [number, number] {
    if (!f.pointer.active) return [0, 0]
    const ex = f.x + f.facing * 9 * U
    const ey = f.groundY - 20 * U
    const dx = f.pointer.x - ex
    const dy = f.pointer.y - ey
    if (Math.hypot(dx, dy) > GAZE_RANGE_PX) return [0, 0]
    // f.facing compensates for the horizontal flip of the drawing space.
    const px = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * f.facing
    const py = Math.abs(dy) < 6 ? 0 : Math.sign(dy)
    return [px, py]
  }

  function pickFrame(f: Fsm, nowMs: number): number {
    if (f.state === 'sleep') {
      const half = 1000 / BREATHE_HZ / 2
      return SLEEP_FRAMES[Math.floor(nowMs / half) % 2]
    }
    if (f.state === 'wander') {
      return WALK_FRAMES[Math.floor(f.gaitT / GAIT_FRAME_MS) % 4]
    }
    if (f.state === 'yawn') {
      const p = f.stateT / YAWN_MS
      return p < 0.25 || p > 0.8 ? YAWN_FRAMES[0] : YAWN_FRAMES[1]
    }
    if (f.state === 'roll') {
      return ROLL_FRAMES[Math.min(3, Math.floor((f.stateT / ROLL_MS) * 4))]
    }
    if (f.state === 'eat') {
      return EAT_FRAMES[Math.floor(f.stateT / (EAT_MS / 8)) % 2]
    }
    if (f.stretchLeftMs > 0) {
      const p = 1 - f.stretchLeftMs / WAKE_STRETCH_MS
      return STRETCH_FRAMES[Math.min(2, Math.floor(p * 3))]
    }
    if (f.blinkLeftMs > 0) return BLINK_FRAME
    return IDLE_FRAMES[Math.floor(nowMs / IDLE_FRAME_MS) % 2]
  }

  // Short raccoon tail, swaying around its attach point. Drawn behind the
  // sprite; sleep and roll frames carry their own pose.
  function drawTail(ctx: CanvasRenderingContext2D, f: Fsm, nowMs: number): void {
    const standing = f.state === 'wander' || f.state === 'eat'
    const [ax, ay] = standing ? [-12, -11] : [-11, -4]
    const angle = Math.sin((2 * Math.PI * TAIL_SWAY_HZ * nowMs) / 1000) * 0.35
    ctx.save()
    ctx.scale(U, U)
    ctx.translate(ax, ay)
    ctx.rotate(angle)
    ctx.fillStyle = TABBY
    ctx.fillRect(-7, -2, 7, 4)
    ctx.fillStyle = TABBY_DARK
    ctx.fillRect(-7, -2, 2, 4) // dark tip
    ctx.fillRect(-3, -2, 2, 4) // ring
    ctx.restore()
  }

  function drawZs(ctx: CanvasRenderingContext2D, f: Fsm, nowMs: number): void {
    const baseX = f.x + f.facing * 12 * U
    const baseY = f.groundY - 20 * U
    for (let i = 0; i < 3; i++) {
      const t = ((nowMs / 1000) * 0.45 + i / 3) % 1
      const a = Math.sin(Math.PI * t) * 0.65
      const x = baseX + f.facing * (6 + t * 16) + Math.sin(t * 7 + i) * 2
      const y = baseY - t * 26
      ctx.fillStyle = `rgba(110, 120, 132, ${a.toFixed(3)})`
      ctx.font = `${Math.round(8 + t * 6)}px ui-monospace, monospace`
      ctx.fillText('z', x, y)
    }
  }

  function draw(ctx: CanvasRenderingContext2D, f: Fsm, nowMs: number, dtMs: number): void {
    if (f.justPet) {
      spawnHearts(f)
      f.justPet = false
    }

    const sleeping = f.state === 'sleep'

    ctx.fillStyle = SHADOW
    ctx.beginPath()
    ctx.ellipse(f.x, f.groundY + 4, (sleeping ? 21 : 16) * U, 3.5 * U, 0, 0, Math.PI * 2)
    ctx.fill()

    // Pet squish is procedural; everything else is frames.
    let sx = 1
    let sy = 1
    if (f.state === 'pet') {
      const k = Math.sin(Math.PI * Math.min(1, f.stateT / PET_MS))
      sx = 1 + 0.1 * k
      sy = 1 - 0.16 * k
    }

    if (sheet.complete && sheet.naturalWidth > 0) {
      const frame = pickFrame(f, nowMs)
      ctx.save()
      ctx.translate(Math.round(f.x), f.groundY)
      ctx.scale(sx * f.facing, sy)
      if (!sleeping && f.state !== 'roll' && f.stretchLeftMs === 0) drawTail(ctx, f, nowMs)
      ctx.drawImage(
        sheet,
        frame * FRAME_W,
        0,
        FRAME_W,
        FRAME_H,
        -ORIGIN_X * U,
        -ORIGIN_Y * U,
        FRAME_W * U,
        FRAME_H * U,
      )
      if (IDLE_FRAMES.includes(frame)) {
        const [pdx, pdy] = pupilOffset(f)
        ctx.save()
        ctx.scale(U, U)
        ctx.fillStyle = PUPIL
        for (const [px, py] of SIT_PUPILS) {
          ctx.fillRect(px + pdx, py + pdy, 1, 2)
        }
        ctx.restore()
      }
      ctx.restore()
    }

    if (sleeping) drawZs(ctx, f, nowMs)

    hearts = hearts.filter((h) => h.age < h.life)
    for (const h of hearts) {
      h.age += dtMs
      h.x += (h.vx * dtMs) / 1000
      h.y += (h.vy * dtMs) / 1000
      drawHeart(ctx, h.x - 7, h.y - 6, Math.max(0, 1 - h.age / h.life))
    }
    ctx.globalAlpha = 1
  }

  return { draw }
}
