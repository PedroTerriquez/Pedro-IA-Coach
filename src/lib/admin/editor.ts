import { derived, get, writable } from 'svelte/store'
import { toast } from '$lib/stores/ui'
import type { ChangeRequest, LineKind } from './media-file'

export interface PendingDraft { entryId: string; kind: Exclude<LineKind, 'aliases'>; url: string }

const drafts = writable<PendingDraft[]>([])
const pendingAliases = writable<Record<string, string[]>>({})

export const draftCount = derived([drafts, pendingAliases], ([d, a]) => d.length + Object.keys(a).length)

export const pendingAliasesMap = derived(pendingAliases, (m) => m)

export function queueReplace(entryId: string, kind: Exclude<LineKind, 'aliases'>, url: string) {
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

export function queueSetAliases(entryId: string, aliases: string[]) {
  pendingAliases.update((m) => {
    if (aliases.length === 0) {
      const { [entryId]: _, ...rest } = m
      return rest
    }
    return { ...m, [entryId]: aliases }
  })
}

export function resetDrafts() {
  drafts.set([])
  pendingAliases.set({})
}

export async function saveDrafts(): Promise<boolean> {
  const media = get(drafts)
  const aliases = get(pendingAliases)
  const changes: ChangeRequest[] = [
    ...media.map((d) => ({ entryId: d.entryId, kind: d.kind, url: d.url })),
    ...Object.entries(aliases).map(([entryId, list]) => ({ entryId, kind: 'aliases' as const, aliases: list }))
  ]
  if (!changes.length) {
    toast.show('No hay cambios pendientes')
    return false
  }
  let json: { applied?: number; notFound?: string[]; error?: string }
  try {
    const res = await fetch('/__admin/dictionary-save', {
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
  resetDrafts()
  return true
}
