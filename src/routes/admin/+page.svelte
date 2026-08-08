<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { EXERCISE_DICTIONARY } from '$lib/data/exercise-dictionary'
  import { draftCount, saveDrafts } from '$lib/admin/editor'
  import { queueReplace } from '$lib/admin/editor'
  import { reviewed, toggleReviewed } from '$lib/admin/reviewed'
  import MediaPicker from '$lib/components/MediaPicker.svelte'
  import AdminCard from '$lib/components/AdminCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import Button from '$lib/components/Button.svelte'
  import Chip from '$lib/components/Chip.svelte'

  const isDev = import.meta.env.DEV

  let query = $state('')
  let muscle = $state('')
  let letter = $state('A')
  let showReviewed = $state(false)
  let picker = $state<{ entryId: string; kind: 'image' | 'gif' } | null>(null)
  let saving = $state(false)

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const firstLetter = (e: { name: string }) => norm(e.name.trim().charAt(0)).toUpperCase()

  const adminEntries = $derived(
    EXERCISE_DICTIONARY.map((e) => ({
      id: e.id,
      name: e.es,
      muscle: e.muscle,
      image: e.image as string | undefined,
      gif: e.gif as string | undefined
    }))
  )

  const muscles = $derived([...new Set(adminEntries.map((e) => e.muscle).filter(Boolean))].sort())

  const letters = $derived(
    [...new Set(adminEntries.map(firstLetter))].filter((c) => /[A-Z]/.test(c)).sort()
  )

  const reviewedSet = $derived(new Set($reviewed))

  const reviewedCount = $derived($reviewed.length)

  const visibleEntries = $derived(
    adminEntries.filter((e) => {
      if (!showReviewed && reviewedSet.has(e.id)) return false
      if (muscle && e.muscle !== muscle) return false
      if (letter && firstLetter(e) !== letter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [e.name, e.id].some((s) => s.toLowerCase().includes(q))
    })
  )

  const count = $derived($draftCount)

  async function onSave() {
    saving = true
    await saveDrafts()
    saving = false
  }

  function onEdit(entryId: string, kind: 'image' | 'gif') {
    picker = { entryId, kind }
  }

  function onPick(url: string) {
    const p = picker
    if (!p) return
    queueReplace(p.entryId, p.kind, url)
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

<svelte:head><title>Admin Media</title></svelte:head>

<div class="admin-page">
  <div class="admin-header">
    <div>
      <button class="back" onclick={() => goto(ROUTES.you)}>← Tú</button>
      <h1 class="title">Diccionario · Media</h1>
      <p class="subtitle">{EXERCISE_DICTIONARY.length} ejercicios — revisa y corrige image/gif</p>
    </div>
    {#if isDev}
      <Button id="save-dict" accent="var(--accent)" onclick={onSave} disabled={saving || count === 0}>
        Guardar ({count})
      </Button>
    {:else}
      <Chip>solo lectura</Chip>
    {/if}
  </div>

  {#if !isDev}
    <div class="prod-note">El admin de media solo permite editar en local con <span class="mono">npm run dev</span>.</div>
  {/if}

  <div class="filters">
    <SearchInput value={query} oninput={(v) => (query = v)} placeholder="Buscar por nombre o id…" />
    <div class="letters">
      {#each letters as l}
        <button class:active={letter === l} class="chip letter" onclick={() => (letter = l)}>{l}</button>
      {/each}
    </div>
    <div class="chips">
      <button class:active={!muscle} class="chip" onclick={() => (muscle = '')}>Todos</button>
      {#each muscles as m}
        <button class:active={muscle === m} class="chip" onclick={() => (muscle = m)}>{m}</button>
      {/each}
    </div>
    <div class="chips">
      <button
        id="toggle-reviewed"
        class="chip"
        class:active={showReviewed}
        onclick={() => (showReviewed = !showReviewed)}
      >
        {showReviewed ? 'Ocultar revisados' : `Ver revisados (${reviewedCount})`}
      </button>
    </div>
  </div>

  <div class="count">{visibleEntries.length} ejercicios</div>

  <div class="list">
    {#each visibleEntries as e}
      <AdminCard
        accent="var(--accent)"
        entry={e}
        reviewed={reviewedSet.has(e.id)}
        onedit={onEdit}
        ontoggle={() => toggleReviewed(e.id)}
      />
    {/each}
  </div>

  {#if !visibleEntries.length}
    <div class="empty">Sin resultados</div>
  {/if}
</div>

<CenterDialog open={!!picker} onclose={() => (picker = null)}>
  {#if picker && pickerEntry}
    <div class="picker-head">
      <div class="picker-title">{pickerEntry.name}</div>
      <button class="dialog-close" onclick={() => (picker = null)}>✕</button>
    </div>
    <MediaPicker
      kind={picker.kind}
      current={picker.kind === 'image' ? pickerEntry.image : pickerEntry.gif}
      accent="var(--accent)"
      onpick={onPick}
    />
  {/if}
</CenterDialog>

<style>
  .admin-page { padding: 16px; max-width: 720px; margin: 0 auto; }
  .admin-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
  .back { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; font-family: var(--font-sans); padding: 0; }
  .title { font-family: var(--font-sans); font-size: 22px; font-weight: 700; color: var(--text); margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { font-size: 12px; opacity: 0.6; margin: 0; }
  .prod-note { background: rgba(255,180,60,0.1); border: 1px solid rgba(255,180,60,0.3); color: #ffc266; border-radius: 12px; padding: 10px 14px; font-size: 12px; margin-bottom: 14px; }
  .filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
  .letters { display: flex; flex-wrap: wrap; gap: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text); border-radius: 9999px; padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: var(--font-mono); }
  .chip.letter { padding: 5px 9px; min-width: 26px; text-align: center; }
  .chip.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .count { font-size: 11px; opacity: 0.55; font-family: var(--font-mono); margin-bottom: 8px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .empty { text-align: center; opacity: 0.5; padding: 40px 0; }
  .picker-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
  .picker-title { font-family: var(--font-sans); font-weight: 700; color: var(--text); }
  .dialog-close { background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px; }
  .mono { font-family: var(--font-mono); }
</style>
