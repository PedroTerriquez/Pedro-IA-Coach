// Finger gestures for big.spec.cjs: drags and swipes the app reads from touch
// or pointer events. Not a test file: Playwright only collects *.spec.*.

const { SEL } = require('./screens.cjs')

// Plan › Reprogramar › Mover: drags the handle of slot `from` onto slot `to`.
// With `cancel`, it lets go outside the list instead (which must undo it).
async function dragDay(page, from, to, { cancel = false } = {}) {
  const slots = page.locator(SEL.dragSlot)
  // Later slots sit partly under the fixed dock and tab bar — bring the lower
  // one into the clear, or elementFromPoint hits them and the drag never starts.
  await slots.evaluateAll((els, [a, b]) => {
    const low = els[Math.max(a, b)].getBoundingClientRect()
    const dock = document.querySelector('[data-component="NextStepDock"]')
    const safe = (dock ? dock.getBoundingClientRect().top : window.innerHeight - 110) - 10
    if (low.bottom > safe) window.scrollBy(0, low.bottom - safe)
  }, [from, to])
  const box0 = await slots.nth(0).boundingBox()
  const box1 = await slots.nth(1).boundingBox()
  const stepY = box1.y - box0.y
  const fromBox = await slots.nth(from).boundingBox()
  const hb = await slots.nth(from).locator(SEL.dragHandle).boundingBox()
  const cx = hb.x + hb.width / 2
  const cy = hb.y + hb.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  if (cancel) {
    await page.mouse.move(cx, cy + stepY, { steps: 5 })
    await page.mouse.move(5, 5)
  } else {
    await page.mouse.move(cx, box0.y + to * stepY + (hb.y - fromBox.y) + hb.height / 2, { steps: 12 })
  }
  await page.mouse.up()
}

// A finger dragging an element straight down by dy px. `lift: false` leaves it
// mid-drag (touchstart + touchmove, no touchend).
async function dragDown(locator, dy, { lift = true } = {}) {
  await locator.evaluate((el, { dy, lift }) => {
    const touch = (y) => new Touch({ identifier: 1, target: el, clientX: 200, clientY: y })
    const fire = (type, init) => el.dispatchEvent(new TouchEvent(type, { ...init, bubbles: true, cancelable: true }))
    fire('touchstart', { touches: [touch(100)] })
    for (const y of [100 + dy / 2, 100 + dy]) fire('touchmove', { touches: [touch(y)] })
    if (lift) fire('touchend', { changedTouches: [touch(100 + dy)] })
  }, { dy, lift })
}

// Fires synthetic touch events at the detail's scroller, the way a finger
// swipe would, to exercise ExerciseDetail's swipe-to-navigate.
async function swipeDetail(page, dx) {
  await page.locator(SEL.detailScroll).evaluate((el, dx) => {
    const touch = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 })
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(200)], bubbles: true, cancelable: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(200 + dx)], bubbles: true, cancelable: true }))
  }, dx)
}

module.exports = { dragDay, dragDown, swipeDetail }
