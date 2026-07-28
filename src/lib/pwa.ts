export const APP_VERSION = 'v1.98 · 2026-07-28 · Advanced per-set tracking, exercise dictionary expansion'

let deferredPrompt: any = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  })
}

export async function installPWA() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
}
