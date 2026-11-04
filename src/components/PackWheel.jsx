import { useEffect, useRef, useState } from 'react'
import CardArt from './CardArt'

const VISIBLE = 4 // packs shown on each side of the front one

// A revolving wheel of a drop's sealed packs. `available` holds the pack indices still
// sealed (pack #1 is index 0); `selected` is the index at the front. Clicking the front
// pack calls onPick, so the wheel doubles as the "rip this one" control.
export default function PackWheel({ pack, available, selected, onSelect, onPick }) {
  const [spinning, setSpinning] = useState(false)
  const timers = useRef([])
  const drag = useRef(null)
  const lastWheel = useRef(0)
  const n = available.length
  const pos = Math.max(0, available.indexOf(selected))

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const step = (by) => {
    if (spinning || n === 0) return
    onSelect(available[(pos + by + n * 10) % n])
  }

  // Spin: tick through packs, slowing down, and land on a random one
  const spin = () => {
    if (spinning || n < 2) return
    setSpinning(true)
    const ticks = n + Math.floor(Math.random() * n) + 8
    let at = pos
    let delay = 0
    for (let i = 1; i <= ticks; i++) {
      delay += 40 + Math.pow(i / ticks, 3) * 320
      timers.current.push(
        setTimeout(() => {
          at = (at + 1) % n
          onSelect(available[at])
          if (i === ticks) setSpinning(false)
        }, delay),
      )
    }
  }

  // Circular distance from the front pack, so the wheel wraps around
  const offset = (i) => {
    let d = i - pos
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    return d
  }

  return (
    <div className="w-full">
      <div
        role="listbox"
        aria-label="Choose a pack"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
          if (e.key === 'Enter') onPick()
        }}
        onWheel={(e) => {
          const now = Date.now()
          if (now - lastWheel.current < 140) return
          lastWheel.current = now
          step((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1)
        }}
        // Dragging the wheel turns it. Images inside must not start the browser's own image drag,
        // which cancels the pointer; capturing the pointer keeps fast drags tracked.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => (drag.current = { x: e.clientX, moved: false })}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = e.clientX - drag.current.x
          if (Math.abs(dx) > 50) {
            // Capture only once it's really a drag, so plain clicks still reach the pack clicked
            if (!drag.current.moved) e.currentTarget.setPointerCapture?.(e.pointerId)
            step(dx < 0 ? 1 : -1)
            drag.current = { x: e.clientX, moved: true }
          }
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
        onPointerCancel={() => (drag.current = null)}
        className="relative mx-auto h-[300px] w-full touch-pan-y select-none overflow-hidden outline-none [perspective:1100px] sm:h-[380px]"
      >
        {available.map((index, i) => {
          const d = offset(i)
          if (Math.abs(d) > VISIBLE) return null
          const front = d === 0
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={front}
              aria-label={`Pack #${index + 1}${front ? ', tap to rip' : ''}`}
              onClick={() => {
                if (drag.current?.moved || spinning) return
                front ? onPick() : onSelect(index)
              }}
              className="absolute left-1/2 top-1/2 w-40 transition-[transform,opacity] duration-300 ease-out sm:w-52"
              style={{
                transform: `translate(-50%, -50%) translateX(${d * 62}%) translateZ(${-Math.abs(d) * 140}px) rotateY(${-d * 32}deg)`,
                opacity: 1 - Math.abs(d) * 0.17,
                zIndex: 20 - Math.abs(d),
              }}
            >
              <CardArt product={pack} packNumber={index + 1} className={front ? 'drop-shadow-[0_0_30px_rgba(245,185,18,0.45)]' : ''} />
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn-ghost px-4" onClick={() => step(-1)} disabled={spinning} aria-label="Previous pack">
          ‹
        </button>
        <button type="button" className="btn-ghost" onClick={spin} disabled={spinning || n < 2}>
          {spinning ? 'Spinning…' : '🎡 Spin the wheel'}
        </button>
        <button type="button" className="btn-ghost px-4" onClick={() => step(1)} disabled={spinning} aria-label="Next pack">
          ›
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Go to
          <select
            className="input w-auto py-1.5"
            value={selected}
            disabled={spinning}
            onChange={(e) => onSelect(Number(e.target.value))}
            aria-label="Go to pack number"
          >
            {available.map((index) => (
              <option key={index} value={index}>
                #{index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
