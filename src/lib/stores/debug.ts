import { writable } from 'svelte/store'

export interface AIExchange {
  label: string
  endpoint: string
  request: unknown
  response: unknown
  ts: string
}

export const DEBUG_PASSWORD = 'patitofeo'
export const lastAIExchange = writable<AIExchange | null>(null)
