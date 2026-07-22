<script lang="ts">
  import { fly } from 'svelte/transition'

  let { options, value = $bindable(), accent = 'var(--accent)' }: {
    options: { label: string; value: string }[]
    value: string
    accent?: string
  } = $props()
</script>

<div class="seg-control">
  {#each options as opt}
    <button
      class="seg-btn"
      class:seg-active={value === opt.value}
      style={value === opt.value ? `color:${accent}` : ''}
      onclick={() => value = opt.value}
      type="button"
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .seg-control {
    display: flex;
    background: rgba(255, 255, 255, 0.04);
    border-radius: var(--radius-full);
    padding: 3px;
    gap: 2px;
  }

  .seg-btn {
    flex: 1;
    padding: 8px 16px;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    position: relative;
  }

  .seg-btn.seg-active {
    background: rgba(255, 255, 255, 0.08);
    font-weight: 600;
  }
</style>
