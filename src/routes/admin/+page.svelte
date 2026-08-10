<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { EXERCISE_DICTIONARY } from '$lib/data/exercise-dictionary'
  import { draftCount, saveDrafts, queueReplace, queueSetAliases, queueSetName, pendingAliasesMap, pendingNamesMap, pendingMediaMap } from '$lib/admin/editor'
  import { reviewed, toggleReviewed } from '$lib/admin/reviewed'
  import MediaPicker from '$lib/components/MediaPicker.svelte'
  import AdminCard from '$lib/components/AdminCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import Chip from '$lib/components/Chip.svelte'

  const isDev = import.meta.env.DEV

  let dictionary = $state(EXERCISE_DICTIONARY)

  let query = $state('')
  let muscle = $state('')
  let letter = $state('A')
  let picker = $state<{ entryId: string; kind: 'image' | 'gif' } | null>(null)
  let saving = $state(false)

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const firstLetter = (e: { name: string }) => norm(e.name.trim().charAt(0)).toUpperCase()

  function buildTerms(en?: string, aliases: string[] = []): string[] {
    const words = [...(en ? [en] : []), ...aliases]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
    return [...new Set(words)].slice(0, 10)
  }

  const adminEntries = $derived(
    dictionary.map((e) => {
      const pending = $pendingMediaMap[e.id]
      return {
        id: e.id,
        name: e.es,
        muscle: e.muscle,
        en: e.en as string | undefined,
        aliases: (e.aliases as string[] | undefined) ?? [],
        image: pending?.image ?? (e.image as string | undefined),
        gif: pending?.gif ?? (e.gif as string | undefined)
      }
    })
  )

  const muscles = $derived([...new Set(adminEntries.map((e) => e.muscle).filter(Boolean))].sort())

  const letters = $derived(
    [...new Set(adminEntries.map(firstLetter))].filter((c) => /[A-Z]/.test(c)).sort()
  )

  const reviewedSet = $derived(new Set($reviewed))

  const letterPending = $derived(
    Object.fromEntries(
      letters.map((l) => [l, adminEntries.filter((e) => firstLetter(e) === l).filter((e) => !reviewedSet.has(e.id)).length])
    )
  )


  const reviewedCount = $derived($reviewed.length)

  const visibleEntries = $derived(
    adminEntries.filter((e) => {
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
    const media = $pendingMediaMap
    const aliases = $pendingAliasesMap
    const names = $pendingNamesMap
    const ok = await saveDrafts()
    saving = false
    if (ok) applySavedChanges(media, aliases, names)
  }

  function applySavedChanges(media: Record<string, { image?: string; gif?: string }>, aliases: Record<string, string[]>, names: Record<string, string>) {
    dictionary = dictionary.map((e) => {
      const m = media[e.id]
      const a = aliases[e.id]
      const n = names[e.id]
      if (!m && !a && n === undefined) return e
      return {
        ...e,
        ...(m?.image ? { image: m.image } : {}),
        ...(m?.gif ? { gif: m.gif } : {}),
        ...(a ? { aliases: a } : {}),
        ...(n !== undefined ? { es: n } : {})
      }
    })
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

  const pickerRelated = $derived(pickerEntry ? buildTerms(pickerEntry.en, pickerEntry.aliases) : [])
</script>

<svelte:head><title>Admin Media</title></svelte:head>

<div class="admin-page">
  <div class="admin-header">
    <div>
      <button class="back" onclick={() => goto(ROUTES.you)}>← Tú</button>
      <h1 class="title">Diccionario · Media · {reviewedCount}/{adminEntries.length}</h1>
      <p class="subtitle">
        {adminEntries.length} ejercicios · <strong>{reviewedCount} revisados</strong> · {adminEntries.length - reviewedCount} pendientes
      </p>
    </div>
    {#if !isDev}
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
        <button class:active={letter === l} class:done={letterPending[l] === 0} class="chip letter" onclick={() => (letter = l)}>{l}{#if letterPending[l] > 0}<span class="pending">{letterPending[l]}</span>{/if}</button>
      {/each}
    </div>
    <div class="chips">
      <button class:active={!muscle} class="chip" onclick={() => (muscle = '')}>Todos</button>
      {#each muscles as m}
        <button class:active={muscle === m} class="chip" onclick={() => (muscle = m)}>{m}</button>
      {/each}
    </div>
  </div>

  <div class="count">
    {visibleEntries.length} ejercicios · {reviewedCount} revisados
    <span class="hint">· marca ✓ para revisarlo; quedará en gris en la lista</span>
  </div>

  <div class="list">
    {#each visibleEntries as e}
      <AdminCard
        accent="var(--accent)"
        entry={e}
        reviewed={reviewedSet.has(e.id)}
        pendingAliases={$pendingAliasesMap[e.id]}
        pendingName={$pendingNamesMap[e.id]}
        onedit={onEdit}
        ontoggle={() => toggleReviewed(e.id)}
        onaliases={(id, list) => queueSetAliases(id, list)}
        onrename={(id, name) => queueSetName(id, name)}
      />
    {/each}
  </div>

  {#if !visibleEntries.length}
    <div class="empty">Sin resultados</div>
  {/if}
</div>

{#if isDev}
  <button id="save-dict" class="fab" onclick={onSave} disabled={saving || count === 0}>
    {saving ? 'Guardando…' : `Guardar (${count})`}
  </button>
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
      accent="var(--accent)"
      related={pickerRelated}
      exerciseName={pickerEntry.name}
      onpick={onPick}
    />
  {/if}
</CenterDialog>

<style>
  .admin-page { padding: 16px 16px 96px; max-width: 720px; margin: 0 auto; }
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
  .chip.done { opacity: 0.3; filter: grayscale(0.9); }
  .chip.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .pending { margin-left: 5px; background: rgba(255,255,255,0.14); color: var(--text); border-radius: 9999px; padding: 1px 5px; font-size: 9px; line-height: 1.3; }
  .chip.active .pending { background: var(--bg); color: var(--accent); }
  .count { font-size: 11px; opacity: 0.55; font-family: var(--font-mono); margin-bottom: 8px; }
  .hint { opacity: 0.7; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .empty { text-align: center; opacity: 0.5; padding: 40px 0; }
  .picker-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
  .picker-title { font-family: var(--font-sans); font-weight: 700; color: var(--text); }
  .dialog-close { background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px; }
  .mono { font-family: var(--font-mono); }
  .fab {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 50;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 9999px;
    padding: 14px 22px;
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }
  .fab:disabled { opacity: 0.4; cursor: default; }
</style>
