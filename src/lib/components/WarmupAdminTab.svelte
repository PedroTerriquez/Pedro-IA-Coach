<script lang="ts">
  import AdminCard from './AdminCard.svelte'
  import AdminFilters from './AdminFilters.svelte'
  import EmptyState from './EmptyState.svelte'
  import MediaPickerDialog from './MediaPickerDialog.svelte'
  import { reviewed, toggleReviewed } from '$lib/admin/reviewed'
  import { queueWarmupReplace, queueWarmupSetName, warmupPendingMediaMap, warmupPendingNamesMap } from '$lib/admin/warmup-editor'
  import type { WarmupEntry } from '$lib/data/exercise-warmup'

  let {
    mode,
    entries,
    accent = 'var(--accent)'
  }: {
    mode: 'warmup' | 'stretch'
    entries: WarmupEntry[]
    accent?: string
  } = $props()

  let query = $state('')
  let muscle = $state('')
  let picker = $state<{ entryId: string; kind: 'image' | 'gif' } | null>(null)

  const scoped = $derived(entries.filter((e) => e.kind === mode))

  const adminEntries = $derived(
    scoped.map((e) => {
      const pending = $warmupPendingMediaMap[e.id]
      return {
        id: e.id,
        name: e.es,
        muscle: e.muscle,
        image: pending?.image ?? e.image,
        gif: pending?.gif ?? e.gif
      }
    })
  )

  const muscles = $derived([...new Set(adminEntries.map((e) => e.muscle).filter(Boolean))].sort())

  const reviewedSet = $derived(new Set($reviewed.warmup ?? []))

  const reviewedCount = $derived(adminEntries.filter((e) => reviewedSet.has(e.id)).length)

  const visibleEntries = $derived(
    adminEntries.filter((e) => {
      if (muscle && e.muscle !== muscle) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [e.name, e.id].some((s) => s.toLowerCase().includes(q))
    })
  )

  function onEdit(entryId: string, kind: 'image' | 'gif') {
    picker = { entryId, kind }
  }

  function onPick(url: string) {
    const p = picker
    if (!p) return
    queueWarmupReplace(p.entryId, p.kind, url)
    picker = null
  }

  const pickerEntry = $derived(
    (() => {
      const p = picker
      if (!p) return null
      return adminEntries.find((e) => e.id === p.entryId) ?? null
    })()
  )
</script>

<AdminFilters
  {query}
  {muscle}
  {muscles}
  {accent}
  onquery={(v) => (query = v)}
  onmuscle={(v) => (muscle = v)}
/>

<div class="count">
  {visibleEntries.length} ejercicios · {reviewedCount} revisados
</div>

<div class="list">
  {#each visibleEntries as e}
    <AdminCard
      {accent}
      entry={e}
      showAliases={false}
      reviewed={reviewedSet.has(e.id)}
      pendingName={$warmupPendingNamesMap[e.id]}
      onedit={onEdit}
      ontoggle={() => toggleReviewed('warmup', e.id)}
      onrename={(id, name) => queueWarmupSetName(id, name)}
    />
  {/each}
</div>

{#if !visibleEntries.length}
  <EmptyState message="Sin resultados" />
{/if}

{#if picker && pickerEntry}
  <MediaPickerDialog
    open
    kind={picker.kind}
    current={picker.kind === 'image' ? pickerEntry.image : pickerEntry.gif}
    name={pickerEntry.name}
    {accent}
    onpick={onPick}
    onclose={() => (picker = null)}
  />
{/if}

<style>
  .count { font-size: 11px; opacity: 0.55; font-family: var(--font-mono); margin-bottom: 8px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
</style>
