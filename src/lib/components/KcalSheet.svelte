<script lang="ts">
  import { untrack } from 'svelte'
  import ActivitySheetFrame from './ActivitySheetFrame.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import { num } from '$lib/activities'

  // «¿Cuántas calorías quemaste?» (Nuevo · Hoy actividades 13). As a step
  // after the effort (`effort` set): back to the effort, «Saltar», then the
  // summary. From the summary's row: edit, «Quitar calorías» or «Cancelar».
  let { effort = '', current = 0, accent = 'var(--accent)', onsave, onskip, onback, onremove, onclose }: {
    /** The effort just picked; empty when editing from the summary */
    effort?: string
    current?: number
    accent?: string
    onsave: (kcal: number) => void
    onskip: () => void
    onback: () => void
    onremove: () => void
    onclose: () => void
  } = $props()

  let step = untrack(() => !!effort)
  let value = $state(untrack(() => (current ? String(current) : '')))
  let canSave = $derived(num(value) > 0)
</script>

<ActivitySheetFrame id="kcal-sheet" label="¿Cuántas calorías quemaste?" name="KcalSheet" onclose={step ? null : onclose}>
  <div class="shd">
    <button type="button" class="back" aria-label="Atrás" onclick={step ? onback : onclose}><Icon name="back" size={20} /></button>
    <div class="mn">
      <div class="eyb">{step ? `Esfuerzo · ${effort}` : 'Editar calorías'}</div>
      <h2 class="h">¿Cuántas calorías quemaste?</h2>
    </div>
  </div>
  <p class="why" style="margin-top:-6px">Opcional. Copia el dato de tu reloj o app y Pedro lo suma a tu resumen.</p>
  <label class="fld">
    <span class="lb">Calorías<em>opcional</em></span>
    <span class="in"><input aria-label="Calorías" inputmode="numeric" placeholder="0" bind:value /><span class="u">kcal</span></span>
  </label>
  {#snippet dock()}
    <Button variant="primary" size="lg" fullWidth {accent} disabled={!canSave} onclick={() => onsave(Math.round(num(value)))}>{step ? 'Guardar y ver resumen' : 'Guardar cambios'}</Button>
    {#if step}
      <button type="button" class="ghost" onclick={onskip}>Saltar</button>
    {:else if current}
      <button type="button" class="ghost del" onclick={onremove}>Quitar calorías</button>
    {:else}
      <button type="button" class="ghost" onclick={onclose}>Cancelar</button>
    {/if}
  {/snippet}
</ActivitySheetFrame>

<style>
  .mn { min-width: 0; }
  .fld { padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 6px; border-radius: 16px; background: var(--cv-fill-1); box-shadow: inset 0 0 0 1.5px transparent; cursor: text; }
  .fld:focus-within { background: var(--cv-fill-2); box-shadow: inset 0 0 0 1.5px var(--cv-ring-current); }
  .lb { display: flex; justify-content: space-between; gap: 6px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .lb em { font-style: normal; letter-spacing: 0.2px; text-transform: none; color: var(--text-muted); }
  .in { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  input { width: 100%; min-width: 0; height: 64px; border: 0; outline: 0; background: none; color: var(--text); font-family: var(--font-mono); font-size: 56px; font-weight: 500; letter-spacing: -0.05em; line-height: 1.1; }
  input::placeholder { color: rgba(255, 255, 255, 0.2); }
  .u { flex-shrink: 0; font-size: 15px; font-weight: 500; color: var(--text-tertiary); }
  @media (max-height: 600px) { input { font-size: 44px; height: 54px; } }
</style>
