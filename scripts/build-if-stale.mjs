// Runs the build only when its output is older than what it's built from.
// Used by Playwright's webServer so a second test run doesn't rebuild for nothing.
//   node scripts/build-if-stale.mjs        → build/    (npm run build, GitHub Pages)
//   node scripts/build-if-stale.mjs cf     → build-cf/ (npm run build:cf, Cloudflare)
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SOURCES = ['src', 'static', 'svelte.config.js', 'vite.config.ts', 'package-lock.json']
const TARGETS = {
  pages: { output: 'build/index.html', command: 'npm run build' },
  cf: { output: 'build-cf/index.html', command: 'npm run build:cf' },
}
const target = TARGETS[process.argv[2] || 'pages']

function newestMtime(path) {
  const st = statSync(path)
  if (!st.isDirectory()) return st.mtimeMs
  return readdirSync(path).reduce((max, name) => Math.max(max, newestMtime(join(path, name))), st.mtimeMs)
}

const stale = !existsSync(target.output)
  || SOURCES.filter(existsSync).some((p) => newestMtime(p) > statSync(target.output).mtimeMs)

if (stale) execSync(target.command, { stdio: 'inherit' })
else console.log(`${target.output} is up to date, skipping ${target.command}`)
