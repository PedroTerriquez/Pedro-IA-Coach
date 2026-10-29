import { writable } from 'svelte/store'

export interface RestTimerState {
  active: boolean
  name: string
  restSec: number
  remaining: number
  tag: string
  exerciseId: string
  sets: number
  reps: string
}

export interface ToastState {
  message: string
  visible: boolean
  isError: boolean
}

function createRestTimerStore() {
  return writable<RestTimerState | null>(null)
}

function createToastStore() {
  const { subscribe, set, update } = writable<ToastState>({ message: '', visible: false, isError: false })
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return {
    subscribe,
    show: (message: string, isError = false, duration = 3500) => {
      if (timeoutId) clearTimeout(timeoutId)
      set({ message, visible: true, isError })
      timeoutId = setTimeout(() => {
        set({ message: '', visible: false, isError: false })
      }, duration)
    }
  }
}

export const restTimer = createRestTimerStore()
export const toast = createToastStore()

// The rest timer collapsed to its banner. Hoy hides its dock under it and the
// detail sheet hides its LogDock, since the banner takes the thumb zone.
export const restMinimized = writable(false)

// «Confirma tus series» saved for this exercise: the detail moves on to the next one.
export const seriesConfirmed = writable<string | null>(null)

// Detail-style sheets open right now: the banner and the offline notice move
// into the sheet while one is up.
export const detailSheetsOpen = writable(0)
