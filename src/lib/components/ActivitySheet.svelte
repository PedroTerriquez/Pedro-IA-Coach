<script lang="ts">
  import { untrack } from 'svelte'
  import ActivitySheetFrame from './ActivitySheetFrame.svelte'
  import SportIcon from './SportIcon.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import { SPORTS, sportOf, activityResult, resultLabel, num, type ActivityDraft } from '$lib/activities'
  import type { Activity, SportKey } from '$lib/types'

  // «¿Qué hiciste?» → the sport's form (Nuevo · Hoy actividades 02–04, 07).
  // Only the time is required; the pace or speed comes out as a result.
  // With `editing` it opens straight on the form, with «Eliminar actividad».
  let { eyebrow, editing = null, accent = 'var(--accent)', onsave, ondelete, onclose }: {
    /** «Mar 17 nov» */
    eyebrow: string
    editing?: Activity | null
    accent?: string
    onsave: (draft: ActivityDraft) => void
    ondelete?: () => void
    onclose: () => void
  } = $props()

  const init = untrack(() => editing)
  let sport = $state<SportKey | null>(init?.sport ?? null)
  let minutes = $state(init ? String(num(init.minutes) || '') : '')
  let km = $state(init?.km ? String(init.km) : '')
  let kcal = $state(init?.kcal ? String(init.kcal) : '')
  let name = $state(init?.name ?? '')

  let s = $derived(sport ? sportOf(sport) : null)
  let result = $derived(sport ? activityResult(sport, minutes, km) : null)
  let canSave = $derived(num(minutes) > 0)

  function pick(key: SportKey) {
    sport = key
    minutes = ''
    km = ''
    kcal = ''
    name = ''
  }

  function save() {
    if (!s || !canSave) return
    onsave({
      sport: s.key,
      minutes: num(minutes),
      ...(s.dist && num(km) ? { km: num(km) } : {}),
      ...(!s.dist && num(kcal) ? { kcal: Math.round(num(kcal)) } : {}),
      ...(s.key === 'otra' && name.trim() ? { name: name.trim() } : {}),
    })
  }
</script>

{#if !s}
  <ActivitySheetFrame id="activity-sheet" label="¿Qué hiciste?" {onclose}>
    <div>
      <div class="eyb">{eyebrow} · Otra actividad</div>
      <h2 class="h">¿Qué hiciste?</h2>
      <p class="why">Tus minutos suman a la liga y a tu racha.</p>
    </div>
    <div class="sports">
      {#each SPORTS as sp (sp.key)}
        <button type="button" class="sp" style="--h:{sp.hue}" data-sport={sp.key} onclick={() => pick(sp.key)}>
          <SportIcon sport={sp.key} size={26} />
          <span class="sp-t"><b>{sp.name}</b><small>{sp.dist ? 'min · km' : 'min · kcal'}</small></span>
        </button>
      {/each}
    </div>
    {#snippet dock()}
      <button type="button" class="ghost" onclick={onclose}>Cancelar</button>
    {/snippet}
  </ActivitySheetFrame>
{:else}
  <ActivitySheetFrame id="activity-sheet" label={s.name} {onclose}>
    <div class="shd">
      <button type="button" class="back" aria-label="Atrás" onclick={() => (editing ? onclose() : (sport = null))}><Icon name="back" size={20} /></button>
      <div class="mn">
        <div class="eyb">{editing ? 'Editar actividad' : eyebrow}</div>
        <h2 class="h">{s.name}</h2>
      </div>
    </div>
    {#if s.key === 'otra'}
      <label class="fld txt">
        <span class="lb">Qué fue<em>opcional</em></span>
        <input type="text" placeholder="Yoga, fútbol, caminar…" maxlength="40" bind:value={name} />
      </label>
    {/if}
    <div class="flds">
      <label class="fld">
        <span class="lb">Tiempo</span>
        <span class="in"><input aria-label="Tiempo" inputmode="numeric" placeholder="0" bind:value={minutes} /><span class="u">min</span></span>
      </label>
      {#if s.dist}
        <label class="fld">
          <span class="lb">Distancia<em>opcional</em></span>
          <span class="in"><input aria-label="Distancia" inputmode="decimal" placeholder="0" bind:value={km} /><span class="u">km</span></span>
        </label>
      {:else}
        <label class="fld">
          <span class="lb">Calorías<em>opcional</em></span>
          <span class="in"><input aria-label="Calorías" inputmode="numeric" placeholder="0" bind:value={kcal} /><span class="u">kcal</span></span>
        </label>
      {/if}
    </div>
    {#if s.dist}
      <div class="res" data-result>
        <span>{result?.label ?? resultLabel(s.key)}</span>
        {#if result}<b>{result.value}<small>{result.unit}</small></b>{:else}<b class="off">—</b>{/if}
      </div>
    {/if}
    {#snippet dock()}
      <p class="cap">{#if canSave}Suma <b>{num(minutes)} min</b> a tu semana{:else}Solo el tiempo es obligatorio{/if}</p>
      <Button variant="primary" size="lg" fullWidth {accent} disabled={!canSave} onclick={save}>{editing ? 'Guardar cambios' : 'Guardar'}</Button>
      {#if editing && ondelete}
        <button type="button" class="ghost del" onclick={ondelete}>Eliminar actividad</button>
      {/if}
    {/snippet}
  </ActivitySheetFrame>
{/if}

<style>
  .mn { min-width: 0; }
  .sports { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sp {
    min-height: 112px; padding: 14px; border: 0; border-radius: 22px; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;
    background: linear-gradient(160deg, oklch(0.27 0.05 var(--h)) 0%, oklch(0.2 0.015 var(--h)) 100%);
    box-shadow: inset 0 0 0 1px oklch(0.45 0.08 var(--h) / 0.35);
    color: var(--text); font-family: inherit;
    transition: transform 0.15s var(--ease-smooth);
  }
  .sp:active { transform: scale(0.96); }
  .sp-t { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .sp b { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
  .sp small { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.2px; color: oklch(0.8 0.04 var(--h) / 0.75); }
  .flds { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fld { min-width: 0; padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 6px; border-radius: 16px; background: var(--cv-fill-1); box-shadow: inset 0 0 0 1.5px transparent; cursor: text; }
  .fld:focus-within { background: var(--cv-fill-2); box-shadow: inset 0 0 0 1.5px var(--cv-ring-current); }
  .lb { display: flex; justify-content: space-between; gap: 6px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .lb em { font-style: normal; letter-spacing: 0.2px; text-transform: none; color: var(--text-muted); }
  .in { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .fld input { width: 100%; min-width: 0; height: 48px; border: 0; outline: 0; background: none; color: var(--text); font-family: var(--font-mono); font-size: 40px; font-weight: 500; letter-spacing: -0.05em; line-height: 1.1; }
  .fld.txt input { height: 32px; font-family: var(--font-sans); font-size: 20px; letter-spacing: -0.2px; }
  .fld input::placeholder { color: rgba(255, 255, 255, 0.2); }
  .u { flex-shrink: 0; font-size: 15px; font-weight: 500; color: var(--text-tertiary); }
  .res { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 14px 16px; border-radius: 16px; border: 0.5px dashed var(--cv-line-strong); }
  .res span { font-size: 15px; color: var(--text-secondary); }
  .res b { font-family: var(--font-mono); font-size: 24px; font-weight: 500; letter-spacing: -0.04em; white-space: nowrap; }
  .res b small { margin-left: 4px; font-size: 13px; font-weight: 400; letter-spacing: 0; color: var(--text-tertiary); }
  .res b.off { color: var(--text-muted); }
  @media (max-height: 600px) {
    .sp { min-height: 88px; padding: 11px; gap: 6px; border-radius: 18px; }
    .sp b { font-size: 17px; }
    .sp :global(.sp-ic) { width: 38px !important; height: 38px !important; border-radius: 12px !important; }
    .fld input { font-size: 32px; height: 42px; }
  }
</style>
