// Drag a sheet down by its top (grabber + head) to close it, like iOS.
// Listeners are added by hand because Svelte's ontouchmove is passive and
// can't preventDefault the page scroll.

const CLOSE_DISTANCE = 100 // px
const CLOSE_VELOCITY = 0.5 // px/ms
/** Where the panel slides to while it closes */
export const CLOSED_OFFSET = 300

export interface SwipeToCloseOptions {
  /** Panel offset in px; `dragging` turns its transition off */
  onmove: (offset: number, dragging: boolean) => void
  onclose: () => void
}

/** Slower the further it's dragged */
export function dragResistance(dy: number): number {
  return dy * (1 - Math.min(1, dy / CLOSED_OFFSET) * 0.5)
}

/** Past the distance, or flicked down fast enough (a tap's jitter isn't a flick) */
export function shouldClose(dy: number, velocity: number): boolean {
  return dy > CLOSE_DISTANCE || (dy > FLICK_MIN && velocity > CLOSE_VELOCITY)
}
const FLICK_MIN = 20 // px

export function swipeToClose(node: HTMLElement, options: SwipeToCloseOptions) {
  let opts = options
  let startX = 0
  let startY = 0
  let startTime = 0
  let dragging = false

  function start(e: TouchEvent) {
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    startTime = Date.now()
    dragging = true
  }

  function move(e: TouchEvent) {
    if (!dragging || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY
    // Only downward; a sideways move (chips in a header) stays a scroll
    if (dy <= 0 || Math.abs(e.touches[0].clientX - startX) > dy) return
    e.preventDefault()
    opts.onmove(dragResistance(dy), true)
  }

  function end(e: TouchEvent) {
    if (!dragging) return
    dragging = false
    const dy = Math.max(0, e.changedTouches[0].clientY - startY)
    const dt = Date.now() - startTime
    if (!shouldClose(dy, dt > 0 ? dy / dt : 0)) {
      opts.onmove(0, false)
      return
    }
    opts.onmove(CLOSED_OFFSET, false)
    setTimeout(() => opts.onclose(), 150)
  }

  node.addEventListener('touchstart', start, { passive: true })
  node.addEventListener('touchmove', move, { passive: false })
  node.addEventListener('touchend', end)
  node.addEventListener('touchcancel', end)

  return {
    update(next: SwipeToCloseOptions) { opts = next },
    destroy() {
      node.removeEventListener('touchstart', start)
      node.removeEventListener('touchmove', move)
      node.removeEventListener('touchend', end)
      node.removeEventListener('touchcancel', end)
    },
  }
}
