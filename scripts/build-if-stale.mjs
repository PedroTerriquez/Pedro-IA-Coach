// Runs `npm run build` only when build/ is older than what it's built from.
// Used by Playwright's webServer so a second test run doesn't rebuild for nothing.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SOURCES = ['src', 'static', 'svelte.config.js', 'vite.config.ts', 'package-lock.json']
const OUTPUT = 'build/index.html'

function newestMtime(path) {
  const st = statSync(path)
  if (!st.isDirectory()) return st.mtimeMs
  return readdirSync(path).reduce((max, name) => Math.max(max, newestMtime(join(path, name))), st.mtimeMs)
}

const stale = !existsSync(OUTPUT)
  || SOURCES.filter(existsSync).some((p) => newestMtime(p) > statSync(OUTPUT).mtimeMs)

if (stale) execSync('npm run build', { stdio: 'inherit' })
else console.log('build/ is up to date, skipping npm run build')
