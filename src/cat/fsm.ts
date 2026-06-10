// Every animation/behavior timing lives here so tuning is one file.

export const BLINK_MIN_MS = 2000
export const BLINK_MAX_MS = 5500
export const BLINK_MS = 140
export const TAIL_SWAY_HZ = 2.2
export const GAZE_RANGE_PX = 130

export const WANDER_DECIDE_MIN_MS = 2000
export const WANDER_DECIDE_MAX_MS = 6000
export const WANDER_CHANCE = 0.55
export const ROLL_CHANCE = 0.1 // rolled on the same decide timer, after wander
export const EAT_CHANCE = 0.08
export const WANDER_SPEED_PX_S = 42
export const WANDER_MIN_DIST_PX = 60
export const WANDER_MARGIN_PX = 40
export const GAIT_FRAME_MS = 140

export const SLEEP_AFTER_MS = 15_000
export const WAKE_RADIUS_PX = 60
export const WAKE_STRETCH_MS = 600
export const BREATHE_HZ = 1.6
export const BREATHE_AMP = 0.025

export const PET_MS = 900
export const YAWN_MS = 900 // plays on the way into sleep
export const ROLL_MS = 1600
export const EAT_MS = 2200

// EXIT_FADE_MS = 200 is a design decision, not a magic number. Do not "improve" the exit.
export const EXIT_FADE_MS = 200

// Hit box in css px, slightly generous around the drawn cat (3x scale).
export const CAT_W = 90
export const CAT_H = 92

export type CatState = 'idle' | 'wander' | 'sleep' | 'pet' | 'yawn' | 'roll' | 'eat' | 'gone'

export interface Fsm {
  state: CatState
  stateT: number // ms in current state
  x: number // cat center x, css px
  groundY: number // baseline the feet stand on, css px
  facing: 1 | -1
  targetX: number
  sincePointerMs: number
  wanderDecideInMs: number
  blinkInMs: number // countdown to next blink
  blinkLeftMs: number // >0 while eyelids are closed
  stretchLeftMs: number // >0 while the wake-stretch plays
  gaitT: number
  pointer: { x: number; y: number; active: boolean }
  justPet: boolean // one-frame flag; renderer consumes it to spawn hearts
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)

export function createFsm(width: number, groundY: number): Fsm {
  return {
    state: 'idle',
    stateT: 0,
    x: width / 2,
    groundY,
    facing: 1,
    targetX: width / 2,
    sincePointerMs: 0,
    wanderDecideInMs: rand(WANDER_DECIDE_MIN_MS, WANDER_DECIDE_MAX_MS),
    blinkInMs: rand(BLINK_MIN_MS, BLINK_MAX_MS),
    blinkLeftMs: 0,
    stretchLeftMs: 0,
    gaitT: 0,
    pointer: { x: -9999, y: -9999, active: false },
    justPet: false,
  }
}

function setState(f: Fsm, s: CatState): void {
  f.state = s
  f.stateT = 0
  if (s === 'idle') f.wanderDecideInMs = rand(WANDER_DECIDE_MIN_MS, WANDER_DECIDE_MAX_MS)
  if (s === 'wander') f.gaitT = 0
}

function pickTarget(f: Fsm, width: number): number {
  const lo = Math.min(WANDER_MARGIN_PX, width / 2)
  const hi = Math.max(width - WANDER_MARGIN_PX, width / 2)
  for (let i = 0; i < 4; i++) {
    const t = rand(lo, hi)
    if (Math.abs(t - f.x) >= WANDER_MIN_DIST_PX) return t
  }
  return Math.max(lo, Math.min(hi, f.x + (f.x < width / 2 ? 1 : -1) * WANDER_MIN_DIST_PX))
}

export function update(f: Fsm, dt: number, width: number): void {
  if (f.state === 'gone') return
  f.stateT += dt
  f.sincePointerMs += dt
  if (f.stretchLeftMs > 0) f.stretchLeftMs = Math.max(0, f.stretchLeftMs - dt)

  // Blink runs in every awake state.
  if (f.state !== 'sleep') {
    if (f.blinkLeftMs > 0) {
      f.blinkLeftMs = Math.max(0, f.blinkLeftMs - dt)
    } else {
      f.blinkInMs -= dt
      if (f.blinkInMs <= 0) {
        f.blinkLeftMs = BLINK_MS
        f.blinkInMs = rand(BLINK_MIN_MS, BLINK_MAX_MS)
      }
    }
  }

  switch (f.state) {
    case 'idle': {
      if (f.sincePointerMs >= SLEEP_AFTER_MS) {
        setState(f, 'yawn') // yawn, then settle into sleep
        break
      }
      f.wanderDecideInMs -= dt
      if (f.wanderDecideInMs <= 0) {
        f.wanderDecideInMs = rand(WANDER_DECIDE_MIN_MS, WANDER_DECIDE_MAX_MS)
        const r = Math.random()
        if (r < WANDER_CHANCE) {
          f.targetX = pickTarget(f, width)
          f.facing = f.targetX >= f.x ? 1 : -1
          setState(f, 'wander')
        } else if (r < WANDER_CHANCE + ROLL_CHANCE) {
          setState(f, 'roll')
        } else if (r < WANDER_CHANCE + ROLL_CHANCE + EAT_CHANCE) {
          setState(f, 'eat')
        }
      }
      break
    }
    case 'yawn': {
      if (f.stateT >= YAWN_MS) {
        // a pointer move mid-yawn cancels the nap
        setState(f, f.sincePointerMs >= SLEEP_AFTER_MS ? 'sleep' : 'idle')
      }
      break
    }
    case 'roll': {
      if (f.stateT >= ROLL_MS) setState(f, 'idle')
      break
    }
    case 'eat': {
      if (f.stateT >= EAT_MS) setState(f, 'idle')
      break
    }
    case 'wander': {
      f.gaitT += dt
      const step = (WANDER_SPEED_PX_S * dt) / 1000
      const dx = f.targetX - f.x
      if (Math.abs(dx) <= step) {
        f.x = f.targetX
        setState(f, 'idle')
      } else {
        f.x += Math.sign(dx) * step
      }
      break
    }
    case 'sleep':
      // Waking is event-driven (pointerMove/click) so a cursor parked
      // nearby before sleep doesn't flap the state every frame.
      break
    case 'pet': {
      if (f.stateT >= PET_MS) setState(f, 'idle')
      break
    }
  }
}

export function pointerMove(f: Fsm, x: number, y: number): void {
  f.pointer.x = x
  f.pointer.y = y
  f.pointer.active = true
  f.sincePointerMs = 0
  if (f.state === 'sleep') {
    const cy = f.groundY - CAT_H / 2
    if (Math.hypot(x - f.x, y - cy) <= WAKE_RADIUS_PX) {
      f.stretchLeftMs = WAKE_STRETCH_MS
      setState(f, 'idle')
    }
  }
}

export function pointerGone(f: Fsm): void {
  f.pointer.active = false
}

export function click(f: Fsm, hitCat: boolean): void {
  if (f.state === 'gone') return
  f.sincePointerMs = 0
  if (hitCat) {
    f.justPet = true
    setState(f, 'pet')
  } else if (f.state === 'sleep') {
    f.stretchLeftMs = WAKE_STRETCH_MS
    setState(f, 'idle')
  }
}

export function setGone(f: Fsm): void {
  setState(f, 'gone')
}

export function bbox(f: Fsm): { x: number; y: number; w: number; h: number } {
  return { x: f.x - CAT_W / 2, y: f.groundY - CAT_H, w: CAT_W, h: CAT_H }
}
