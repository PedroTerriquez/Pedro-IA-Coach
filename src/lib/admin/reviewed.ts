import { writable } from 'svelte/store'

const KEY = 'admin_reviewed'

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const reviewed = writable<string[]>(load())

export function toggleReviewed(id: string) {
  reviewed.update((ids) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // localStorage unavailable — keep in-memory state for this session
    }
    return next
  })
}
