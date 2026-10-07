import { PUSH_SERVER_URL } from '$lib/config'
import { writable } from 'svelte/store'
import { sendPushNotification, notifyWatch, getDeviceId } from '$lib/push'

const REST_PENDING_CACHE = 'rest-pending'
const REST_TIMER_CACHE = 'rest-timer'
const SET_COUNT_KEY = 'rest-set-counts'

// Everything the full-screen timer needs to render on its own. It travels
// Iniciar → push → notification tap → app, so whatever is not in here simply
// isn't available while the timer is on screen.
export interface RestPendingData {
  name: string
  restSec: number
  tag: string
  exerciseId: string
  sets: number
  reps: string
  muscle?: string
  imgUrl?: string
  gifUrl?: string
  units?: string
  lastWeight?: number
  maxWeight?: number
  setIndex?: number
}

// 'resting' → the clock is running. 'done' → the rest is over and the screen
// stays up asking for the next set, which is what keeps the series counter and
// the per-set log going without leaving the app.
export type RestPhase = 'resting' | 'done'

export interface RestTimerData extends RestPendingData {
  endTime: number
  phase?: RestPhase
}

const EMPTY_TIMER: RestTimerData = {
  endTime: 0, restSec: 0, name: '', sets: 0, reps: '', tag: '', exerciseId: '', phase: 'resting'
}

// Time between tapping "Iniciar" and the start push leaving: enough to lock the
// phone, which is what makes iOS mirror the notification to the Apple Watch.
// The rest itself doesn't wait for it: the clock is already running.
export const START_PUSH_DELAY_MS = 3000
const START_PUSH_MAX_LATE_MS = 5000

// The delayed push leaves this long before the rest ends, to compensate for
// delivery latency.
const DONE_PUSH_LEAD_MS = 10000

// A finished rest waiting for "Siguiente serie" is only meaningful for a while;
// after that, coming back to the app shouldn't greet you with an old set.
const DONE_TTL_MS = 15 * 60 * 1000

export const restBannerState = writable<RestTimerData & { visible: boolean }>({
  ...EMPTY_TIMER,
  visible: false
})

let _restTimerTickId: ReturnType<typeof setTimeout> | null = null
let _startPushId: ReturnType<typeof setTimeout> | null = null
let _announcedTag = ''

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

// ── Set counter ──
// Each "Iniciar" means one set just finished, so the Nth tap of the day on an
// exercise is its Nth set. Kept in localStorage (not IndexedDB) because the
// timer reads it synchronously while the sheet is closing, and reset per day.

function localDateKey(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

function readSetCounts(): { date: string; counts: Record<string, number> } {
  try {
    const raw = localStorage.getItem(SET_COUNT_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && parsed.date === localDateKey()) return parsed
  } catch {}
  return { date: localDateKey(), counts: {} }
}

export function nextSetIndex(exerciseId: string): number {
  const state = readSetCounts()
  state.counts[exerciseId] = (state.counts[exerciseId] || 0) + 1
  try { localStorage.setItem(SET_COUNT_KEY, JSON.stringify(state)) } catch {}
  return state.counts[exerciseId]
}

export function getSetIndex(exerciseId: string): number {
  return readSetCounts().counts[exerciseId] || 0
}

let _handlingPendingRest = false

// True only while a rest is actually counting down. A finished rest ('done')
// is not running: tapping the start notification then means "empecé la
// siguiente serie", which is exactly what should arm a new rest.
export async function isRestRunning(): Promise<boolean> {
  const current = await getRestTimer()
  return !!current && current.phase !== 'done' && current.endTime > Date.now()
}

// Tap on the "start" notification. If the rest that the tap belongs to is
// already on the clock (the usual case now, since "Iniciar" starts it), the tap
// only brought the app to the front — don't restart anything. If no rest is
// running, the tap is the app-closed way of saying "terminé la siguiente
// serie", so it counts a set and arms the next rest.
export async function checkPendingRest(): Promise<void> {
  if (_handlingPendingRest) return
  _handlingPendingRest = true
  try {
    const flag = await getFromNotificationFlag()
    if (!flag) return
    const pending = await getRestPending()
    if (!pending || !pending.name || !(pending.restSec > 0)) return
    if (await isRestRunning()) return
    await countSetAndArm(pending)
  } finally {
    _handlingPendingRest = false
  }
}

// Counts one more set for this exercise and starts its rest right away (no
// start push: the notification that got us here was the start notification).
async function countSetAndArm(data: RestPendingData): Promise<void> {
  const pending: RestPendingData = {
    ...data,
    tag: 'rest-' + Date.now(),
    setIndex: nextSetIndex(data.exerciseId)
  }
  await storeRestPending(pending)
  await scheduleRestTimer(pending)
}

function _showRestTimerBanner(data: RestTimerData) {
  restBannerState.set({ ...data, visible: true })
}

function _hideRestTimerBanner() {
  restBannerState.set({ ...EMPTY_TIMER, visible: false })
  _stopTick()
}

function _stopTick() {
  if (_restTimerTickId) { clearTimeout(_restTimerTickId); _restTimerTickId = null }
}

// The single place that decides what the rest screen is showing right now:
// counting down, waiting for the next set, or nothing at all. Every entry point
// (arming, coming back to the foreground, the tick firing) goes through here.
export async function _checkRestTimer() {
  try {
    const data = await getRestTimer()
    if (!data) return
    const remaining = data.endTime - Date.now()
    if (remaining > 0) {
      _stopTick()
      _restTimerTickId = setTimeout(_checkRestTimer, remaining)
      _showRestTimerBanner({ ...data, phase: 'resting' })
      return
    }
    if (Date.now() - data.endTime > DONE_TTL_MS) {
      await clearRestTimer()
      _hideRestTimerBanner()
      return
    }
    await completeRest(data.tag)
  } catch {}
}

function donePushTime(data: RestTimerData): number {
  return Math.max(data.endTime - DONE_PUSH_LEAD_MS, Date.now() + 1000)
}

// Pushes arrive empty, so the Service Worker needs to be told what to show.
// It is told *when* this rest runs, not which push comes next: a push near the
// start shows "Descanso en curso", one near `doneAt` shows "Descanso
// terminado". Order of arrival can't confuse it — a late start push used to
// read a note already flipped to "done".
async function stagePushSpec(data: RestTimerData): Promise<void> {
  try {
    const cache = await caches.open('push-pending')
    const spec = {
      exerciseData: data,
      startedAt: data.endTime - data.restSec * 1000,
      doneAt: donePushTime(data)
    }
    await cache.put('/pending', new Response(JSON.stringify(spec)))
  } catch {}
}

// The delayed push is the source of truth for "rest over" — the in-app timer is
// decorative best-effort.
async function scheduleDelayedPush(data: RestTimerData): Promise<void> {
  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: donePushTime(data),
        deviceId: getDeviceId(),
        tag: data.tag,
        title: data.name,
        body: `${data.sets}×${data.reps}`,
        exerciseId: data.exerciseId,
        sets: data.sets,
        reps: data.reps,
        restSec: data.restSec
      })
    })
  } catch {}
}

async function cancelDelayedPush(tag: string): Promise<void> {
  try {
    await fetch(`${PUSH_SERVER_URL}/api/rest-timer/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, deviceId: getDeviceId() })
    })
  } catch {}
}

// Single place that puts a rest on the clock: cache it, tell the Service Worker
// when it runs, show the countdown and queue the delayed push. The screen goes
// up before the network call so the timer never waits on it.
async function armRest(data: RestTimerData): Promise<void> {
  _announcedTag = ''
  await storeRestTimer({ ...data, phase: 'resting' })
  await stagePushSpec(data)
  await _checkRestTimer()
  await scheduleDelayedPush(data)
}

export async function scheduleRestTimer(pending: RestPendingData): Promise<void> {
  await armRest({ ...pending, endTime: Date.now() + pending.restSec * 1000, phase: 'resting' })
}

// "+30 s" / "−15 s": move the end forward or back, then re-queue the delayed
// push under a fresh tag so the worker supersedes the one already in flight.
export async function adjustRestTimer(deltaSec: number): Promise<void> {
  const current = await getRestTimer()
  if (!current) return
  const endTime = Math.max(Date.now() + 3000, current.endTime + deltaSec * 1000)
  const restSec = Math.max(1, current.restSec + deltaSec)
  await cancelDelayedPush(current.tag)
  await armRest({ ...current, endTime, restSec, tag: 'rest-' + Date.now() })
}

// "Reiniciar descanso" from the full-screen timer: the same machinery the
// Iniciar button ends up running, minus the tapeable start notification —
// here the rest starts on the spot. It still queues the delayed push, so both
// entry points finish a rest exactly the same way.
export async function restartRestTimer(): Promise<void> {
  const current = await getRestTimer()
  if (!current) return
  await cancelDelayedPush(current.tag)
  await scheduleRestTimer({ ...current, tag: 'rest-' + Date.now() })
}

// The rest is over: the screen stays up in 'done' so you can close the set
// (registrar peso/reps) and start the next one. The record survives in cache,
// so coming back to the app minutes later still finds the set waiting.
export async function completeRest(tag?: string): Promise<void> {
  const data = await getRestTimer()
  if (!data) return
  if (tag && data.tag !== tag) return
  _stopTick()
  if (data.phase !== 'done') {
    await storeRestTimer({ ...data, phase: 'done' })
  }
  _showRestTimerBanner({ ...data, phase: 'done' })
  await announceRestDone(data)
}

// The screen itself announces the end ("Descanso terminado" a pantalla
// completa) and the delayed push owns the notification, so all that's left in
// the app is a buzz — and only once per rest, because the foreground checks
// run on every focus and visibility change.
async function announceRestDone(data: RestTimerData): Promise<void> {
  if (_announcedTag === data.tag) return
  _announcedTag = data.tag
  try { navigator.vibrate?.([80, 60, 80]) } catch {}
}

// Shared "Iniciar" handler for ExerciseDetail's onStartRest — used identically from
// today/+page.svelte, plan/+page.svelte and Calendar.svelte so every route triggers
// the same rest-timer push/watch flow instead of duplicating it.
//
// The rest starts on the tap: the timer goes up and the delayed push is queued
// right away. The start notification follows 3s later on its own — whether or
// not the phone got locked, whether or not it is ever tapped.
export async function startRestFromExercise(data: RestPendingData): Promise<void> {
  const pending: RestPendingData = { ...data, setIndex: nextSetIndex(data.exerciseId) }
  await storeRestPending(pending)
  queueStartNotification(pending)
  await scheduleRestTimer(pending)
}

function cancelStartNotification(): void {
  if (_startPushId) { clearTimeout(_startPushId); _startPushId = null }
}

// A locked phone can freeze the app and only run this when you come back,
// long after the 3s. By then you are looking at the timer, so the card would
// announce nothing: it is dropped instead of sent late.
function queueStartNotification(pending: RestPendingData): void {
  cancelStartNotification()
  const due = Date.now() + START_PUSH_DELAY_MS
  _startPushId = setTimeout(() => {
    _startPushId = null
    if (Date.now() - due < START_PUSH_MAX_LATE_MS) sendStartNotification(pending)
  }, START_PUSH_DELAY_MS)
}

async function sendStartNotification(pending: RestPendingData): Promise<void> {
  const body = `${pending.sets}×${pending.reps} · Descanso en curso`
  const ok = await sendPushNotification(pending.name, body, pending.tag, { exerciseId: pending.exerciseId })
  if (!ok) await notifyWatch(pending.name, body, pending.tag)
}

// "Siguiente serie" from the finished timer: you just did the next set, so it
// counts one more and runs the same flow as "Iniciar" — the rest starts at
// once and the start notification follows, so the Watch keeps getting the card
// for every series.
export async function startNextSet(): Promise<void> {
  const current = (await getRestTimer()) || (await getRestPending())
  if (!current) return
  await startRestFromExercise({ ...toExerciseData(current), tag: 'rest-' + Date.now() })
}

// Drops what belongs to the rest that just ended (`endTime`, `phase`,
// `setIndex`) and keeps only the exercise, so the next rest is counted and
// timed from scratch.
function toExerciseData(data: RestTimerData | RestPendingData): RestPendingData {
  const { name, restSec, tag, exerciseId, sets, reps, muscle, imgUrl, gifUrl, units, lastWeight, maxWeight } = data
  return { name, restSec, tag, exerciseId, sets, reps, muscle, imgUrl, gifUrl, units, lastWeight, maxWeight }
}

export async function cancelRestTimer(tag: string): Promise<void> {
  cancelStartNotification()
  _hideRestTimerBanner()
  await clearRestTimer()
  await clearRestPending()
  await cancelDelayedPush(tag)
}
