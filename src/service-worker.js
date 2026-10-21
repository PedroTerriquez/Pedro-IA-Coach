import { base, build, files, prerendered, version } from '$service-worker'

const CACHE = `cache-${version}`
// App shell = the SPA fallback page every route can boot from offline.
const SHELL = `${base}/`
const PLACEHOLDER_IMG = `${base}/dumbbell-placeholder.jpg`
const IMMUTABLE_PREFIX = `${base}/_app/immutable/`
const ASSETS = [...new Set([...build, ...files, ...prerendered, SHELL])]

const START_TAG = 'rest-start'
const DONE_TAG = 'rest-done'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('cache-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      ),
    ])
  )
})

// A network that connects but never answers (mobile data with no coverage, a
// black-holed DNS, a captive portal) leaves `fetch` pending forever: with no
// deadline the navigation never settles and the app won't boot even though the
// cache is full. So every network attempt has a deadline, and past it we serve
// the local copy.
const NET_TIMEOUT_MS = 3000

// An exercise image from another host is asked for with CORS first (the media
// hosts allow it): an opaque copy is charged ~7 MB of storage quota whatever
// its real size, and enough of them leave IndexedDB — the user's data — with no
// room to write. A host without CORS still shows its image, uncached.
async function fetchImage(request, signal) {
  try {
    const res = await fetch(request.url, { mode: 'cors', credentials: 'omit', signal })
    if (res.ok) return res
  } catch (err) {
    if (signal.aborted) throw err
  }
  return fetch(request, { signal })
}

function isCrossOriginImage(request) {
  return request.destination === 'image' && new URL(request.url).origin !== self.location.origin
}

async function fetchAndCache(request) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS)
  try {
    const res = isCrossOriginImage(request) ? await fetchImage(request, ctrl.signal) : await fetch(request, { signal: ctrl.signal })
    // Only real answers get stored: a 404 page cached under an image URL would
    // be served forever, and an opaque one would eat the storage quota.
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((cache) => cache.put(request, clone))
    }
    return res
  } finally {
    clearTimeout(timer)
  }
}

// Build assets carry a hash of their content in the file name, so a cached hit
// is always the right answer: there is nothing fresher to ask the network for.
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  return await fetchAndCache(request)
}

// Offline fallback for what isn't cached: navigations boot from the app
// shell (IndexedDB has the data), images show the default dumbbell.
function offlineFallback(request) {
  if (request.mode === 'navigate') return caches.match(SHELL)
  if (request.destination === 'image') return caches.match(PLACEHOLDER_IMG)
  return undefined
}

async function networkFirst(request) {
  try {
    return await fetchAndCache(request)
  } catch (err) {
    const cached = (await caches.match(request)) || (await offlineFallback(request))
    if (cached) return cached
    throw err
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  const immutable = new URL(e.request.url).pathname.startsWith(IMMUTABLE_PREFIX)
  e.respondWith(immutable ? cacheFirst(e.request) : networkFirst(e.request))
})

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (e.data?.type === 'notify') {
    self.registration.showNotification(e.data.title || 'Coach Pedro AI', {
      body: e.data.body || '',
      icon: 'icons/icon-192.png',
      tag: e.data.tag || 'local-notify',
      data: { url: './' },
    })
  }
})

function _repsLabel(ex) {
  return ex && ex.sets && ex.reps ? `${ex.sets}×${ex.reps} · ` : ''
}

// `running` tells which of the two moments this card belongs to: right after
// "Iniciar" the rest is already on the clock in the app (tapping only opens
// it), while the one re-shown when a rest ends is the tapeable way to start
// the next serie with the app closed.
function showStartNotification(ex, running) {
  return self.registration.showNotification(ex.name || 'Coach Pedro AI', {
    body: running
      ? `${_repsLabel(ex)}Descanso en curso · Tap para ver ▸`
      : `${_repsLabel(ex)}Tap para iniciar descanso ▸`,
    icon: 'icons/icon-192.png',
    tag: START_TAG,
    renotify: true,
    requireInteraction: true,
    data: { kind: 'start', url: './', exerciseData: ex },
  })
}

function showDoneNotification(ex) {
  return self.registration.showNotification(`⏰ ${ex.name || 'Descanso'}`, {
    body: 'Descanso terminado',
    icon: 'icons/icon-192.png',
    tag: DONE_TAG,
    renotify: true,
    requireInteraction: false,
    data: { kind: 'done', url: './' },
  })
}

async function closeDoneAfter(ms) {
  await new Promise((r) => setTimeout(r, ms))
  const ns = await self.registration.getNotifications({ tag: DONE_TAG })
  ns.forEach((n) => n.close())
}

// Pushes arrive empty, so which card to show is read off the clock: the app
// stages when its "done" push is due, and the queue never delivers before that
// moment. Anything earlier is the start push, however late it lands — splitting
// at the midpoint showed "Descanso terminado" seconds after Iniciar whenever
// the start push was slow or the rest short. The margin absorbs clock skew
// between the phone and the Worker.
// Specs without `doneAt` come from an older app version and still carry `kind`.
const DONE_PUSH_EARLY_MS = 5000

function pushKind(spec, now) {
  if (!spec.doneAt) return spec.kind
  return now >= spec.doneAt - DONE_PUSH_EARLY_MS ? 'done' : 'start'
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let data = {}
    try {
      if (e.data) data = e.data.json()
    } catch {}
    if (!data.kind) {
      try {
        const cache = await caches.open('push-pending')
        const res = await cache.match('/pending')
        if (res) data = await res.json()
      } catch {}
    }
    const ex = data.exerciseData
    const kind = pushKind(data, Date.now())
    if (kind === 'start' && ex) {
      await showStartNotification(ex, true)
      return
    }
    if (kind === 'done' && ex) {
      await showDoneNotification(ex)
      await showStartNotification(ex, false)
      await closeDoneAfter(20000)
      return
    }
    await self.registration.showNotification(data.title || 'Coach Pedro AI', {
      body: data.body || '',
      icon: 'icons/icon-192.png',
      tag: data.tag || `push-${Date.now()}`,
      requireInteraction: true,
      data: { url: data.url || './' },
    })
  })())
})

self.addEventListener('notificationclick', (e) => {
  const data = e.notification.data || {}
  e.notification.close()
  e.waitUntil((async () => {
    if (data.kind === 'start' && data.exerciseData) {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify(data.exerciseData)))
      await cache.put('/from-notification', new Response('1'))
    }
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = all.find((c) => 'focus' in c)
    if (existing) {
      await existing.focus()
      if (data.kind === 'start') existing.postMessage({ type: 'rest-start' })
    } else {
      await clients.openWindow('./')
    }
  })())
})
