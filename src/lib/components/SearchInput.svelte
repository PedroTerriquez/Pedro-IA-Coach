<script lang="ts">
  import Icon from './Icon.svelte'

  let {
    value = '',
    placeholder = 'Buscar...',
    oninput = () => {},
    id = undefined,
    autofocus = false,
    count = undefined,
    size = 'md'
  }: {
    value?: string
    placeholder?: string
    oninput?: (val: string) => void
    id?: string
    autofocus?: boolean
    /** Result count shown at the right while there's a query */
    count?: number | string
    /** md = 52 field; lg = 56 field for a dock next to a 56 IconButton */
    size?: 'md' | 'lg'
  } = $props()

  let inputEl: HTMLInputElement | null = null

  // Focused from code (not the `autofocus` attribute) so it also works when the
  // input appears later, inside a sheet opened by a tap.
  $effect(() => {
    if (autofocus) inputEl?.focus()
  })

  function clear() {
    oninput('')
    inputEl?.focus()
  }
</script>

<div class="search-wrap size-{size}" class:has-value={value.length > 0}>
  <span class="search-icon"><Icon name="search" size={18} /></span>
  <input
    bind:this={inputEl}
    class="search-input"
    type="text"
    enterkeyhint="search"
    {value}
    {placeholder}
    {id}
    data-component="SearchInput"
    oninput={(e) => oninput((e.target as HTMLInputElement).value)}
  />
  {#if value.length > 0}
    {#if count !== undefined}<span class="count">{count}</span>{/if}
    <button class="clear-btn" onclick={clear} type="button" aria-label="Limpiar búsqueda">
      <Icon name="x" size={18} />
    </button>
  {/if}
</div>

<style>
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 52px;
    padding: 0 16px;
    border-radius: var(--cv-radius-field);
    background: var(--cv-fill-2);
    color: var(--text-tertiary);
    min-width: 0;
    transition: box-shadow 0.15s;
  }
  .search-wrap.has-value { padding-right: 4px; }
  .search-wrap:focus-within { box-shadow: inset 0 0 0 1px var(--cv-ring-focus); }
  .search-wrap.size-lg {
    height: 56px;
    border-radius: var(--radius-lg);
    background: var(--surface-hover);
  }
  .search-icon { display: grid; flex-shrink: 0; }
  .search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--text);
    caret-color: var(--accent);
    font-family: var(--font-sans);
    font-size: 17px;
  }
  .search-input::placeholder { color: var(--text-muted); }
  .count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }
  .clear-btn {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    background: none;
    border: 0;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: var(--text-tertiary);
  }
</style>
