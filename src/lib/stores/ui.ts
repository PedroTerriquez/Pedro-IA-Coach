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
