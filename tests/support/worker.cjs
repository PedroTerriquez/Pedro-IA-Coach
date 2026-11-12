// The network side of big.spec.cjs: the simulated Worker, pushes delivered to
// the real Service Worker, the caches it reads, and going offline. Not a test
// file: Playwright only collects *.spec.*.

const { expect } = require('@playwright/test')

// The simulated Worker, for the flow and the tests apart. `api` is mutated by
// the test to steer it: friends (the league on the server), users (what search
// finds), exists, registerStatus, renameStatus. Every POST lands in
// `api.calls` and every list request's username in `api.listUsers`. AI chat
// routes are registered on top where a step cares about their bodies.
async function mockWorker(page, api) {
  api.calls = []
  api.listUsers = []
  api.restStarts = []
  api.restCancels = []
  api.startPushes = 0
  await page.route(/\/api\/|rest-timer\/|push\/start/, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
    let body = null
    try { body = req.method() === 'POST' ? req.postDataJSON() : null } catch { body = req.postData() }
    if (body) api.calls.push({ path: url.pathname, body })
    const p = url.pathname
    if (p.endsWith('/api/ping')) return route.fulfill({ status: 405, headers: { 'Access-Control-Allow-Origin': '*' } })
    if (p.includes('rest-timer/start')) { api.restStarts.push(body); return json({ status: 'scheduled' }) }
    if (p.includes('rest-timer/cancel')) { api.restCancels.push(body); return json({ status: 'ok' }) }
    if (p.includes('push/start')) { api.startPushes++; return json({ status: 'sent' }) }
    if (p.endsWith('/api/friends/list')) {
      api.listUsers.push(url.searchParams.get('username'))
      return json({ friends: api.friends || [] })
    }
    if (p.endsWith('/api/friends/search')) {
      const q = (url.searchParams.get('q') || '').toLowerCase()
      return json({ results: (api.users || []).filter((u) => u.username.toLowerCase().includes(q)) })
    }
    if (p.endsWith('/api/friends/add')) {
      api.friends = [...(api.friends || []), (api.users || []).find((u) => u.username === body.friendUsername)]
      return json({ status: 'ok' })
    }
    if (p.endsWith('/api/friends/remove')) {
      api.friends = (api.friends || []).filter((f) => f.username !== body.friendUsername)
      return json({ status: 'ok' })
    }
    if (p.endsWith('/api/user/check')) return json({ exists: api.exists !== false })
    if (p.endsWith('/api/user/register')) return api.registerStatus === 500 ? json({ error: 'boom' }, 500) : json({ status: 'ok' })
    if (p.endsWith('/api/user/sync')) return json({ status: 'ok' })
    if (p.endsWith('/api/user/rename')) return api.renameStatus === 409 ? json({ error: 'Ese usuario ya está tomado' }, 409) : json({ status: 'ok' })
    // Default: the post-workout coach analysis
    return json(api.analysis || { analysis: 'Buen trabajo.', verdict: 'positive', _provider: 'test' })
  })
}

// Delivers payload-less pushes (like the Worker's) to the real Service Worker.
// Headless Chromium refuses notification permission, so the last step —
// handing the card to the OS — is recorded instead; everything before it (the
// push event, reading the staged spec, choosing the card) is the real SW.
async function pushProbe(page, context) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  const cdp = await context.newCDPSession(page)
  let registrationId = null
  cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    const mine = registrations.find(r => r.scopeURL === scope)
    if (mine) registrationId = mine.registrationId
  })
  await cdp.send('ServiceWorker.enable')
  await expect.poll(() => registrationId, { timeout: 5000 }).not.toBeNull()
  const sw = context.serviceWorkers()[0]
  const record = () => sw.evaluate(() => {
    self.__cards = []
    self.registration.showNotification = async (_title, opts) => { self.__cards.push(`${opts.tag}: ${opts.body}`) }
    self.registration.getNotifications = async () => []
  })
  await record()
  return {
    deliver: () => cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(scope).origin, registrationId, data: '' }),
    cards: () => sw.evaluate(() => self.__cards),
    clear: () => sw.evaluate(() => { self.__cards = [] }),
  }
}

// What the Service Worker caches when the OS start notification is tapped —
// Playwright can't tap a system notification, so the test stands in for it:
// the exercise payload + the flag, then the app comes back to the foreground.
async function tapRestNotification(page, payload, { burst = false } = {}) {
  await page.evaluate(async ([p, burst]) => {
    const cache = await caches.open('rest-pending')
    if (p) await cache.put('/pending', new Response(JSON.stringify(p)))
    await cache.put('/from-notification', new Response('1'))
    // iOS fires the foreground events back-to-back on a notification tap
    window.dispatchEvent(new Event('focus'))
    if (burst) {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    }
    await new Promise(r => setTimeout(r, 400))
  }, [payload, burst])
}

/** What a Service Worker cache holds under /pending (null when empty) */
function cached(page, cacheName) {
  return page.evaluate(async (name) => {
    const res = await (await caches.open(name)).match('/pending')
    return res ? res.json() : null
  }, cacheName)
}

// Saltar hides the timer first and clears its caches after. A rest staged
// before that finishes would be wiped, or ignored as "already running".
async function waitRestCleared(page) {
  await expect.poll(() => page.evaluate(async () => {
    const timer = await (await caches.open('rest-timer')).match('/pending')
    const pending = await (await caches.open('rest-pending')).match('/pending')
    return !timer && !pending
  })).toBe(true)
}

async function goOffline(page, context) {
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
}

module.exports = { mockWorker, pushProbe, tapRestNotification, cached, waitRestCleared, goOffline }
