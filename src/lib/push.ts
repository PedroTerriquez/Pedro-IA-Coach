import { PUSH_SERVER_URL, VAPID_PUBLIC_KEY } from '$lib/config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const b64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(b64)
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)))
}

function getDeviceId(): string {
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
    const res = await fetch(`${PUSH_SERVER_URL}/api/push/send`, {
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
