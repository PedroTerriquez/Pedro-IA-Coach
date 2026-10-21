import { writable } from 'svelte/store'
import type { Settings } from '$lib/types'
import * as storage from '$lib/storage'

function readLangFromBackup(): string {
  try {
    if (typeof localStorage === 'undefined') return 'es'
    const direct = localStorage.getItem('exerciseLang')
    if (direct === 'en' || direct === 'es') return direct
    const raw = localStorage.getItem('idb_backup_settings')
    if (raw) {
      const s = JSON.parse(raw)
      if (s.language === 'en' || s.language === 'es') return s.language
    }
  } catch {}
  return 'es'
}

function createSettingsStore() {
  const initialLang = readLangFromBackup()

  let queue: Promise<void> = Promise.resolve()

  const store = writable<Settings>({
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false,
    pushServerUrl: '', language: initialLang, fontScale: 1,
    onboarded: false, onboardingStep: 0, debugAI: false
  })

  return {
    ...store,
    load: async () => {
      const s = await storage.getSettings()
      if (s) {
        store.set(s)
      }
    },
    // One at a time: each update reads what's stored and writes it back merged,
    // so two running together would each miss the other's change
    update: (partial: Partial<Settings>) => {
      const run = async () => {
        const current = await storage.getSettings()
        const merged = { ...current, ...partial }
        await storage.saveSettings(merged)
        store.set(merged)
        if (merged.language) {
          try { localStorage.setItem('exerciseLang', merged.language) } catch {}
        }
      }
      const done = queue.then(run, run)
      queue = done.catch(() => {})
      return done
    }
  }
}

export const settings = createSettingsStore()
