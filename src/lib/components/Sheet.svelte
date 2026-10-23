<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import { swipeToClose, CLOSED_OFFSET } from '$lib/swipe-to-close'

  let {
    open = $bindable(false),
    children,
    header,
    footer,
    title = '',
    eyebrow = '',
    titleStyle = 'title',
    full = false,
    elevated = false,
    id = undefined,
    onclose = () => {}
  }: {
    /** Above full-screen layers such as the coach chat */
    elevated?: boolean
    open: boolean
    children?: Snippet
    /** Old header (views not migrated yet); keeps the floating close button */
    header?: Snippet
    /** Fixed footer under the body (pie fijo) */
    footer?: Snippet
    /** New header: title + close 44 in the same row */
    title?: string
    /** With `titleStyle="center"`: small mono line under the centered title */
    eyebrow?: string
    /** title = 20/600 at the left · label = mono label (guided steps) · center = ‹ back + centered title */
    titleStyle?: 'title' | 'label' | 'center'
    /** Full height, from the status bar down */
    full?: boolean
    id?: string
    onclose?: () => void
  } = $props()

  let isNew = $derived(!!title)

  // Drag-to-close by the top (grabber + head)
  let dragOffset = $state(0)
  let isDragging = $state(false)

  function close() {
    open = false
    onclose()
  }

  function drag(offset: number, dragging: boolean) {
    dragOffset = offset
    isDragging = dragging
  }

  // A sheet that opens again starts in place
  $effect(() => {
    if (open) dragOffset = 0
  })
</script>

{#if open}
  <div {id} class="sheet-overlay" class:elevated data-component="Sheet" role="dialog" aria-modal="true" aria-label={title || undefined}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="sheet-backdrop" role="presentation" onclick={close} style="opacity: {1 - Math.min(dragOffset / CLOSED_OFFSET, 1)};"></div>
    {#if !isNew}
      <button class="sheet-close-btn" onclick={close} aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
      </button>
    {/if}
    <!-- No transform at rest: it would trap the fixed layers of sheets opened inside -->
    <div class="sheet-content" class:v2={isNew} class:full style="transform: {dragOffset ? `translateY(${dragOffset}px)` : 'none'}; transition: {isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'};">
      <div class="sheet-top" use:swipeToClose={{ onmove: drag, onclose: close }}>
        {#if titleStyle !== 'center'}<div class="sheet-handle"></div>{/if}
        {#if isNew && titleStyle === 'center'}
          <div class="sheet-head-center">
            <button class="sheet-x" onclick={close} aria-label="Volver"><Icon name="back" size={20} /></button>
            <div class="sheet-title-center">{title}{#if eyebrow}<small>{eyebrow}</small>{/if}</div>
            <span></span>
          </div>
        {:else if isNew}
          <div class="sheet-head">
            <span class={titleStyle === 'label' ? 'sheet-label' : 'sheet-title'}>{title}</span>
            <button class="sheet-x" onclick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
          </div>
        {:else if header}
          <div class="sheet-header">{@render header()}</div>
        {/if}
      </div>
      <div class="sheet-body">
        {#if children}{@render children()}{/if}
      </div>
      {#if footer}
        <div class="sheet-footer">{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: auto;
  }
  .sheet-overlay.elevated { z-index: 220; }
  .sheet-backdrop {
    position: absolute;
    inset: 0;
    background: var(--cv-scrim);
    transition: background 0.25s;
  }
  .sheet-content {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--surface);
    border-radius: var(--cv-radius-sheet) var(--cv-radius-sheet) 0 0;
    max-height: 88%;
    overflow: hidden;
    box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.5);
    border: 0.5px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .sheet-content.full {
    top: max(54px, env(safe-area-inset-top, 0px));
    max-height: none;
  }
  .sheet-top { flex-shrink: 0; }
  .sheet-handle {
    width: 36px;
    height: 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
    margin: 8px auto 0;
    flex-shrink: 0;
  }
  .sheet-header {
    padding: 4px 20px 0;
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .sheet-close-btn {
    position: absolute;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid var(--border-medium);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 110;
    padding: 0;
    color: var(--text-secondary);
    top: max(14px, env(safe-area-inset-top, 14px));
  }
  .sheet-body {
    overflow: auto;
    flex: 1;
    padding: 0 20px;
  }

  /* ── New sheet (Compartidos · Nuevo) ── */
  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 52px;
    padding: 8px 10px 0 22px;
    flex-shrink: 0;
  }
  .sheet-title { font-size: 20px; font-weight: 600; letter-spacing: -0.4px; }
  .sheet-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .sheet-head-center {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    padding: 10px 10px 0;
    flex-shrink: 0;
  }
  .sheet-title-center { text-align: center; font-size: 15px; font-weight: 600; }
  .sheet-title-center small {
    display: block;
    margin-top: 3px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .sheet-x {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 0;
    background: none;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: var(--text-tertiary);
    padding: 0;
  }
  .v2 .sheet-body {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 8px 20px 44px;
  }
  .v2.full .sheet-body { padding-bottom: 20px; }
  .v2 .sheet-body > :global(*) { flex-shrink: 0; }
  .sheet-footer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 20px max(26px, env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid var(--border-medium);
  }
  .v2:has(.sheet-footer) .sheet-body { padding-bottom: 20px; }
</style>
