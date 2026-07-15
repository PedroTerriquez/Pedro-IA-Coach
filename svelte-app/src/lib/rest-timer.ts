declare const PUSH_SERVER_URL: string

const REST_PENDING_CACHE = 'rest-pending'
const REST_TIMER_CACHE = 'rest-timer'

let _restTimerBannerEl: HTMLElement | null = null
let _restTimerEndTime = 0
let _restTimerDuration = 0
let _restTimerTickId: ReturnType<typeof setInterval> | null = null

export interface RestPendingData {
  name: string
  restSec: number
  tag: string
  exerciseId: string
  sets: number
  reps: string
}

export interface RestTimerData {
  endTime: number
  name: string
  restSec: number
  tag: string
  sets: number
  reps: string
  exerciseId: string
}

export async function storeRestPending(data: RestPendingData): Promise<void> {
  const cache = await caches.open(REST_PENDING_CACHE)
  const response = new Response(JSON.stringify(data))
  await cache.put('/pending', response)
}

export async function getRestPending(): Promise<RestPendingData | null> {
  try {
    const cache = await caches.open(REST_PENDING_CACHE)
    const response = await cache.match('/pending')
    if (!response) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function clearRestPending(): Promise<void> {
  const cache = await caches.open(REST_PENDING_CACHE)
  await cache.delete('/pending')
}

export async function storeRestTimer(data: RestTimerData): Promise<void> {
  const cache = await caches.open(REST_TIMER_CACHE)
  const response = new Response(JSON.stringify(data))
  await cache.put('/pending', response)
}

export async function getRestTimer(): Promise<RestTimerData | null> {
  try {
    const cache = await caches.open(REST_TIMER_CACHE)
    const response = await cache.match('/pending')
    if (!response) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function clearRestTimer(): Promise<void> {
  const cache = await caches.open(REST_TIMER_CACHE)
  await cache.delete('/pending')
}

export async function getFromNotificationFlag(): Promise<boolean> {
  try {
    const cache = await caches.open(REST_PENDING_CACHE)
    const res = await cache.match('/from-notification')
    if (!res) return false
    await cache.delete('/from-notification')
    return true
  } catch {
    return false
  }
}

let _handlingPendingRest = false

export async function checkPendingRest(): Promise<void> {
  if (_handlingPendingRest) return
  _handlingPendingRest = true
  try {
    const flag = await getFromNotificationFlag()
    if (!flag) return
    const pending = await getRestPending()
    if (!pending || !pending.name || !(pending.restSec > 0)) return
    const tag = pending.tag || 'rest-' + Date.now()
    await scheduleRestTimer(pending.name, pending.restSec, tag, pending.sets, pending.reps, pending.exerciseId)
  } finally {
    _handlingPendingRest = false
  }
}

function _fmtClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function _restRingOffset(remainingMs: number) {
  const pct = _restTimerDuration > 0 ? Math.max(0, Math.min(1, remainingMs / _restTimerDuration)) : 0
  return 100 * (1 - pct)
}

function _showRestTimerBanner(data: RestTimerData, remainingMs: number) {
  _hideRestTimerBanner()
  _restTimerEndTime = data.endTime
  _restTimerDuration = data.restSec * 1000
  const meta = data.sets && data.reps ? `${data.sets} × ${data.reps}` : ''
  const name = typeof getExerciseDisplayName !== 'undefined'
    ? getExerciseDisplayName({ name: data.name }) || data.name
    : data.name

  const bar = document.createElement('div')
  bar.id = 'rest-timer-banner'
  if (remainingMs <= 10000) bar.classList.add('is-ending')
  bar.style.setProperty('--accent', document.documentElement.style.getPropertyValue('--accent') || '#d4ff3a')

  bar.innerHTML = `
    <div class="rtb-ring-wrap">
      <svg class="rtb-ring" viewBox="0 0 56 56" aria-hidden="true">
        <circle class="rtb-ring-track" cx="28" cy="28" r="24"></circle>
        <circle class="rtb-ring-prog" cx="28" cy="28" r="24" pathLength="100" style="stroke-dashoffset:${_restRingOffset(remainingMs)}"></circle>
      </svg>
      <span class="rtb-time">${_fmtClock(remainingMs)}</span>
    </div>
    <div class="rtb-info">
      <span class="rtb-label">Descanso</span>
      <span class="rtb-name">${name}</span>
      ${meta ? `<span class="rtb-meta">${meta}</span>` : ''}
    </div>
    <button class="rtb-skip" type="button" aria-label="Saltar descanso">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 3.2l8 5.8-8 5.8V3.2z" fill="currentColor"/><rect x="12.5" y="3" width="2" height="12" rx="1" fill="currentColor"/></svg>
    </button>`

  bar.querySelector('.rtb-skip')!.addEventListener('click', async (e) => {
    e.stopPropagation()
    _hideRestTimerBanner()
    await cancelRestTimer(data.tag)
  })

  document.body.appendChild(bar)
  _restTimerBannerEl = bar

  if (_restTimerTickId) clearInterval(_restTimerTickId)
  _restTimerTickId = setInterval(() => {
    const rem = _restTimerEndTime - Date.now()
    if (rem <= 0) {
      if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
      _checkRestTimer()
    } else {
      _updateRestTimerBanner(rem)
    }
  }, 1000)
}

function _hideRestTimerBanner() {
  const el = document.getElementById('rest-timer-banner')
  if (el) el.remove()
  _restTimerBannerEl = null
  if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
}

function _updateRestTimerBanner(remainingMs: number) {
  if (!_restTimerBannerEl) return
  const timeEl = _restTimerBannerEl.querySelector('.rtb-time')
  if (timeEl) timeEl.textContent = _fmtClock(remainingMs)
  const progEl = _restTimerBannerEl.querySelector('.rtb-ring-prog')
  if (progEl) (progEl as HTMLElement).style.strokeDashoffset = `${_restRingOffset(remainingMs)}`
  _restTimerBannerEl.classList.toggle('is-ending', remainingMs <= 10000)
}

export async function _checkRestTimer() {
  try {
    const cache = await caches.open(REST_TIMER_CACHE)
    const res = await cache.match('/pending')
    if (!res) return
    const data: RestTimerData = await res.json()
    const remaining = data.endTime - Date.now()
    if (remaining <= 0) {
      await cache.delete('/pending')
      if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
      _hideRestTimerBanner()
    } else {
      if (_restTimerTickId) clearInterval(_restTimerTickId)
      _restTimerTickId = setTimeout(_checkRestTimer, remaining)
      if (!_restTimerBannerEl) {
        _showRestTimerBanner(data, remaining)
      } else {
        _updateRestTimerBanner(remaining)
      }
    }
  } catch {}
}

export async function scheduleRestTimer(name: string, restSec: number, tag: string, sets: number, reps: string, exerciseId: string): Promise<void> {
  const endTime = Date.now() + restSec * 1000
  await storeRestTimer({ endTime, name, restSec, tag, sets, reps, exerciseId })

  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: Math.max(endTime - 10000, Date.now() + 1000),
        deviceId: 'default',
        tag,
        title: name,
        body: `${sets}×${reps}`,
        exerciseId,
        sets,
        reps,
        restSec
      })
    })
  } catch {}

  _checkRestTimer()

  setTimeout(() => {
    completeRest(name, tag)
  }, restSec * 1000 + 2000)
}

export async function completeRest(name: string, tag: string): Promise<void> {
  _hideRestTimerBanner()

  const { toast } = await import('$lib/stores/ui')
  toast.show(`⏰ ${name} — Descanso terminado`)

  const { notifyWatch } = await import('$lib/push')
  await notifyWatch(`⏰ ${name}`, 'Descanso terminado — Tap para iniciar', tag)

  const pending = await getRestPending()
  if (pending) await storeRestPending(pending)

  await clearRestTimer()
}

export async function cancelRestTimer(tag: string): Promise<void> {
  _hideRestTimerBanner()
  await clearRestTimer()
  await clearRestPending()

  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, deviceId: 'default' })
    })
  } catch {}
}
