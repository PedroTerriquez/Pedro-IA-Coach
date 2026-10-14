// Renders generated cards to PNG so a capture can be eyeballed before upload.
//   node scripts/ds/preview.mjs <outDir> [substring ...]
import { chromium } from '@playwright/test'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { OUT_DIR } from './capture.mjs'

const [out, ...filters] = process.argv.slice(2)
await mkdir(out, { recursive: true })

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (e.name.endsWith('.html')) yield p
  }
}

const browser = await chromium.launch()
const shots = []
for await (const file of walk(OUT_DIR)) {
  if (filters.length && !filters.some((f) => file.includes(f))) continue
  const first = (await readFile(file, 'utf8')).split('\n', 1)[0]
  const [w, h] = (first.match(/viewport="(\d+)x(\d+)"/) ?? [0, 820, 600]).slice(1).map(Number)
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto('file://' + file)
  await page.waitForTimeout(700)
  const name = file.slice(OUT_DIR.length).replace(/\/index\.html$/, '').replaceAll('/', '__') + '.png'
  await page.screenshot({ path: join(out, name) })
  await page.close()
  shots.push(name)
  console.log(name, `${Math.round((await readFile(file)).length / 1024)}kB`)
}

// One contact sheet with every card, to review a whole group at a glance.
const tiles = shots.map((n) => `<figure><img src="${n}"><figcaption>${n.replace('.png', '').replace('vistas__', '')}</figcaption></figure>`).join('')
const sheet = await browser.newPage({ viewport: { width: 1500, height: 800 } })
await writeFile(join(out, '_sheet.html'), `<style>body{margin:0;background:#222;display:flex;flex-wrap:wrap;gap:10px;padding:10px;font:11px monospace;color:#fff}figure{margin:0}img{height:520px;display:block;border:1px solid #555}</style>${tiles}`)
await sheet.goto('file://' + join(out, '_sheet.html'))
await sheet.waitForTimeout(500)
await sheet.screenshot({ path: join(out, '_sheet.png'), fullPage: true })
await browser.close()
