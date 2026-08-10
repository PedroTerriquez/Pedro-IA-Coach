<script lang="ts">
  import Button from './Button.svelte'

  export interface AdminEntry {
    id: string
    name: string
    en?: string
    aliases?: string[]
    muscle?: string
    image?: string
    gif?: string
  }

  let {
    entry,
    accent = 'var(--accent)',
    reviewed = false,
    pendingAliases,
    pendingName,
    onedit = () => {},
    ontoggle = () => {},
    onaliases = () => {},
    onrename = () => {}
  }: {
    entry: AdminEntry
    accent?: string
    reviewed?: boolean
    pendingAliases?: string[]
    pendingName?: string
    onedit?: (entryId: string, kind: 'image' | 'gif') => void
    ontoggle?: (entryId: string) => void
    onaliases?: (entryId: string, aliases: string[]) => void
    onrename?: (entryId: string, name: string) => void
  } = $props()

  let brokenImg = $state(false)
  let brokenGif = $state(false)
  let copied = $state<'image' | 'gif' | null>(null)
  let aliasDraft = $state('')
  let editingName = $state(false)
  let nameDraft = $state('')
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  $effect(() => {
    brokenImg = false
    brokenGif = false
    copied = null
  })

  const aliases = $derived(pendingAliases ?? entry.aliases ?? [])
  const effectiveName = $derived(pendingName ?? entry.name)

  function copy(kind: 'image' | 'gif', url?: string) {
    if (!url) return
    navigator.clipboard?.writeText(url).catch(() => {})
    copied = kind
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied = null), 1200)
  }

  function startEditName() {
    nameDraft = effectiveName
    editingName = true
  }

  function commitName() {
    const n = nameDraft.trim()
    if (n && n !== effectiveName) onrename(entry.id, n)
    editingName = false
  }

  function cancelName() {
    editingName = false
  }

  function addAlias() {
    const a = aliasDraft.trim()
    if (!a || aliases.includes(a)) {
      aliasDraft = ''
      return
    }
    onaliases(entry.id, [...aliases, a])
    aliasDraft = ''
  }

  function removeAlias(i: number) {
    onaliases(entry.id, aliases.filter((_, j) => j !== i))
  }
</script>

<div class="admin-card" class:reviewed data-component="AdminCard" data-entry-id={entry.id}>
  <button
    id={`mark-ok-${entry.id}`}
    class="check"
    class:on={reviewed}
    title={reviewed ? 'Desmarcar revisado' : 'Marcar como revisado'}
    onclick={() => ontoggle(entry.id)}
  >
    {#if reviewed}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    {:else}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    {/if}
  </button>
  <div class="thumb" data-kind="image" role="button" title="Copiar URL de imagen" onclick={() => copy('image', entry.image)}>
    {#if entry.image}
      <img class="thumb-img" data-entry={entry.id} data-kind="image" src={entry.image} alt={entry.name}
        loading="lazy" onerror={() => (brokenImg = true)} />
      <button class="copy-btn" title="Copiar URL" onclick={(e) => { e.stopPropagation(); copy('image', entry.image) }}>
        {#if copied === 'image'}
          <span>✓</span>
        {:else}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {/if}
      </button>
    {:else}
      <div class="none">sin</div>
    {/if}
    <span class="dot" class:bad={brokenImg}>{brokenImg ? '✕' : '✓'}</span>
  </div>
  <div class="thumb" data-kind="gif" role="button" title="Copiar URL de gif" onclick={() => copy('gif', entry.gif)}>
    {#if entry.gif}
      <img class="thumb-img" data-entry={entry.id} data-kind="gif" src={entry.gif} alt={entry.name}
        loading="lazy" onerror={() => (brokenGif = true)} />
      <button class="copy-btn" title="Copiar URL" onclick={(e) => { e.stopPropagation(); copy('gif', entry.gif) }}>
        {#if copied === 'gif'}
          <span>✓</span>
        {:else}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        {/if}
      </button>
    {:else}
      <div class="none">sin</div>
    {/if}
    <span class="dot" class:bad={brokenGif}>{brokenGif ? '✕' : '✓'}</span>
  </div>
  <div class="info">
    <div class="name-row">
      {#if editingName}
        <input
          class="name-input"
          autofocus
          value={nameDraft}
          oninput={(e) => (nameDraft = e.currentTarget.value)}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitName()
            } else if (e.key === 'Escape') cancelName()
          }}
          onblur={commitName}
        />
      {:else}
        <div class="name" class:pending={pendingName !== undefined}>{effectiveName}</div>
        <button class="pencil" title="Cambiar nombre" onclick={startEditName}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
      {/if}
    </div>
    {#if entry.en}<div class="en">{entry.en}</div>{/if}
    {#if entry.muscle}<div class="muscle">{entry.muscle}</div>{/if}
    <div class="alias-row">
      {#each aliases as a, i}
        <span class="alias-chip" class:pending={pendingAliases !== undefined}>
          <span class="alias-text">{a}</span>
          <button class="rm" title="Quitar alias" onclick={() => removeAlias(i)}>×</button>
        </span>
      {/each}
    </div>
    <div class="alias-input">
      <input
        placeholder="añadir alias…"
        value={aliasDraft}
        oninput={(e) => (aliasDraft = e.currentTarget.value)}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addAlias()
          }
        }}
      />
      <button class="add" title="Añadir alias" onclick={addAlias}>+</button>
    </div>
  </div>
  <div class="actions">
    <Button id={`edit-img-${entry.id}`} size="sm" variant="secondary" {accent} onclick={() => onedit(entry.id, 'image')}>IMG</Button>
    <Button id={`edit-gif-${entry.id}`} size="sm" variant="secondary" {accent} onclick={() => onedit(entry.id, 'gif')}>GIF</Button>
  </div>
</div>

<style>
  .admin-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; transition: opacity 0.15s; }
  .admin-card.reviewed { opacity: 0.28; filter: grayscale(1); }
  .admin-card.reviewed:hover { opacity: 0.28; filter: grayscale(1); }
  .check { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.25); background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .check.on { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .thumb { position: relative; width: 112px; height: 112px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.04); cursor: pointer; }
  .thumb:hover .thumb-img { filter: brightness(0.82); }
  .thumb-img { width: 112px; height: 112px; object-fit: cover; display: block; }
  .none { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 11px; font-family: var(--font-mono); }
  .dot { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 50%; background: rgba(36,150,70,0.85); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .dot.bad { background: rgba(220,60,60,0.9); }
  .copy-btn { position: absolute; top: 5px; left: 5px; width: 24px; height: 24px; border-radius: 8px; border: none; background: rgba(10,10,10,0.65); color: #fff; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
  .info { flex: 1; min-width: 0; }
  .name-row { display: flex; align-items: center; gap: 6px; }
  .name { font-family: var(--font-sans); font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name.pending { color: var(--accent); }
  .name-input { flex: 1; min-width: 0; background: rgba(255,255,255,0.06); border: 1px solid var(--accent); border-radius: 7px; color: var(--text); font-family: var(--font-sans); font-weight: 600; font-size: 13px; padding: 2px 8px; outline: none; }
  .pencil { width: 22px; height: 22px; border-radius: 7px; border: 1px solid var(--border); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pencil:hover { color: var(--accent); border-color: var(--accent); }
  .en { font-size: 11px; color: var(--accent); opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .muscle { font-family: var(--font-mono); font-size: 10px; opacity: 0.55; margin-top: 2px; }
  .alias-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .alias-chip { display: inline-flex; align-items: center; gap: 3px; background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 7px; padding: 1px 6px 1px 8px; font-size: 10px; opacity: 0.7; }
  .alias-chip.pending { background: rgba(212,255,58,0.12); border-color: var(--accent); color: var(--accent); opacity: 1; }
  .alias-text { white-space: nowrap; }
  .rm { border: none; background: none; color: inherit; cursor: pointer; font-size: 12px; line-height: 1; padding: 0 2px; opacity: 0.6; }
  .rm:hover { opacity: 1; }
  .alias-input { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .alias-input input { flex: 1; min-width: 0; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 7px; color: var(--text); font-size: 11px; font-family: var(--font-sans); padding: 3px 8px; outline: none; }
  .alias-input input:focus { border-color: var(--accent); }
  .add { width: 22px; height: 22px; border-radius: 7px; border: 1px solid var(--border); background: rgba(255,255,255,0.06); color: var(--accent); font-size: 14px; cursor: pointer; line-height: 1; flex-shrink: 0; }
  .add:hover { background: rgba(212,255,58,0.12); }
  .actions { display: flex; gap: 6px; flex-shrink: 0; }
</style>
