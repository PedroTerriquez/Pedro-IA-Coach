import { derived, get, writable } from 'svelte/store'
import { toast } from '$lib/stores/ui'
import type { ChangeRequest, LineKind } from './media-file'

export interface WarmupDraft { entryId: string; kind: Exclude<LineKind, 'aliases'>; url: string }

const drafts = writable<WarmupDraft[]>([])
const pendingNames = writable<Record<string, string>>({})

export const warmupDraftCount = derived([drafts, pendingNames], ([d, n]) => d.length + Object.keys(n).length)

export const warmupPendingNamesMap = derived(pendingNames, (m) => m)

export const warmupPendingMediaMap = derived(drafts, (d) => {
  const m: Record<string, { image?: string; gif?: string }> = {}
  for (const item of d) {
    m[item.entryId] = { ...(m[item.entryId] || {}), [item.kind]: item.url }
  }
  return m
})

export function queueWarmupReplace(entryId: string, kind: Exclude<LineKind, 'aliases'>, url: string) {
  const trimmed = url?.trim()
  if (!trimmed) {
    toast.show('URL vacía, no se guardó nada')
    return
  }
  drafts.update((list) => {
    const idx = list.findIndex((d) => d.entryId === entryId && d.kind === kind)
    if (idx === -1) return [...list, { entryId, kind, url: trimmed }]
    const copy = [...list]
    copy[idx] = { entryId, kind, url: trimmed }
    return copy
  })
}

export function queueWarmupSetName(entryId: string, name: string) {
  const trimmed = name?.trim()
  if (!trimmed) return
  pendingNames.update((m) => ({ ...m, [entryId]: trimmed }))
}

function resetWarmupDrafts() {
  drafts.set([])
  pendingNames.set({})
}

export async function saveWarmupDrafts(): Promise<boolean> {
  const media = get(drafts)
  const names = get(pendingNames)
  const changes: ChangeRequest[] = [
    ...media.map((d) => ({ entryId: d.entryId, kind: d.kind, url: d.url })),
    ...Object.entries(names).map(([entryId, name]) => ({ entryId, kind: 'name' as const, name }))
  ]
  if (!changes.length) {
    toast.show('No hay cambios pendientes')
    return false
  }
  let json: { applied?: number; notFound?: string[]; error?: string }
  try {
    const res = await fetch('/__admin/warmup-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes })
    })
    json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  } catch (err) {
    toast.show(`Error al guardar: ${(err as Error)?.message || err}`, true)
    return false
  }
  if (json.notFound?.length) toast.show(`No encontradas: ${json.notFound.join(', ')}`, true)
  if (json.applied) toast.show(`Guardado: ${json.applied} cambio${json.applied === 1 ? '' : 's'}`)
  resetWarmupDrafts()
  return true
}
