<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { EXERCISE_DICTIONARY } from '$lib/data/exercise-dictionary'
  import { EXERCISE_WARMUP, type WarmupEntry } from '$lib/data/exercise-warmup'
  import { draftCount, saveDrafts, queueReplace, queueSetAliases, queueSetName, pendingAliasesMap, pendingNamesMap, pendingMediaMap } from '$lib/admin/editor'
  import { warmupDraftCount, saveWarmupDrafts, warmupPendingMediaMap, warmupPendingNamesMap } from '$lib/admin/warmup-editor'
  import { reviewed, toggleReviewed } from '$lib/admin/reviewed'
  import { PUSH_SERVER_URL } from '$lib/config'
  import AdminCard from '$lib/components/AdminCard.svelte'
  import AdminFilters from '$lib/components/AdminFilters.svelte'
  import WarmupAdminTab from '$lib/components/WarmupAdminTab.svelte'
  import MediaPickerDialog from '$lib/components/MediaPickerDialog.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import ChipRow from '$lib/components/ChipRow.svelte'
  import FilterChip from '$lib/components/FilterChip.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'

  const isDev = import.meta.env.DEV

  let dictionary = $state(EXERCISE_DICTIONARY)
  let warmup = $state<WarmupEntry[]>(EXERCISE_WARMUP)

  let tab = $state<'dict' | 'warmup' | 'stretch' | 'unmatched'>('dict')

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

  const dictEntries = $derived(
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

  const dictMuscles = $derived([...new Set(dictEntries.map((e) => e.muscle).filter(Boolean))].sort())

  const dictLetters = $derived(
    [...new Set(dictEntries.map(firstLetter))].filter((c) => /[A-Z]/.test(c)).sort()
  )

  const dictReviewedSet = $derived(new Set($reviewed.dict ?? []))

  const dictReviewedCount = $derived(dictReviewedSet.size)

  const letterPending = $derived(
    Object.fromEntries(
      dictLetters.map((l) => [l, dictEntries.filter((e) => firstLetter(e) === l).filter((e) => !dictReviewedSet.has(e.id)).length])
    )
  )

  const dictVisible = $derived(
    dictEntries.filter((e) => {
      if (muscle && e.muscle !== muscle) return false
      if (letter && firstLetter(e) !== letter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [e.name, e.id].some((s) => s.toLowerCase().includes(q))
    })
  )

  const warmupScoped = $derived(warmup.filter((e) => e.kind === tab))
  const warmupReviewedCount = $derived(
    tab === 'dict' ? 0 : warmupScoped.filter((e) => (($reviewed.warmup) ?? []).includes(e.id)).length
  )

  const dictCount = $derived($draftCount)
  const wCount = $derived($warmupDraftCount)

  async function onSave() {
    saving = true
    const media = $pendingMediaMap
    const aliases = $pendingAliasesMap
    const names = $pendingNamesMap
    const ok = await saveDrafts()
    saving = false
    if (ok) applyDictSaved(media, aliases, names)
  }

  function applyDictSaved(media: Record<string, { image?: string; gif?: string }>, aliases: Record<string, string[]>, names: Record<string, string>) {
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

  async function onWarmupSave() {
    saving = true
    const media = $warmupPendingMediaMap
    const names = $warmupPendingNamesMap
    const ok = await saveWarmupDrafts()
    saving = false
    if (ok) applyWarmupSaved(media, names)
  }

  function applyWarmupSaved(media: Record<string, { image?: string; gif?: string }>, names: Record<string, string>) {
    warmup = warmup.map((e) => {
      const m = media[e.id]
      const n = names[e.id]
      if (!m && n === undefined) return e
      return {
        ...e,
        ...(m?.image ? { image: m.image } : {}),
        ...(m?.gif ? { gif: m.gif } : {}),
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
      return dictEntries.find((e) => e.id === p.entryId) ?? null
    })()
  )

  const pickerRelated = $derived(pickerEntry ? buildTerms(pickerEntry.en, pickerEntry.aliases) : [])

  // ── Unmatched exercise-name corpus ──
  let unmatched = $state<{ name: string; firstSeen: string }[]>([])
  let unmatchedQuery = $state('')
  let unmatchedLoading = $state(false)
  let unmatchedError = $state('')
  let unmatchedLoaded = $state(false)

  async function loadUnmatched() {
    if (!PUSH_SERVER_URL) {
      unmatchedError = 'Sin PUSH_SERVER_URL configurado'
      return
    }
    unmatchedLoading = true
    unmatchedError = ''
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/unmatched/list`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      unmatched = data.names || []
      unmatchedLoaded = true
    } catch (err: any) {
      unmatchedError = err?.message || 'Error de red'
    } finally {
      unmatchedLoading = false
    }
  }

  $effect(() => {
    if (tab === 'unmatched' && !unmatchedLoaded && !unmatchedLoading) loadUnmatched()
  })

  const unmatchedVisible = $derived(
    unmatched.filter((n) => {
      const q = unmatchedQuery.trim().toLowerCase()
      return !q || n.name.toLowerCase().includes(q)
    })
  )

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  }

  async function copyAll() {
    await copyText(unmatchedVisible.map((n) => n.name).join('\n'))
  }
</script>

<svelte:head><title>Admin Media</title></svelte:head>

<div class="admin-page">
  <div class="admin-header">
    <div>
      <button class="back" onclick={() => goto(ROUTES.you)}>← Tú</button>
      {#if tab === 'dict'}
        <h1 class="title">Diccionario · Media · {dictReviewedCount}/{dictEntries.length}</h1>
        <p class="subtitle">
          {dictEntries.length} ejercicios · <strong>{dictReviewedCount} revisados</strong> · {dictEntries.length - dictReviewedCount} pendientes
        </p>
      {:else if tab === 'unmatched'}
        <h1 class="title">Nombres sin match</h1>
        <p class="subtitle">
          {unmatched.length} nombres que el diccionario no resolvió · reportados desde Normalizar
        </p>
      {:else}
        <h1 class="title">{tab === 'warmup' ? 'Calentamiento' : 'Estiramiento'} · Media · {warmupReviewedCount}/{warmupScoped.length}</h1>
        <p class="subtitle">
          {warmupScoped.length} ejercicios · <strong>{warmupReviewedCount} revisados</strong> · {warmupScoped.length - warmupReviewedCount} pendientes
        </p>
      {/if}
    </div>
    {#if !isDev}
      <Chip>solo lectura</Chip>
    {/if}
  </div>

  {#if !isDev}
    <div class="prod-note">El admin de media solo permite editar en local con <span class="mono">npm run dev</span>.</div>
  {/if}

  <ChipRow class="sub-tabs" gap={6}>
    <FilterChip variant="sans" size="lg" active={tab === 'dict'} onclick={() => (tab = 'dict')}>Ejercicios</FilterChip>
    <FilterChip variant="sans" size="lg" active={tab === 'warmup'} onclick={() => (tab = 'warmup')}>Calentamiento</FilterChip>
    <FilterChip variant="sans" size="lg" active={tab === 'stretch'} onclick={() => (tab = 'stretch')}>Estiramiento</FilterChip>
    <FilterChip variant="sans" size="lg" active={tab === 'unmatched'} onclick={() => (tab = 'unmatched')}>Nombres</FilterChip>
  </ChipRow>

  <div class="pane" style="display:{tab === 'dict' ? 'block' : 'none'}">
    <AdminFilters
      {query}
      {muscle}
      muscles={dictMuscles}
      onquery={(v) => (query = v)}
      onmuscle={(v) => (muscle = v)}
    >
      {#snippet before()}
        <ChipRow gap={4}>
          {#each dictLetters as l}
            <FilterChip
              size="sm"
              active={letter === l}
              dimmed={letterPending[l] === 0}
              onclick={() => (letter = l)}
            >{l}{#if letterPending[l] > 0}<span class="pending">{letterPending[l]}</span>{/if}</FilterChip>
          {/each}
        </ChipRow>
      {/snippet}
    </AdminFilters>

    <div class="count">
      {dictVisible.length} ejercicios · {dictReviewedCount} revisados
      <span class="hint">· marca ✓ para revisarlo; quedará en gris en la lista</span>
    </div>

    <div class="list">
      {#each dictVisible as e}
        <AdminCard
          accent="var(--accent)"
          entry={e}
          reviewed={dictReviewedSet.has(e.id)}
          pendingAliases={$pendingAliasesMap[e.id]}
          pendingName={$pendingNamesMap[e.id]}
          onedit={onEdit}
          ontoggle={() => toggleReviewed('dict', e.id)}
          onaliases={(id, list) => queueSetAliases(id, list)}
          onrename={(id, name) => queueSetName(id, name)}
        />
      {/each}
    </div>

    {#if !dictVisible.length}
      <EmptyState message="Sin resultados" />
    {/if}
  </div>

  <div class="pane" style="display:{tab === 'warmup' ? 'block' : 'none'}">
    <WarmupAdminTab mode="warmup" entries={warmup} accent="var(--accent)" />
  </div>

  <div class="pane" style="display:{tab === 'stretch' ? 'block' : 'none'}">
    <WarmupAdminTab mode="stretch" entries={warmup} accent="var(--accent)" />
  </div>

  <div class="pane" style="display:{tab === 'unmatched' ? 'block' : 'none'}">
    {#if unmatchedLoading}
      <EmptyState message="Cargando…" />
    {:else if unmatchedError}
      <div class="unmatched-error">
        Error: {unmatchedError}
        <FilterChip style="margin-left:8px" onclick={loadUnmatched}>Reintentar</FilterChip>
      </div>
    {:else}
      <div class="filters">
        <SearchInput value={unmatchedQuery} oninput={(v) => (unmatchedQuery = v)} placeholder="Buscar nombre…" />
      </div>
      <div class="count">
        {unmatchedVisible.length} nombres sin match
        {#if unmatchedVisible.length}
          <FilterChip onclick={copyAll}>copiar todos</FilterChip>
        {/if}
      </div>
      <div class="list">
        {#each unmatchedVisible as n}
          <div class="unmatched-row">
            <div class="unmatched-name">{n.name}</div>
            <div class="unmatched-date">{n.firstSeen}</div>
            <FilterChip onclick={() => copyText(n.name)}>copiar</FilterChip>
          </div>
        {/each}
      </div>
      {#if !unmatchedVisible.length}
        <EmptyState message="Sin resultados" />
      {/if}
    {/if}
  </div>
</div>

{#if isDev && tab === 'dict'}
  <button id="save-dict" class="fab" onclick={onSave} disabled={saving || dictCount === 0}>
    {saving ? 'Guardando…' : `Guardar (${dictCount})`}
  </button>
{/if}
{#if isDev && (tab === 'warmup' || tab === 'stretch')}
  <button id="save-warmup" class="fab" onclick={onWarmupSave} disabled={saving || wCount === 0}>
    {saving ? 'Guardando…' : `Guardar (${wCount})`}
  </button>
{/if}

{#if picker && pickerEntry}
  <MediaPickerDialog
    open
    kind={picker.kind}
    current={picker.kind === 'image' ? pickerEntry.image : pickerEntry.gif}
    name={pickerEntry.name}
    related={pickerRelated}
    onpick={onPick}
    onclose={() => (picker = null)}
  />
{/if}

<style>
  .admin-page { padding: 16px 16px 96px; max-width: 720px; margin: 0 auto; }
  .admin-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
  .back { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; font-family: var(--font-sans); padding: 0; }
  .title { font-family: var(--font-sans); font-size: 22px; font-weight: 700; color: var(--text); margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { font-size: 12px; opacity: 0.6; margin: 0; }
  .prod-note { background: rgba(255,180,60,0.1); border: 1px solid rgba(255,180,60,0.3); color: #ffc266; border-radius: 12px; padding: 10px 14px; font-size: 12px; margin-bottom: 14px; }
  .pending { margin-left: 5px; background: rgba(255,255,255,0.14); color: var(--text); border-radius: 9999px; padding: 1px 5px; font-size: 9px; line-height: 1.3; }
  .count { font-size: 11px; opacity: 0.55; font-family: var(--font-mono); margin-bottom: 8px; }
  .hint { opacity: 0.7; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .unmatched-row { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 8px 12px; }
  .unmatched-name { flex: 1; font-size: 13px; color: var(--text); font-family: var(--font-sans); }
  .unmatched-date { font-size: 10px; opacity: 0.5; font-family: var(--font-mono); white-space: nowrap; }
  .filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
  :global(.sub-tabs) { margin-bottom: 14px; }
  .unmatched-error { text-align: center; opacity: 0.5; padding: 40px 0; }
  .pane { width: 100%; }
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
