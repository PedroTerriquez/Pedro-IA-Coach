import { writable } from 'svelte/store'

export interface SessionState {
  warmupDone: boolean
  trainingDone: boolean
  stretchDone: boolean
  currentExerciseIdx: number
}

function createSessionStore() {
  const initial: SessionState = {
    warmupDone: false,
    trainingDone: false,
    stretchDone: false,
    currentExerciseIdx: 0,
  }
  const { subscribe, set, update } = writable<SessionState>(initial)

  return {
    subscribe,
    set,
    update,
    reset: () => set(initial),
  }
}

export const session = createSessionStore()
