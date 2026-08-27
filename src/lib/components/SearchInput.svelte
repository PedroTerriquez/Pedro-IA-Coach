<script lang="ts">
  let {
    value = '',
    placeholder = 'Buscar...',
    oninput = () => {},
    id = undefined
  }: {
    value?: string
    placeholder?: string
    oninput?: (val: string) => void
    id?: string
  } = $props()

  let inputEl: HTMLInputElement | null = null

  function clear() {
    oninput('')
    inputEl?.focus()
  }
</script>

<div class="search-wrap">
  <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  <input
    bind:this={inputEl}
    class="search-input"
    type="text"
    {value}
    {placeholder}
    {id}
    data-component="SearchInput"
    oninput={(e) => oninput((e.target as HTMLInputElement).value)}
  />
  {#if value.length > 0}
    <button class="clear-btn" onclick={clear} type="button" aria-label="Limpiar búsqueda">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  {/if}
</div>

<style>
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    pointer-events: none;
    flex-shrink: 0;
  }
  .search-input {
    width: 100%;
    padding: 10px 34px 10px 36px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .search-input:focus {
    border-color: rgba(255,255,255,0.18);
  }
  .clear-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .clear-btn:active {
    background: rgba(255,255,255,0.08);
  }
</style>
