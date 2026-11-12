// Guard for the Cloudflare build (spec 2026-10-14, Fase B): the version people
// reach on Cloudflare must not point back to the repo. Fails (exit 1) listing
// every file with a sourcemap or a repo trace.
//   node scripts/check-cf-build.mjs [dir]     (default: build-cf)
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const DIR = process.argv[2] || 'build-cf'
const TRACES = [/pedro-ia-coach/i, /pedroterriquez/i]
const TEXT = /\.(html|js|css|json|txt|webmanifest|svg|xml)$/

async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else yield p
  }
}

function isSourcemap(path) {
  return path.endsWith('.map')
}

async function traceIn(path) {
  if (!TEXT.test(path)) return null
  const text = await readFile(path, 'utf8')
  const hit = TRACES.find((re) => re.test(text))
  return hit ? text.match(hit)[0] : null
}

async function problems(dir) {
  const found = []
  for await (const path of files(dir)) {
    const rel = relative(dir, path)
    if (isSourcemap(path)) found.push(`${rel}: sourcemap`)
    const trace = await traceIn(path)
    if (trace) found.push(`${rel}: contiene «${trace}»`)
  }
  return found
}

const found = await problems(DIR).catch((err) => [`${DIR}: ${err.message}`])
if (found.length) {
  console.error(`✗ El build de Cloudflare (${DIR}) apunta al repo:\n  ${found.join('\n  ')}`)
  process.exit(1)
}
console.log(`✓ ${DIR}: sin sourcemaps ni rastro del repo`)
