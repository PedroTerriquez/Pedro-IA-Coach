import { readable } from 'svelte/store'
import { PUSH_SERVER_URL } from '$lib/config'

// `navigator.onLine` only knows there's a network interface: with mobile data
// on but no signal (or no data plan) it still says true. So we confirm by
// actually reaching the Worker with a HEAD (no body, a few hundred bytes).
// Any HTTP answer counts — the Worker replies 405 to HEAD — and /api/ paths
// skip the service worker cache, so a response can only come from the real
// network. To keep mobile data cost minimal we only ping when the app opens,
// comes back to the foreground or the network changes; the only periodic
// retry is while offline, to notice when the connection comes back.
const PING_URL = `${PUSH_SERVER_URL}/api/ping`
const PING_TIMEOUT_MS = 5000
const RETRY_OFFLINE_MS = 15000

function hasInterface(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

async function canReachServer(): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS)
  try {
    await fetch(PING_URL, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function checkConnection(): Promise<boolean> {
  return hasInterface() && (await canReachServer())
}

// Tracks real connectivity. Local features keep working offline; anything
// that talks to the Worker (AI, friends, push) reads this to say
// "Requiere internet" instead of failing.
export const online = readable<boolean>(hasInterface(), (set) => {
  if (typeof window === 'undefined') return
  let timer: ReturnType<typeof setTimeout> | null = null
  let seq = 0

  function retryWhileOffline(isOnline: boolean) {
    if (timer) clearTimeout(timer)
    timer = isOnline ? null : setTimeout(recheck, RETRY_OFFLINE_MS)
  }

  async function recheck() {
    const mine = ++seq
    const result = await checkConnection()
    if (mine !== seq) return
    set(result)
    retryWhileOffline(result)
  }

  // Losing the interface is certain — report it right away, no ping needed.
  // Retries don't ping either while there's no interface (checkConnection
  // short-circuits), so this costs no data.
  function onOffline() {
    seq++
    set(false)
    retryWhileOffline(false)
  }

  function onVisible() {
    if (document.visibilityState === 'visible') recheck()
  }

  window.addEventListener('online', recheck)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  recheck()
  return () => {
    if (timer) clearTimeout(timer)
    window.removeEventListener('online', recheck)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
  }
})
