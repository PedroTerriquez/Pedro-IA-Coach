const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    // Trailing slash matters: relative goto('today') resolves against this as a
    // directory. Without it, 'today' would replace the last path segment instead
    // of appending to it, dropping the /training-with-pedro base entirely.
    baseURL: 'http://localhost:8080/training-with-pedro/',
    headless: true,
    viewport: { width: 390, height: 844 },
    browserName: 'chromium',
  },
  webServer: {
    // Plain static servers (e.g. http-server) don't know about SvelteKit's
    // configured base path (/training-with-pedro) — only `vite preview` does,
    // since it reads the same svelte.config.js used to build the app.
    command: 'npm run build && npm run preview -- --port 8080 --strictPort',
    url: 'http://localhost:8080/training-with-pedro',
    reuseExistingServer: !process.env.CI,
  },
})
