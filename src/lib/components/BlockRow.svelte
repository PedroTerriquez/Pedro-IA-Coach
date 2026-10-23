<script lang="ts">
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'
  import { formatWeight } from '$lib/exercise-history'
  import type { ExerciseLogBlock } from '$lib/types'

  type Field = 'sets' | 'reps' | 'weight'

  // One block of «Series por bloque»: series × reps · peso, each a 56 tile
  // that takes the keyboard. The chosen tile gets its − / + underneath.
  let { block, index, units = 'kg', selected = null, removable = false, onselect, onchange, onremove }: {
    block: ExerciseLogBlock
    index: number
    units?: string
    selected?: Field | null
    removable?: boolean
    onselect: (field: Field) => void
    onchange: (patch: Partial<ExerciseLogBlock>) => void
    onremove: () => void
  } = $props()

  const STEPS: Record<Field, number> = { sets: 1, reps: 1, weight: 2.5 }
  const MIN: Record<Field, number> = { sets: 1, reps: 1, weight: 0 }

  function stepLabel(field: Field): string {
    return field === 'weight' ? `de 2.5 en 2.5 ${units}` : 'de 1 en 1'
  }

  function clampField(field: Field, n: number): number {
    const rounded = field === 'weight' ? +n.toFixed(1) : Math.round(n)
    return Math.max(MIN[field], rounded)
  }

  function step(dir: 1 | -1) {
    if (!selected) return
    onchange({ [selected]: clampField(selected, block[selected] + dir * STEPS[selected]) })
  }

  function typed(field: Field, e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(',', '.').replace(field === 'weight' ? /[^0-9.]/g : /[^0-9]/g, '')
    onchange({ [field]: raw === '' ? 0 : parseFloat(raw) || 0 })
  }

  function shown(field: Field): string {
    const v = block[field]
    return v === 0 ? '' : field === 'weight' ? formatWeight(v) : String(v)
  }
</script>

{#snippet tile(field: Field, unit: string)}
  <label class="v" class:sel={selected === field}>
    <input
      class="block-field-input"
      data-testid={TID.blockField}
      value={shown(field)}
      placeholder="0"
      inputmode={field === 'weight' ? 'decimal' : 'numeric'}
      pattern={field === 'weight' ? '[0-9.]*' : '[0-9]*'}
      aria-label="Bloque {index + 1} · {unit}"
      onfocus={() => onselect(field)}
      oninput={(e) => typed(field, e)}
    />
    <span>{unit}</span>
  </label>
{/snippet}

<div class="bk" data-component="BlockRow">
  <div class="bk-h">
    <span class="bk-l">Bloque {index + 1}</span>
    {#if removable}
      <button type="button" class="bk-rm" aria-label="Quitar bloque {index + 1}" onclick={onremove}><Icon name="x" size={16} /></button>
    {/if}
  </div>
  <div class="bk-f">
    {@render tile('sets', 'series')}
    <span class="x">×</span>
    {@render tile('reps', 'reps')}
    <span class="x">·</span>
    {@render tile('weight', units)}
  </div>
  {#if selected}
    <div class="bk-ed">
      <button type="button" class="b" aria-label="Menos" onclick={() => step(-1)}><Icon name="minus" size={22} /></button>
      <span>{stepLabel(selected)}</span>
      <button type="button" class="b" aria-label="Más" onclick={() => step(1)}><Icon name="plus" size={22} /></button>
    </div>
  {/if}
</div>

<style>
  .bk { display: flex; flex-direction: column; gap: 8px; }
  .bk-h { display: flex; align-items: center; justify-content: space-between; min-height: 32px; }
  .bk-l { font-size: 13px; color: var(--text-tertiary); padding-left: 2px; }
  .bk-rm { width: 44px; height: 44px; margin: -6px -10px -6px 0; border: 0; border-radius: 50%; background: none; color: var(--text-tertiary); display: grid; place-items: center; cursor: pointer; }
  .bk-f { display: grid; grid-template-columns: 1fr 14px 1fr 14px 1.35fr; align-items: center; gap: 4px; }
  .v { height: 56px; border-radius: var(--radius-md); background: var(--cv-fill-2); display: flex; align-items: baseline; justify-content: center; gap: 4px; padding-top: 17px; min-width: 0; cursor: text; }
  .v.sel { background: rgba(255, 255, 255, 0.12); box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.6); }
  .v input {
    width: 3.2ch;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    padding: 0;
    text-align: right;
    color: var(--text);
    caret-color: var(--accent);
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .v span { font-size: 12px; color: var(--text-tertiary); }
  .x { text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 13px; }
  .bk-ed { display: grid; grid-template-columns: 56px minmax(0, 1fr) 56px; align-items: center; gap: 8px; }
  .bk-ed span { text-align: center; font-size: 13px; color: var(--text-tertiary); }
  .b { width: 56px; height: 56px; border: 0; border-radius: 50%; background: var(--cv-fill-3); color: var(--text); display: grid; place-items: center; cursor: pointer; }
</style>
