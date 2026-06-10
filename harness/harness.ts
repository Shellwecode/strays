// Mounts the cat into a lobby page's #dead-space and shows a debug panel
// (FSM state, elapsed wait, timers) plus despawn/respawn controls.

import { createCat, type CatHandle } from '../src/cat/mount'
import { SLEEP_AFTER_MS } from '../src/cat/fsm'

const container = document.getElementById('dead-space')
if (!container) {
  throw new Error('harness: lobby page is missing #dead-space')
}

let cat: CatHandle | null = createCat(container)
let mountedAt = performance.now()

const panel = document.createElement('div')
panel.style.cssText = [
  'position: fixed',
  'top: 12px',
  'right: 12px',
  'z-index: 9999',
  'background: rgba(20, 22, 26, 0.88)',
  'color: #cfd6dd',
  'font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace',
  'padding: 10px 12px',
  'border-radius: 8px',
  'min-width: 220px',
  'pointer-events: auto',
].join(';')

const readout = document.createElement('pre')
readout.style.cssText = 'margin: 0 0 8px 0; font: inherit'
panel.appendChild(readout)

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = label
  b.style.cssText = [
    'display: block',
    'width: 100%',
    'margin-top: 4px',
    'padding: 5px 8px',
    'border: 1px solid #3a3f47',
    'border-radius: 6px',
    'background: #262a31',
    'color: #cfd6dd',
    'font: inherit',
    'cursor: pointer',
    'text-align: left',
  ].join(';')
  b.addEventListener('click', onClick)
  panel.appendChild(b)
  return b
}

const despawnBtn = button('host starts meeting (despawn)', () => {
  if (!cat) return
  void cat.destroy({ fade: true })
  cat = null
})
button('respawn', () => {
  if (cat) return
  cat = createCat(container)
  mountedAt = performance.now()
})

document.body.appendChild(panel)

function fmt(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

function tick(): void {
  if (cat) {
    const f = cat.inspect()
    const sleepIn = f.state === 'gone' ? 0 : Math.max(0, SLEEP_AFTER_MS - f.sincePointerMs)
    readout.textContent = [
      `state     ${f.state}`,
      `in state  ${fmt(f.stateT)}`,
      `waited    ${fmt(performance.now() - mountedAt)}`,
      `sleep in  ${f.state === 'sleep' ? '—' : fmt(sleepIn)}`,
      `x         ${Math.round(f.x)} → ${Math.round(f.targetX)}`,
    ].join('\n')
    despawnBtn.disabled = false
  } else {
    readout.textContent = 'state     (unmounted)'
    despawnBtn.disabled = true
  }
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
