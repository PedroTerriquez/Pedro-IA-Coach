<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from './Icon.svelte'
  import NumberStepper from './NumberStepper.svelte'
  import { formatWeight } from '$lib/exercise-history'
  import type { PendingExercise } from '$lib/session-idle'

  // An exercise of a session left open, not registered: «Lo hice» confirms it
  // with the last time's weight; «Cambiar peso» opens the stepper. `confirmed`
  // is the weight to save, or null while it stays unregistered.
  let { item, units = 'kg', confirmed = $bindable<number | null>(null) }: {
    item: PendingExercise
    units?: string
    confirmed?: number | null
  } = $props()

  const STEP = 2.5

  // The card starts from the weight it was given; later changes come from its own buttons
  let mode = $state<'idle' | 'ok' | 'edit'>(untrack(() => item.weight) > 0 ? 'idle' : 'edit')
  let weight = $state(untrack(() => item.weight))
  let edited = $derived(weight !== item.weight)

  function confirm() {
    if (!(weight > 0)) return
    mode = 'ok'
    confirmed = weight
  }

  function undo() {
    mode = item.weight > 0 ? 'idle' : 'edit'
    weight = item.weight
    confirmed = null
  }

  function step(dir: 1 | -1) {
    weight = Math.max(0, +(weight + dir * STEP).toFixed(1))
  }
</script>

<div class="pend" class:ok={mode === 'ok'} data-component="PendingExerciseCard" data-exercise={item.exerciseId}>
  <div class="px">
    {#if item.imgUrl}<img alt="" src={item.imgUrl} />{:else}<span class="ph"></span>{/if}
    <span class="tx">
      <span class="pn">{item.name}</span>
      {#if mode === 'ok'}
        <span class="ps">Hoy <b>{item.sets} × {formatWeight(weight)} {units}</b>{#if edited}{' · '}<span class="ed">editado</span>{/if}</span>
      {:else}
        <span class="ps">Plan <b>{item.sets} × {item.reps}</b>{#if item.lastWeight > 0}{' · Última '}<b>{formatWeight(item.lastWeight)} {units}</b>{/if}</span>
      {/if}
    </span>
    {#if mode === 'ok'}<span class="chk"><Icon name="check" size={16} /></span>{/if}
  </div>

  {#if mode === 'idle'}
    <button type="button" class="yes" onclick={confirm}>Lo hice <span class="m">{item.sets} × {formatWeight(weight)} {units}</span></button>
  {:else if mode === 'ok'}
    <div class="pact">
      <button type="button" onclick={undo}>No lo hice</button>
      <button type="button" onclick={() => (mode = 'edit')}>Cambiar peso</button>
    </div>
  {:else}
    <div class="wp">
      <div class="hd">
        <span class="k">Peso · {item.sets} series</span>
        {#if item.lastWeight > 0}<span class="last">Última vez <b>{formatWeight(item.lastWeight)} {units}</b></span>{/if}
      </div>
      <NumberStepper name="peso" display={formatWeight(weight)} unit={units} decDisabled={weight <= 0} onstep={step} />
      <button type="button" class="lnk" disabled={!(weight > 0)} onclick={confirm}>Listo</button>
    </div>
  {/if}
</div>

<style>
  .pend { background: var(--cv-fill-1); border-radius: 20px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
  .pend.ok { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .px { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 14px; align-items: center; }
  .px img, .ph { width: 52px; height: 52px; border-radius: 14px; object-fit: cover; background: var(--media-bg, #f2f2f0); display: block; }
  .tx { min-width: 0; display: flex; flex-direction: column; }
  .pn { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; line-height: 1.25; }
  .ps { font-size: 13px; color: var(--text-tertiary); margin-top: 3px; }
  .ps b { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); letter-spacing: -0.03em; }
  .ed { color: var(--accent); }
  .chk { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  button { font-family: inherit; color: var(--text); border: 0; cursor: pointer; }
  button:disabled { opacity: 0.3; cursor: default; }
  .yes { height: 56px; border-radius: 18px; background: var(--cv-fill-3); font-size: 17px; font-weight: 600; letter-spacing: -0.2px; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 0 12px; }
  .yes .m { white-space: nowrap; font-family: var(--font-mono); font-weight: 500; letter-spacing: -0.03em; color: var(--text-secondary); }
  .pact { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pact button { height: 48px; border-radius: 9999px; background: var(--cv-fill-2); font-size: 15px; font-weight: 600; }
  .wp { background: var(--cv-fill-1); border-radius: 18px; padding: 14px 14px 0; display: flex; flex-direction: column; gap: 10px; }
  .hd { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .k { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .last { font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .last b { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); }
  .lnk { height: 48px; width: 100%; border-top: 0.5px solid var(--border-medium); background: none; font-size: 15px; font-weight: 600; }
</style>
