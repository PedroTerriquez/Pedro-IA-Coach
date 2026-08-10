import { writable } from 'svelte/store'

const KEY = 'admin_reviewed'

export type ReviewedNamespaces = Record<string, string[]>

function load(): ReviewedNamespaces {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      // Legacy flat array (pre-namespacing): all ids belonged to the dictionary tab.
      return { dict: parsed.filter((x) => typeof x === 'string') }
    }
    if (parsed && typeof parsed === 'object') {
      const out: ReviewedNamespaces = {}
      for (const [ns, ids] of Object.entries(parsed)) {
        out[ns] = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}

export const reviewed = writable<ReviewedNamespaces>(load())

export function toggleReviewed(namespace: string, id: string) {
  reviewed.update((all) => {
    const ids = all[namespace] ?? []
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    const result = { ...all, [namespace]: next }
    try {
      localStorage.setItem(KEY, JSON.stringify(result))
    } catch {
      // localStorage unavailable — keep in-memory state for this session
    }
    return result
  })
}
