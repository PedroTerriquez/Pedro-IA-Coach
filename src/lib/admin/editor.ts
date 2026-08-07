import { derived, get, writable } from 'svelte/store'
import { toast } from '$lib/stores/ui'
import type { LineKind } from './media-file'

export interface PendingDraft { entryId: string; kind: LineKind; url: string }

const drafts = writable<PendingDraft[]>([])

export const draftCount = derived(drafts, (d) => d.length)

export function queueReplace(entryId: string, kind: LineKind, url: string) {
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

export function resetDrafts() {
  drafts.set([])
}

export async function saveDrafts(): Promise<boolean> {
  const list = get(drafts)
  if (!list.length) {
    toast.show('No hay cambios pendientes')
    return false
  }
  let json: { applied?: number; notFound?: string[]; error?: string }
  try {
    const res = await fetch('/__admin/dictionary-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: list })
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
