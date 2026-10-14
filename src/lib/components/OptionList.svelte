<script lang="ts">
  import Icon from './Icon.svelte'

  type Option = { value: string; label: string; meta?: string; style?: string; id?: string }

  let { options, value = '', nav = false, label = undefined, onselect }: {
    options: Option[]
    value?: string
    /** Options that lead somewhere: chevron instead of the selected check */
    nav?: boolean
    label?: string
    onselect: (value: string) => void
  } = $props()
</script>

<div class="ol" role={nav ? undefined : 'radiogroup'} aria-label={label} data-component="OptionList">
  {#each options as opt (opt.value)}
    <button
      id={opt.id}
      type="button"
      class:on={!nav && opt.value === value}
      role={nav ? undefined : 'radio'}
      aria-checked={nav ? undefined : opt.value === value}
      style={opt.style}
      onclick={() => onselect(opt.value)}
    >
      <span class="t">{opt.label}</span>
      {#if opt.meta}<span class="mu">{opt.meta}</span>{/if}
      {#if nav}
        <span class="chev"><Icon name="chev" size={16} /></span>
      {:else if opt.value === value}
        <Icon name="check" size={18} />
      {/if}
    </button>
  {/each}
</div>

<style>
  .ol { display: flex; flex-direction: column; border-radius: var(--radius-lg); overflow: hidden; background: var(--cv-fill-1); }
  .ol button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 0 16px;
    border: 0;
    background: none;
    color: var(--text-secondary);
    text-align: left;
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }
  .ol button + button { border-top: 0.5px solid var(--border-medium); }
  .ol button.on { color: var(--text); }
  .t { flex: 1; min-width: 0; }
  .mu { font-size: 13px; font-weight: 400; color: var(--text-tertiary); }
  .chev { display: grid; color: var(--text-muted); }
</style>
