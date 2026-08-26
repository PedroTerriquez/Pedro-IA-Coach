import { writable, derived } from 'svelte/store'

export interface AIExchange {
  label: string
  endpoint: string
  request: unknown
  response: unknown
  ts: string
}

export const DEBUG_PASSWORD = 'patitofeo'
export const lastAIExchange = writable<AIExchange | null>(null)

const MAX_CHARS = 100000

function fmt(v: unknown): string {
  let s = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  if (s && s.length > MAX_CHARS) s = s.slice(0, MAX_CHARS) + '\n…[truncado]'
  return s || '(vacío)'
}

export function formatExchange(ex: AIExchange | null): string {
  if (!ex) return 'Aún no hay intercambios con la IA. Usa Importar, Generar o algún Coach y vuelve aquí.'
  return `[${ex.ts}] ${ex.label} → ${ex.endpoint}\n\n── REQUEST ──\n${fmt(ex.request)}\n\n── RESPONSE ──\n${fmt(ex.response)}`
}

function createExchangeStore() {
  const { subscribe, update } = writable<Map<string, AIExchange>>(new Map())

  return {
    subscribe,
    record(label: string, exchange: Omit<AIExchange, 'label'>) {
      update(map => {
        map.set(label, { ...exchange, label })
        return map
      })
      lastAIExchange.set({ ...exchange, label })
    },
    get(label: string): AIExchange | null {
      let result: AIExchange | null = null
      subscribe(map => { result = map.get(label) ?? null })()
      return result
    }
  }
}

export const aiExchanges = createExchangeStore()
