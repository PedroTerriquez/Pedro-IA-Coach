const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  // Fail fast: the slowest healthy test (besides the 25s full flow, which sets
  // its own 60s) takes ~13s, and the first failure stops the run.
  timeout: 30000,
  maxFailures: 1,
  retries: 0,
  // Every test() in big.spec.cjs is self-contained (own context, own IndexedDB),
  // so they spread across workers. Capped so timing-based tests (3s rests,
  // auto-dismissing overlays) don't starve the machine.
  fullyParallel: true,
  workers: 3,
  use: {
    // Trailing slash matters: relative goto('today') resolves against this as a
    // directory. Without it, 'today' would replace the last path segment instead
    // of appending to it, dropping the /Pedro-IA-Coach base entirely.
    baseURL: 'http://localhost:8080/Pedro-IA-Coach/',
    headless: true,
    viewport: { width: 390, height: 844 },
    browserName: 'chromium',
  },
  webServer: {
    // Plain static servers (e.g. http-server) don't know about SvelteKit's
    // configured base path (/Pedro-IA-Coach) — only `vite preview` does,
    // since it reads the same svelte.config.js used to build the app.
    // --host :: listens on IPv4 and IPv6: plain `localhost` binds ::1 only and
    // Chromium sometimes dials 127.0.0.1 (ERR_CONNECTION_REFUSED).
    command: 'npm run build && npm run preview -- --port 8080 --strictPort --host ::',
    url: 'http://localhost:8080/Pedro-IA-Coach',
    // The build alone can take over a minute; the default 60s wait isn't enough.
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
})
