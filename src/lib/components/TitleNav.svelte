<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  // Muscle + ← → of 56 on top, the name below at full width (2 lines at most).
  // The arrows only move between items; they never mark anything.
  let { name, muscle = '', hasPrev = false, hasNext = false, onprev, onnext, badge }: {
    name: string
    muscle?: string
    hasPrev?: boolean
    hasNext?: boolean
    onprev: () => void
    onnext: () => void
    badge?: Snippet
  } = $props()
</script>

<div class="tn" data-component="TitleNav">
  <div class="tn-r">
    <p class="tn-muscle">{muscle}{#if badge}{@render badge()}{/if}</p>
    <div class="tn-nav" data-testid={TID.detailNav}>
      <button type="button" class="tn-b" aria-label="Anterior" disabled={!hasPrev} onclick={onprev}><Icon name="back" size={24} /></button>
      <button type="button" class="tn-b" aria-label="Siguiente" disabled={!hasNext} onclick={onnext}><Icon name="chev" size={24} /></button>
    </div>
  </div>
  <h2 class="tn-name" data-testid={TID.detailName}>{name}</h2>
</div>

<style>
  .tn { display: flex; flex-direction: column; gap: 4px; }
  .tn-r { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .tn-muscle { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 15px; color: var(--text-secondary); }
  .tn-name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.8px;
    line-height: 1.05;
    text-wrap: balance;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: break-word;
  }
  .tn-nav { display: flex; gap: 8px; flex-shrink: 0; }
  .tn-b {
    width: 56px;
    height: 56px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--cv-fill-3);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .tn-b:disabled { opacity: 0.3; cursor: default; }
</style>
