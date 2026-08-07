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
    onedit = () => {}
  }: {
    entry: AdminEntry
    accent?: string
    onedit?: (entryId: string, kind: 'image' | 'gif') => void
  } = $props()

  let brokenImg = $state(false)
  let brokenGif = $state(false)
  $effect(() => {
    brokenImg = false
    brokenGif = false
  })
</script>

<div class="admin-card" data-component="AdminCard" data-entry-id={entry.id}>
  <div class="thumb" title={entry.image} data-kind="image">
    {#if entry.image}
      <img class="thumb-img" data-entry={entry.id} data-kind="image" src={entry.image} alt={entry.name}
        loading="lazy" onerror={() => (brokenImg = true)} />
    {:else}
      <div class="none">sin</div>
    {/if}
    <span class="dot" class:bad={brokenImg}>{brokenImg ? '✕' : '✓'}</span>
  </div>
  <div class="thumb" title={entry.gif} data-kind="gif">
    {#if entry.gif}
      <img class="thumb-img" data-entry={entry.id} data-kind="gif" src={entry.gif} alt={entry.name}
        loading="lazy" onerror={() => (brokenGif = true)} />
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
  .admin-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
  .thumb { position: relative; width: 112px; height: 112px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,0.04); }
  .thumb-img { width: 112px; height: 112px; object-fit: cover; display: block; }
  .none { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 11px; font-family: var(--font-mono); }
  .dot { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 50%; background: rgba(36,150,70,0.85); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .dot.bad { background: rgba(220,60,60,0.9); }
  .info { flex: 1; min-width: 0; }
  .name { font-family: var(--font-sans); font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muscle { font-family: var(--font-mono); font-size: 10px; opacity: 0.55; margin-top: 2px; }
  .actions { display: flex; gap: 6px; flex-shrink: 0; }
</style>
