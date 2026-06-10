// Generates assets/sesame.png — the cat sprite sheet — with zero dependencies.
// An Aseprite export with the same frame layout can replace it any time.
//
// Sheet layout: 12 frames of 32x32 in one row, feet-center at (16, 30):
//   0,1   sit (idle breathing pair, eyes open, no pupils — renderer overlays them)
//   2     sit blink
//   3-6   walk (pupils baked)
//   7,8   sleep (breathing pair)
//   9-11  wake-stretch
//   12,13 yawn (small, wide)
//   14-17 roll (side, back, back-wiggle, side)
//   18,19 eat (head down, nibble)
// The awake tail is NOT in the sheet — the renderer draws it procedurally so
// it can sway continuously. Sleep frames include the tucked tail.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRAME_W = 32
const FRAME_H = 32
const FRAMES = 20
const ORIGIN_X = 16 // feet center within a frame
const ORIGIN_Y = 30

// Palette: cool grey-brown tabby saddle over white (bicolor), amber eyes,
// pink accent. White covers chest, belly, legs, muzzle, lower cheeks and a
// blaze up between the eyes; the tabby is the back, tail, ears and eye mask.
const TABBY = hex('#6c6459')
const TABBY_DARK = hex('#4b453d')
const CREAM = hex('#efe9df')
const EYE = hex('#d2a94e')
const PUPIL = hex('#2b2118')
const PINK = hex('#e9a9b2')
const EYELID = hex('#3f352b')

function hex(s) {
  return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
}

const SHEET_W = FRAME_W * FRAMES
const img = new Uint8Array(SHEET_W * FRAME_H * 4) // transparent RGBA

// Paint a rect in cat-local coords: origin at feet center, y negative = up.
function rect(frame, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const px = ORIGIN_X + xx
      const py = ORIGIN_Y + yy
      if (px < 0 || px >= FRAME_W || py < 0 || py >= FRAME_H) {
        throw new Error(`frame ${frame}: pixel (${xx},${yy}) out of bounds`)
      }
      const i = ((py * SHEET_W) + frame * FRAME_W + px) * 4
      img[i] = c[0]
      img[i + 1] = c[1]
      img[i + 2] = c[2]
      img[i + 3] = 255
    }
  }
}

// ---- poses ------------------------------------------------------------

// Sitting: rear mound, upright chest column with white bib, head on top.
// breath=1 lowers the mound a hair (exhale). Diamond face: narrow forehead,
// wide cheeks, narrow muzzle. Big ears.
function sit(f, { breath = 0, eyes = 'open' } = {}) {
  rect(f, -11, -11 + breath, 13, 11 - breath, TABBY) // rear mound (saddle)
  rect(f, -9, -11 + breath, 2, 4, TABBY_DARK) // mound stripes
  rect(f, -5, -11 + breath, 2, 4, TABBY_DARK)
  rect(f, -1, -11 + breath, 2, 4, TABBY_DARK)
  rect(f, -11, -3 + breath, 4, 3 - breath, CREAM) // white rear paw/flank
  rect(f, 0, -15, 9, 15, CREAM) // chest column + front legs: all white

  rect(f, 3, -25, 10, 3, TABBY) // forehead
  rect(f, 1, -22, 14, 4, TABBY) // eye mask band
  rect(f, 1, -18, 14, 1, CREAM) // white lower cheeks
  rect(f, 4, -17, 9, 3, CREAM) // white muzzle + chin
  rect(f, 1, -30, 5, 6, TABBY) // big ears
  rect(f, 10, -30, 5, 6, TABBY)
  rect(f, 5, -25, 1, 2, TABBY_DARK) // forehead stripes
  rect(f, 7, -25, 1, 3, TABBY_DARK)
  rect(f, 9, -25, 1, 2, TABBY_DARK)
  rect(f, 8, -24, 2, 6, CREAM) // blaze up between the eyes
  rect(f, 3, -29, 2, 3, PINK) // inner ears
  rect(f, 12, -29, 2, 3, PINK)
  rect(f, 8, -17, 2, 1, PINK) // nose at the blaze bottom

  if (eyes === 'open') {
    rect(f, 5, -22, 3, 4, EYE)
    rect(f, 10, -22, 3, 4, EYE)
  } else {
    rect(f, 5, -20, 3, 1, EYELID)
    rect(f, 10, -20, 3, 1, EYELID)
  }
}

// Standing/walking: four legs, long body, head forward. Pupils baked.
const LEG_XS = [-10, -5, 3, 8]
const GAIT_LIFTS = [
  [1, 0, 0, 1],
  [0, 0, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
]
function walk(f, step) {
  const lifts = GAIT_LIFTS[step]
  const bob = step % 2 === 1 ? 1 : 0
  for (let i = 0; i < 4; i++) {
    rect(f, LEG_XS[i], -4 - lifts[i], 3, 4, CREAM) // white legs
  }
  rect(f, -12, -13 - bob, 24, 10, TABBY) // body (saddle)
  rect(f, -9, -13 - bob, 2, 4, TABBY_DARK) // back stripes
  rect(f, -4, -13 - bob, 2, 5, TABBY_DARK)
  rect(f, 1, -13 - bob, 2, 4, TABBY_DARK)
  rect(f, -12, -6 - bob, 24, 3, CREAM) // white belly, riding high
  rect(f, -12, -8 - bob, 4, 5, CREAM) // white rear flank
  rect(f, 8, -13 - bob, 4, 10, CREAM) // white chest up to the chin

  const hy = -23 - bob
  rect(f, 4, hy, 10, 3, TABBY) // forehead
  rect(f, 2, hy + 3, 14, 4, TABBY) // eye mask band
  rect(f, 2, hy + 7, 14, 1, CREAM) // white lower cheeks
  rect(f, 5, hy + 8, 9, 3, CREAM) // white muzzle + chin
  rect(f, 2, hy - 5, 5, 6, TABBY) // big ears
  rect(f, 11, hy - 5, 5, 6, TABBY)
  rect(f, 6, hy, 1, 2, TABBY_DARK) // forehead stripes
  rect(f, 8, hy, 1, 3, TABBY_DARK)
  rect(f, 10, hy, 1, 2, TABBY_DARK)
  rect(f, 9, hy + 1, 2, 6, CREAM) // blaze up between the eyes
  rect(f, 4, hy - 4, 2, 3, PINK) // inner ears
  rect(f, 13, hy - 4, 2, 3, PINK)
  rect(f, 9, hy + 8, 2, 1, PINK) // nose at the blaze bottom
  rect(f, 6, hy + 3, 3, 4, EYE)
  rect(f, 11, hy + 3, 3, 4, EYE)
  rect(f, 7, hy + 4, 1, 2, PUPIL)
  rect(f, 12, hy + 4, 1, 2, PUPIL)
}

// Sleeping loaf, tail tucked with rings. up=1 is the inhale frame.
function sleep(f, up) {
  rect(f, -13, -10 - up, 26, 10 + up, TABBY) // loaf body
  rect(f, -10, -10 - up, 2, 4, TABBY_DARK) // back stripes
  rect(f, -5, -10 - up, 2, 5, TABBY_DARK)
  rect(f, 0, -10 - up, 2, 4, TABBY_DARK)
  rect(f, 9, -2, 6, 2, TABBY) // tucked tail
  rect(f, 10, -2, 2, 2, TABBY_DARK) // ring
  rect(f, 13, -2, 2, 2, TABBY_DARK) // dark tip
  rect(f, 4, -6, 5, 6, CREAM) // white chest/paws tucked at the front
  rect(f, 1, -16 - up, 14, 9, TABBY) // head resting low
  rect(f, 1, -20 - up, 5, 4, TABBY) // big ears
  rect(f, 10, -20 - up, 5, 4, TABBY)
  rect(f, 1, -11 - up, 14, 4, CREAM) // white lower face + chin
  rect(f, 6, -15 - up, 2, 4, CREAM) // blaze
  rect(f, 3, -19 - up, 2, 2, PINK) // inner ears
  rect(f, 12, -19 - up, 2, 2, PINK)
  rect(f, 6, -11 - up, 2, 1, PINK) // nose
  rect(f, 3, -12 - up, 3, 1, EYELID) // closed eyes
  rect(f, 9, -12 - up, 3, 1, EYELID)
}

// Wake-stretch 1/3: still loafed but head up, eyes shut.
function stretchA(f) {
  rect(f, -13, -10, 26, 10, TABBY)
  rect(f, -10, -10, 2, 4, TABBY_DARK)
  rect(f, -5, -10, 2, 5, TABBY_DARK)
  rect(f, 0, -10, 2, 4, TABBY_DARK)
  rect(f, 9, -2, 6, 2, TABBY)
  rect(f, 10, -2, 2, 2, TABBY_DARK)
  rect(f, 13, -2, 2, 2, TABBY_DARK)
  rect(f, 4, -6, 5, 6, CREAM) // white chest/paws tucked at the front
  rect(f, 3, -20, 10, 3, TABBY) // forehead
  rect(f, 1, -17, 14, 4, TABBY) // eye mask band
  rect(f, 1, -13, 14, 3, CREAM) // white lower face + chin
  rect(f, 0, -25, 5, 6, TABBY) // ears
  rect(f, 9, -25, 5, 6, TABBY)
  rect(f, 6, -19, 2, 5, CREAM) // blaze
  rect(f, 2, -24, 2, 3, PINK)
  rect(f, 11, -24, 2, 3, PINK)
  rect(f, 6, -13, 2, 1, PINK) // nose
  rect(f, 3, -16, 3, 1, EYELID)
  rect(f, 9, -16, 3, 1, EYELID)
}

// Wake-stretch 2/3: the classic — front paws forward and low, butt up.
function stretchB(f) {
  rect(f, 8, -3, 7, 3, CREAM) // front paws stretched forward
  rect(f, -10, -6, 3, 6, CREAM) // white rear legs
  rect(f, -5, -6, 3, 6, CREAM)
  rect(f, -12, -16, 8, 13, TABBY) // butt high
  rect(f, -10, -16, 2, 4, TABBY_DARK)
  rect(f, -6, -14, 2, 5, TABBY_DARK)
  rect(f, -5, -12, 8, 9, TABBY) // mid slope
  rect(f, 2, -9, 7, 6, CREAM) // chest low: white
  rect(f, -12, -5, 12, 2, CREAM) // belly
  rect(f, 5, -16, 9, 3, TABBY) // forehead
  rect(f, 3, -13, 12, 4, TABBY) // eye mask band
  rect(f, 3, -9, 12, 1, CREAM) // white lower face
  rect(f, 4, -20, 4, 4, TABBY) // ears
  rect(f, 11, -20, 4, 4, TABBY)
  rect(f, 8, -15, 2, 5, CREAM) // blaze
  rect(f, 5, -19, 2, 2, PINK)
  rect(f, 12, -19, 2, 2, PINK)
  rect(f, 8, -8, 6, 2, CREAM) // white chin
  rect(f, 8, -9, 2, 1, PINK) // nose
  rect(f, 5, -11, 3, 1, EYELID)
  rect(f, 11, -11, 3, 1, EYELID)
}

// Yawn: sit pose, eyes squeezed shut, mouth open. wide=1 is the big yawn.
function yawn(f, wide) {
  sit(f, { breath: 0, eyes: 'closed' })
  if (wide) {
    rect(f, 7, -16, 4, 2, EYELID) // mouth wide open
    rect(f, 8, -15, 2, 1, PINK)
  } else {
    rect(f, 8, -15, 3, 1, EYELID) // mouth ajar
  }
}

// Roll 1/3 (and 4/4): curled on its side, paws out front.
function rollSide(f) {
  rect(f, -12, -10, 22, 10, TABBY) // body on its side
  rect(f, -10, -10, 2, 4, TABBY_DARK)
  rect(f, -5, -10, 2, 5, TABBY_DARK)
  rect(f, 0, -10, 2, 4, TABBY_DARK)
  rect(f, -12, -4, 22, 4, CREAM) // white underside showing
  rect(f, 6, -14, 10, 8, TABBY) // head tucked toward belly
  rect(f, 6, -17, 4, 4, TABBY) // ears
  rect(f, 11, -17, 4, 4, TABBY)
  rect(f, 6, -10, 10, 4, CREAM) // white lower face
  rect(f, 7, -16, 2, 2, PINK)
  rect(f, 12, -16, 2, 2, PINK)
  rect(f, 12, -6, 3, 2, CREAM) // front paws out
  rect(f, 12, -3, 3, 2, CREAM)
  rect(f, 8, -11, 3, 1, EYELID) // happy shut eyes
  rect(f, 12, -11, 3, 1, EYELID)
  rect(f, 14, -9, 2, 1, PINK) // nose
}

// Roll 2/3 and 3/3: belly up, paws in the air. wiggle staggers the paws.
function rollBack(f, wiggle) {
  rect(f, -12, -8, 24, 8, TABBY) // body on its back
  rect(f, -8, -8, 16, 4, CREAM) // belly up
  const paws = wiggle
    ? [
        [-9, -13, 3, 5],
        [-4, -11, 3, 3],
        [2, -13, 3, 5],
        [7, -11, 3, 3],
      ]
    : [
        [-9, -12, 3, 4],
        [-4, -12, 3, 4],
        [2, -12, 3, 4],
        [7, -12, 3, 4],
      ]
  for (const [x, y, w, h] of paws) rect(f, x, y, w, h, CREAM)
  rect(f, 9, -13, 7, 7, TABBY) // head lolling to the side
  rect(f, 9, -15, 3, 2, TABBY) // ears
  rect(f, 13, -15, 3, 2, TABBY)
  rect(f, 9, -8, 7, 2, CREAM) // white chin
  rect(f, 10, -10, 3, 1, EYELID) // content shut eyes
  rect(f, 14, -8, 1, 1, PINK) // nose
}

// Eat: standing, head down to the floor, nibbling. down=1 dips the head.
function eat(f, down) {
  for (const x of LEG_XS) rect(f, x, -4, 3, 4, CREAM) // paws planted
  rect(f, -12, -13, 24, 10, TABBY) // body
  rect(f, -9, -13, 2, 4, TABBY_DARK)
  rect(f, -4, -13, 2, 5, TABBY_DARK)
  rect(f, 1, -13, 2, 4, TABBY_DARK)
  rect(f, -12, -6, 24, 3, CREAM) // white belly, riding high
  rect(f, -12, -8, 4, 5, CREAM) // white rear flank
  const hy = -12 + down // head lowered to the ground
  rect(f, 8, hy, 8, 3, TABBY) // forehead (tilted down)
  rect(f, 6, hy + 3, 10, 4, TABBY) // eye mask band
  rect(f, 6, hy + 7, 10, 1, CREAM) // white lower face
  rect(f, 7, hy - 4, 4, 4, TABBY) // ears swept back
  rect(f, 12, hy - 4, 4, 4, TABBY)
  rect(f, 8, hy - 3, 2, 2, PINK)
  rect(f, 13, hy - 3, 2, 2, PINK)
  rect(f, 11, hy + 8, 4, 2 - down, CREAM) // muzzle at the floor
  rect(f, 13, hy + 8, 2, 1, PINK) // nose
  rect(f, 7, hy + 4, 2, 2, EYE) // eyes looking down
  rect(f, 12, hy + 4, 2, 2, EYE)
  rect(f, 8, hy + 5, 1, 1, PUPIL)
  rect(f, 13, hy + 5, 1, 1, PUPIL)
  rect(f, 13, -2, 3, 1, TABBY_DARK) // kibble crumbs on the floor
}

// ---- assemble the sheet ------------------------------------------------

sit(0, { breath: 0, eyes: 'open' })
sit(1, { breath: 1, eyes: 'open' })
sit(2, { breath: 0, eyes: 'closed' }) // blink
walk(3, 0)
walk(4, 1)
walk(5, 2)
walk(6, 3)
sleep(7, 0)
sleep(8, 1)
stretchA(9)
stretchB(10)
sit(11, { breath: 0, eyes: 'closed' }) // settling back after the stretch
yawn(12, 0)
yawn(13, 1)
rollSide(14)
rollBack(15, 0)
rollBack(16, 1)
rollSide(17)
eat(18, 0)
eat(19, 1)

// ---- minimal PNG encoder ------------------------------------------------

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0 // filter: none
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, row + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(join(repoRoot, 'assets'), { recursive: true })
const out = join(repoRoot, 'assets', 'sesame.png')
writeFileSync(out, encodePng(SHEET_W, FRAME_H, img))
console.log(`wrote ${out} (${SHEET_W}x${FRAME_H}, ${FRAMES} frames)`)
