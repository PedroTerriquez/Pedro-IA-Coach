<script lang="ts">
  import MediaPicker from './MediaPicker.svelte'
  import AdminCard from './AdminCard.svelte'
  import CenterDialog from './CenterDialog.svelte'
  import SearchInput from './SearchInput.svelte'
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

<div class="filters">
  <SearchInput value={query} oninput={(v) => (query = v)} placeholder="Buscar por nombre o id…" />
  <div class="chips">
    <button class:active={!muscle} class="chip" onclick={() => (muscle = '')}>Todos</button>
    {#each muscles as m}
      <button class:active={muscle === m} class="chip" onclick={() => (muscle = m)}>{m}</button>
    {/each}
  </div>
</div>

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
  <div class="empty">Sin resultados</div>
{/if}

<CenterDialog open={!!picker} onclose={() => (picker = null)}>
  {#if picker && pickerEntry}
    <div class="picker-head">
      <div class="picker-title">{pickerEntry.name}</div>
      <button class="dialog-close" onclick={() => (picker = null)}>✕</button>
    </div>
    <MediaPicker
      kind={picker.kind}
      current={picker.kind === 'image' ? pickerEntry.image : pickerEntry.gif}
      {accent}
      related={[]}
      exerciseName={pickerEntry.name}
      onpick={onPick}
    />
  {/if}
</CenterDialog>

<style>
  .filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text); border-radius: 9999px; padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: var(--font-mono); }
  .chip.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .count { font-size: 11px; opacity: 0.55; font-family: var(--font-mono); margin-bottom: 8px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .empty { text-align: center; opacity: 0.5; padding: 40px 0; }
  .picker-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
  .picker-title { font-family: var(--font-sans); font-weight: 700; color: var(--text); }
  .dialog-close { background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px; }
</style>
