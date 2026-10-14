// Regenerates design-system/ from the running preview build.
//   npm run build && npm run preview -- --port 8080 --strictPort   (in another shell)
//   node scripts/ds/build.mjs [grupo ...]      e.g. node scripts/ds/build.mjs hoy plan
// See docs/design-system.md.
import { chromium } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { card, manifest, OUT_DIR } from './capture.mjs'
import * as S from './seed.mjs'
import { groups } from './groups.mjs'

const BASE = 'http://localhost:8080/Pedro-IA-Coach/'
const only = process.argv.slice(2)
// The app is an iPhone PWA: iOS-only UI (install guide) needs Safari's UA to show up.
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// Only the generated folders are wiped; hand-made proposals elsewhere in design-system/ stay.
if (!only.length) for (const d of ['vistas', 'shell', 'compartidos']) await rm(OUT_DIR + d, { recursive: true, force: true })
const browser = await chromium.launch()

/** Fresh browser context per group: each group seeds its own world once. */
async function open(data, { friends = S.friends, registered = true } = {}) {
  // Search finds league members too, so a result can show "En tu liga".
  const users = [...friends, { username: 'Sofía', streak: 7, exercisedToday: true }, { username: 'Sofi_fit', streak: 1, exercisedToday: false }]
  const search = (url) => {
    const q = (new URL(url).searchParams.get('q') || '').toLowerCase()
    return users.filter((u) => u.username.toLowerCase().includes(q))
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', userAgent: IPHONE_SAFARI })
  const page = await ctx.newPage()
  await page.route(/\/api\//, (route) => {
    const url = route.request().url()
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes('/api/friends/list')) return json({ friends })
    if (url.includes('/api/friends/search')) return json({ results: search(url) })
    if (url.includes('/api/user/check')) return json({ exists: registered })
    if (url.includes('/api/ai/exercise-coach')) return json({ reply: 'Baja la barra controlada en 2 segundos y aprieta las escápulas antes de empujar. Si el codo se abre de más, reduce 5 kg.', _provider: 'test' })
    return json({ status: 'ok', analysis: 'Buen trabajo hoy, Pedro. Subiste carga en Press Banca sin perder repeticiones.', verdict: 'positive', proximo_objetivo: 'Press Banca → 77.5 kg @ RIR 1-2', recommendations: ['Sube Press Banca 2.5 kg la próxima sesión', 'Mantén Press Militar una semana más'], rotation_topic: 'comparativa', _provider: 'test' })
  })
  await page.goto(BASE + 'today')
  await page.waitForTimeout(500)
  await S.seed(page, data)
  page.go = async (route) => {
    await page.goto(BASE + route)
    await page.waitForTimeout(900)
  }
  page.card = (opts) => card(page, opts)
  return page
}

for (const [name, run] of Object.entries(groups)) {
  if (only.length && !only.includes(name)) continue
  console.log(`\n— ${name}`)
  await run({ open, S })
}

await browser.close()
await mkdir(OUT_DIR, { recursive: true })
await writeFile(OUT_DIR + `.manifest-${only.join('-') || 'all'}.json`, JSON.stringify(manifest, null, 2))
