<script lang="ts">
  import Icon from './Icon.svelte'
  import BlockRow from './BlockRow.svelte'
  import { formatWeight } from '$lib/exercise-history'
  import type { ExerciseLogBlock } from '$lib/types'

  type Field = 'sets' | 'reps' | 'weight'

  // «Series por bloque» (Detalle v2 · 02). Registered and untouched, it shows
  // the recap instead of the editor until «Editar bloques».
  let { blocks = $bindable<ExerciseLogBlock[]>([]), units = 'kg', saved = false, onsingle }: {
    blocks?: ExerciseLogBlock[]
    units?: string
    saved?: boolean
    onsingle: () => void
  } = $props()

  let editing = $state(false)
  let selected = $state<{ index: number; field: Field } | null>(null)
  let showRecap = $derived(saved && !editing)

  // A new registration closes the editor again
  $effect(() => {
    if (saved) editing = false
  })
  let totalSets = $derived(blocks.reduce((a, b) => a + (b.sets || 0), 0))

  function update(i: number, patch: Partial<ExerciseLogBlock>) {
    blocks = blocks.map((b, j) => (j === i ? { ...b, ...patch } : b))
  }

  function remove(i: number) {
    blocks = blocks.filter((_, j) => j !== i)
    selected = null
  }

  function add() {
    blocks = [...blocks, { ...blocks[blocks.length - 1] }]
  }
</script>

<section class="stp" class:saved={showRecap} data-component="BlocksPanel">
  {#if showRecap}
    <div class="top">
      <span class="ok"><Icon name="check" size={16} /></span>
      <span><b>Registrado hoy</b><small>{totalSets} series en {blocks.length} {blocks.length === 1 ? 'bloque' : 'bloques'}</small></span>
    </div>
    <div class="recap">
      {#each blocks as b, i}
        <div><span>Bloque {i + 1} · {b.sets} × {b.reps}</span><b>{formatWeight(b.weight)} {units}</b></div>
      {/each}
    </div>
    <button type="button" class="lnk" onclick={() => (editing = true)}>Editar bloques<Icon name="chev" size={14} /></button>
  {:else}
    <div class="hd">
      <span class="lbl">Series por bloque</span>
      <button type="button" class="single" onclick={onsingle}>Un solo peso</button>
    </div>
    {#each blocks as b, i (i)}
      <BlockRow
        block={b}
        index={i}
        {units}
        removable={blocks.length > 1}
        selected={selected?.index === i ? selected.field : null}
        onselect={(field) => (selected = { index: i, field })}
        onchange={(patch) => update(i, patch)}
        onremove={() => remove(i)}
      />
    {/each}
    <button type="button" class="lnk" onclick={add}><Icon name="plus" size={16} />Agregar bloque</button>
  {/if}
</section>

<style>
  .stp { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px 4px; border-radius: var(--radius-2xl); background: var(--cv-fill-1); }
  .stp.saved { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .top { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: center; }
  .top b { display: block; font-size: 16px; }
  .top small { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 20px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .single { height: 44px; margin: -8px -8px -8px 0; padding: 0 8px; border: 0; background: none; font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
  .recap { display: flex; flex-direction: column; }
  .recap div { display: flex; justify-content: space-between; align-items: center; min-height: 40px; font-size: 15px; color: var(--text-secondary); }
  .recap div + div { box-shadow: 0 -0.5px 0 var(--border); }
  .recap b { font-family: var(--font-mono); font-weight: 500; letter-spacing: -0.03em; color: var(--text); }
  .lnk {
    height: 48px;
    width: 100%;
    border: 0;
    border-top: 0.5px solid var(--border-medium);
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
  }
</style>
