import { PUSH_SERVER_URL } from '$lib/config'
import { getDeviceId } from '$lib/push'
import { IDLE_MS } from '$lib/session-idle'

// «¿Terminaste?»: a push when the session goes idle, so a forgotten last set is
// saved without waiting to reopen the app. It is due exactly when Hoy shows
// «Tu sesión quedó abierta», so tapping it lands on that sheet.
//
// Pushes arrive empty (iOS): the Service Worker reads `/session-idle` in the
// push-pending cache to know a push at or after `at` is this reminder. Each
// activity re-arms it under a fresh tag; the Worker keeps only the newest.

const CACHE = 'push-pending'
const KEY = '/session-idle'

// The tag comes from the activity's time, so a reload can still cancel it
const tagFor = (lastActivityAt: number) => `idle-${lastActivityAt}`

async function stage(at: number): Promise<void> {
  try {
    const cache = await caches.open(CACHE)
    await cache.put(KEY, new Response(JSON.stringify({ at })))
  } catch {}
}

/** True when a reminder was armed */
async function unstage(): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE)
    return await cache.delete(KEY)
  } catch {
    return false
  }
}

async function post(path: string, body: object): Promise<void> {
  if (!PUSH_SERVER_URL) return
  try {
    await fetch(`${PUSH_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {}
}

/** The session had activity at `lastActivityAt`: remind 45 min after it */
export async function armIdleReminder(lastActivityAt: number): Promise<void> {
  const at = lastActivityAt + IDLE_MS
  await stage(at)
  await post('/api/session/idle', { deviceId: getDeviceId(), tag: tagFor(lastActivityAt), endTime: at })
}

/** The session ended (or was saved): no reminder */
export async function cancelIdleReminder(lastActivityAt: number | null | undefined): Promise<void> {
  const armed = await unstage()
  if (armed && lastActivityAt) await post('/api/rest-timer/cancel', { tag: tagFor(lastActivityAt), deviceId: getDeviceId() })
}
