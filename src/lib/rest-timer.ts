import { PUSH_SERVER_URL } from '$lib/config'
import { writable } from 'svelte/store'
import { sendPushNotification, notifyWatch } from '$lib/push'

const REST_PENDING_CACHE = 'rest-pending'
const REST_TIMER_CACHE = 'rest-timer'

export const restBannerState = writable<{
  visible: boolean
  endTime: number
  restSec: number
  name: string
  sets: number
  reps: string
  tag: string
}>({ visible: false, endTime: 0, restSec: 0, name: '', sets: 0, reps: '', tag: '' })

let _restTimerTickId: ReturnType<typeof setTimeout> | null = null

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

function _showRestTimerBanner(data: RestTimerData) {
  _hideRestTimerBanner()

  restBannerState.set({
    visible: true,
    endTime: data.endTime,
    restSec: data.restSec,
    name: data.name,
    sets: data.sets,
    reps: data.reps,
    tag: data.tag
  })
}

function _hideRestTimerBanner() {
  restBannerState.set({ visible: false, endTime: 0, restSec: 0, name: '', sets: 0, reps: '', tag: '' })
  if (_restTimerTickId) { clearInterval(_restTimerTickId); _restTimerTickId = null }
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
      _showRestTimerBanner(data)
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

// Shared "Iniciar" handler for ExerciseDetail's onStartRest — used identically from
// today/+page.svelte and plan/+page.svelte so both routes trigger the same rest-timer
// push/watch flow instead of duplicating it.
export async function startRestFromExercise(data: { name: string; restSec: number; tag: string; sets: number; reps: string; exerciseId: string }): Promise<void> {
  const { name, restSec, tag, sets, reps, exerciseId } = data
  await storeRestPending({ name, restSec, tag, exerciseId, sets, reps })
  const pushCache = await caches.open('push-pending')
  await pushCache.put('/pending', new Response(JSON.stringify({
    kind: 'start',
    exerciseData: { name, restSec, sets, reps, exerciseId }
  })))
  const ok = await sendPushNotification(name, `${sets}×${reps} · Tap para iniciar descanso`, tag, { exerciseId })
  if (!ok) await notifyWatch(name, `${sets}×${reps} · Tap para iniciar descanso`, tag)
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
