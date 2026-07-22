<script lang="ts">
  let {
    value = '',
    placeholder = 'Buscar...',
    oninput = () => {}
  }: {
    value?: string
    placeholder?: string
    oninput?: (val: string) => void
  } = $props()
</script>

<input
  class="search-input"
  type="text"
  {value}
  {placeholder}
  oninput={(e) => oninput((e.target as HTMLInputElement).value)}
/>

<style>
  .search-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }
</style>
