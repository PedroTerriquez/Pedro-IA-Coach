<script lang="ts">
  import SearchInput from './SearchInput.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'
  import type { Snippet } from 'svelte'

  let {
    query = '',
    muscle = '',
    muscles = [],
    placeholder = 'Buscar por nombre o id…',
    accent = 'var(--accent)',
    onquery,
    onmuscle,
    before,
    after
  }: {
    query?: string
    muscle?: string
    muscles?: string[]
    placeholder?: string
    accent?: string
    onquery: (v: string) => void
    onmuscle: (v: string) => void
    before?: Snippet
    after?: Snippet
  } = $props()
</script>

<div class="filters" data-component="AdminFilters">
  <SearchInput value={query} oninput={onquery} {placeholder} />
  {#if before}{@render before()}{/if}
  <ChipRow>
    <FilterChip active={!muscle} {accent} onclick={() => onmuscle('')}>Todos</FilterChip>
    {#each muscles as m}
      <FilterChip active={muscle === m} {accent} onclick={() => onmuscle(m)}>{m}</FilterChip>
    {/each}
  </ChipRow>
  {#if after}{@render after()}{/if}
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  }
</style>
