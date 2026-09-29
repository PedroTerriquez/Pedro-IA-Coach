import { readable } from 'svelte/store'

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

// Tracks the browser's connectivity. Local features keep working offline;
// anything that talks to the Worker (AI, friends, push) reads this to say
// "Requiere internet" instead of failing.
export const online = readable<boolean>(isOnline(), (set) => {
  if (typeof window === 'undefined') return
  const update = () => set(isOnline())
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  update()
  return () => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  }
})
