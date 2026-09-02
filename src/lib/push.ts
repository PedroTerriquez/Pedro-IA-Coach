import { PUSH_SERVER_URL, VAPID_PUBLIC_KEY } from '$lib/config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const b64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(b64)
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)))
}

export function getDeviceId(): string {
  let id = localStorage.getItem('push_device_id')
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    localStorage.setItem('push_device_id', id)
  }
  return id
}

export async function subscribePush(): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  if (!('serviceWorker' in navigator) || !PUSH_SERVER_URL) return false

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      try { await existing.unsubscribe() } catch {}
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
    })

    const res = await fetch(`${PUSH_SERVER_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), deviceId: getDeviceId() })
    })

    if (!res.ok) return false

    const { saveSettings, getSettings } = await import('$lib/storage')
    const s = await getSettings()
    s.pushSubscribed = true
    await saveSettings(s)
    return true
  } catch {
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    if (PUSH_SERVER_URL) {
      await fetch(`${PUSH_SERVER_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId() })
      })
    }
    const { saveSettings, getSettings } = await import('$lib/storage')
    const s = await getSettings()
    s.pushSubscribed = false
    await saveSettings(s)
  } catch {}
}

export async function sendPushNotification(title: string, body: string, tag?: string, data?: any): Promise<boolean> {
  if (!PUSH_SERVER_URL) return false
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/api/push/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, tag, data, deviceId: getDeviceId() })
    })
    return res.ok
  } catch {
    return false
  }
}

export async function notifyWatch(title: string, body: string, tag?: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'notify', title, body, tag })
  } catch {}
}

async function postJSON(path: string, body: Record<string, unknown>, attempts = 1): Promise<Response | null> {
  if (!PUSH_SERVER_URL) return null
  for (let i = 0; i <= attempts; i++) {
    try {
      const res = await fetch(`${PUSH_SERVER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res
    } catch {
      if (i === attempts) return null
    }
  }
  return null
}

// Registers the username with the Worker so the user is searchable and addable by
// friends. Tolerates a 409 ("already registered") — that means it already exists,
// which is a success for us. Returns true only if the user is confirmed registered.
export async function registerUser(username: string): Promise<boolean> {
  const res = await postJSON('/api/user/register', { username }, 1)
  if (!res) return false
  if (res.ok || res.status === 409) return true
  return false
}

// Checks whether a username is already registered with the Worker, without
// creating/modifying anything. Used to decide whether to show the register button.
export async function checkUserExists(username: string): Promise<boolean> {
  if (!username || !PUSH_SERVER_URL) return true
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/api/user/check?username=${encodeURIComponent(username)}`)
    if (!res.ok) return true
    const data = await res.json()
    return !!data.exists
  } catch {
    return true
  }
}

// Pushes the user's current weekly streak, whether they trained today, and their
// weekly gym time so friends see real data in the leaderboard. Best-effort;
// failures are ignored silently.
export async function syncUserToWorker(username: string, streak: number, exercisedToday: boolean, gymTime = 0): Promise<void> {
  if (!username) return
  await postJSON('/api/user/sync', { username, streak, exercisedToday, gymTime }, 0)
}
