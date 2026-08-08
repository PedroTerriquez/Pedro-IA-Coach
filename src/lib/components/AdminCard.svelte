<script lang="ts">
  import Button from './Button.svelte'

  export interface AdminEntry {
    id: string
    name: string
    muscle?: string
    image?: string
    gif?: string
  }

  let {
    entry,
    accent = 'var(--accent)',
    reviewed = false,
    onedit = () => {},
    ontoggle = () => {}
  }: {
    entry: AdminEntry
    accent?: string
    reviewed?: boolean
    onedit?: (entryId: string, kind: 'image' | 'gif') => void
    ontoggle?: (entryId: string) => void
  } = $props()

  let brokenImg = $state(false)
  let brokenGif = $state(false)
  let copied = $state<'image' | 'gif' | null>(null)
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  $effect(() => {
    brokenImg = false
    brokenGif = false
    copied = null
  })

  function copy(kind: 'image' | 'gif', url?: string) {
    if (!url) return
    navigator.clipboard?.writeText(url).catch(() => {})
    copied = kind
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied = null), 1200)
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
  <div class="thumb" data-kind="image">
    {#if entry.image}
      <img class="thumb-img" data-entry={entry.id} data-kind="image" src={entry.image} alt={entry.name}
        loading="lazy" onerror={() => (brokenImg = true)} />
      <button class="copy-btn" title="Copiar URL" onclick={() => copy('image', entry.image)}>
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
  <div class="thumb" data-kind="gif">
    {#if entry.gif}
      <img class="thumb-img" data-entry={entry.id} data-kind="gif" src={entry.gif} alt={entry.name}
        loading="lazy" onerror={() => (brokenGif = true)} />
      <button class="copy-btn" title="Copiar URL" onclick={() => copy('gif', entry.gif)}>
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
    <div class="name">{entry.name}</div>
    {#if entry.muscle}<div class="muscle">{entry.muscle}</div>{/if}
  </div>
  <div class="actions">
    <Button id={`edit-img-${entry.id}`} size="sm" variant="secondary" {accent} onclick={() => onedit(entry.id, 'image')}>IMG</Button>
    <Button id={`edit-gif-${entry.id}`} size="sm" variant="secondary" {accent} onclick={() => onedit(entry.id, 'gif')}>GIF</Button>
  </div>
</div>

<style>
  .admin-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; transition: opacity 0.15s; }
  .admin-card.reviewed { opacity: 0.45; }
  .check { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.25); background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .check.on { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .thumb { position: relative; width: 112px; height: 112px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.04); }
  .thumb-img { width: 112px; height: 112px; object-fit: cover; display: block; }
  .none { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 11px; font-family: var(--font-mono); }
  .dot { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 50%; background: rgba(36,150,70,0.85); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .dot.bad { background: rgba(220,60,60,0.9); }
  .copy-btn { position: absolute; top: 5px; left: 5px; width: 24px; height: 24px; border-radius: 8px; border: none; background: rgba(10,10,10,0.65); color: #fff; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
  .info { flex: 1; min-width: 0; }
  .name { font-family: var(--font-sans); font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muscle { font-family: var(--font-mono); font-size: 10px; opacity: 0.55; margin-top: 2px; }
  .actions { display: flex; gap: 6px; flex-shrink: 0; }
</style>
