const { defineConfig } = require('@playwright/test')
const { takeTestLock } = require('./scripts/test-lock.cjs')

// Other agent sessions share this checkout: wait for their run to end first.
// The suite owns port 8090 (8080 is for scripts/ds and gets killed by hand);
// once the lock is ours, anything still on 8090 is a leftover and is stopped.
const PORT = 8090
takeTestLock(PORT)

module.exports = defineConfig({
  testDir: './tests',
  // Fail fast: the tests apart take a few seconds; the full user flow sets its
  // own budget and a 5 s per-action timeout (its rests run on a fake clock).
  timeout: 30000,
  maxFailures: 1,
  retries: 0,
  // Every test() in big.spec.cjs is self-contained (own context, own IndexedDB),
  // so they spread across workers. Capped so timing-based steps (5 s rests,
  // auto-dismissing toasts) don't starve the machine.
  fullyParallel: true,
  workers: 3,
  use: {
    // Trailing slash matters: relative goto('today') resolves against this as a
    // directory. Without it, 'today' would replace the last path segment instead
    // of appending to it, dropping the /Pedro-IA-Coach base entirely.
    baseURL: `http://localhost:${PORT}/Pedro-IA-Coach/`,
    headless: true,
    viewport: { width: 390, height: 844 },
    // Sheets, toasts and fades finish at once (app.css honors reduced motion)
    reducedMotion: 'reduce',
    browserName: 'chromium',
    // The headless GPU compositor (SwiftShader) stalls at random under load: a
    // click "performing click action" never gets its input ack and the run hangs.
    // Software compositing doesn't.
    launchOptions: { args: ['--disable-gpu'] },
  },
  webServer: {
    // Plain static servers (e.g. http-server) don't know about SvelteKit's
    // configured base path (/Pedro-IA-Coach) — only `vite preview` does,
    // since it reads the same svelte.config.js used to build the app.
    // --host :: listens on IPv4 and IPv6: plain `localhost` binds ::1 only and
    // Chromium sometimes dials 127.0.0.1 (ERR_CONNECTION_REFUSED).
    // build-if-stale: rebuilds only when src/, static/ or the config changed.
    command: `node scripts/build-if-stale.mjs && npm run preview -- --port ${PORT} --strictPort --host ::`,
    url: `http://localhost:${PORT}/Pedro-IA-Coach`,
    // The build alone can take over a minute; the default 60s wait isn't enough.
    timeout: 180000,
    // Never reuse: a server left on the port may serve an old build.
    reuseExistingServer: false,
  },
})
