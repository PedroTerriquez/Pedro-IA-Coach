<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  // A 52 row of the detail sheet. `ai` = the coach (accent + IA tag, the only
  // AI treatment); `plain` = «Cómo se hace», which unfolds its steps in place.
  let { variant = 'plain', label, count = '', disabled = false, open = $bindable(false), onclick = undefined, children }: {
    variant?: 'ai' | 'plain'
    label: string
    /** plain: «3 pasos» while closed */
    count?: string
    disabled?: boolean
    open?: boolean
    onclick?: () => void
    children?: Snippet
  } = $props()

  function toggle() {
    if (variant === 'plain') open = !open
    onclick?.()
  }
</script>

{#snippet row()}
  <button type="button" class="row {variant}" class:off={disabled} {disabled} aria-expanded={variant === 'plain' ? open : undefined} onclick={toggle}>
    <span class="ic"><Icon name={variant === 'ai' ? 'spark' : 'book'} size={16} /></span>
    <b>{label}</b>
    {#if variant === 'ai' && !disabled}
      <span class="ai-tag">IA</span>
    {:else}
      <span class="cnt">{open ? '' : count}</span>
    {/if}
    <span class="chev">{#if !disabled}<Icon name={open ? 'up' : 'chev'} size={16} />{/if}</span>
  </button>
{/snippet}

{#if variant === 'plain' && open}
  <section class="panel" data-component="DetailRow">
    {@render row()}
    <div class="body">{@render children?.()}</div>
  </section>
{:else}
  <div class="wrap" data-component="DetailRow">{@render row()}</div>
{/if}

<style>
  .wrap { display: contents; }
  .row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto 16px;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 8px 14px 8px 10px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--cv-fill-1);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  .row:disabled { cursor: default; }
  .ic { width: 32px; height: 32px; border-radius: 10px; background: var(--cv-fill-3); display: grid; place-items: center; color: var(--text-secondary); }
  b { font-size: 16px; font-weight: 600; }
  .off b { font-weight: 500; color: var(--text-secondary); }
  .cnt { font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .chev { display: grid; color: var(--text-muted); }
  .row.ai { background: linear-gradient(135deg, var(--cv-accent-wash), var(--cv-accent-wash-2) 60%); box-shadow: inset 0 0 0 1px var(--cv-accent-line); }
  .row.ai .ic { background: var(--cv-accent-tint); color: var(--accent); }
  .row.ai .chev { color: var(--accent); }
  .row.ai.off { background: var(--cv-fill-1); box-shadow: none; }
  .row.ai.off .ic { background: var(--cv-fill-2); color: var(--text-tertiary); }
  .ai-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: var(--radius-full);
    background: var(--cv-accent-tag);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .panel { display: flex; flex-direction: column; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  .panel .row { background: transparent; }
  .body { display: flex; flex-direction: column; gap: 14px; padding: 4px 18px 18px 54px; }
  .body :global(.step) { display: flex; flex-direction: column; gap: 4px; }
  .body :global(.step-l) { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .body :global(.step p) { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
