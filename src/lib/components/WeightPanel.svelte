<script lang="ts">
  import Icon from './Icon.svelte'
  import { formatWeight } from '$lib/exercise-history'
  import { plural } from '$lib/program-utils'

  // Today's weight: − / + of 5 and the number itself, which takes the
  // keyboard when tapped. Registered = accent border, check and how to fix it.
  let {
    weight = $bindable(0),
    units = 'kg',
    lastWeight = 0,
    sets = 0,
    saved = false,
    savedSets = 0,
    isRecord = false,
    onblocks,
  }: {
    weight?: number
    units?: string
    lastWeight?: number
    sets?: number
    saved?: boolean
    savedSets?: number
    isRecord?: boolean
    onblocks: () => void
  } = $props()

  const STEP = 5

  let display = $derived(weight > 0 ? formatWeight(weight) : '')
  let caption = $derived(sets > 0 ? `Igual en las ${sets} series` : `De ${STEP} en ${STEP} ${units}`)
  let savedLine = $derived([savedSets > 0 ? plural(savedSets, 'serie', 'series') : '', isRecord ? 'tu nuevo récord' : ''].filter(Boolean).join(' · '))

  function step(dir: 1 | -1) {
    weight = Math.max(0, +(weight + dir * STEP).toFixed(1))
  }

  // While typing, the field keeps the raw text so «80.» isn't snapped to «80»
  let typing = $state<string | null>(null)

  function typed(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(',', '.').replace(/[^0-9.]/g, '')
    typing = raw
    weight = raw === '' ? 0 : parseFloat(raw) || 0
  }

  // The unit sits right after the figure, so the field is as wide as its text
  function fieldWidth(text: string): string {
    return `${Math.max(1, text.length) * 0.96 + 0.15}ch`
  }

  function focused(e: FocusEvent) {
    typing = display
    ;(e.target as HTMLInputElement).select()
  }
</script>

<section class="stp" class:saved data-component="WeightPanel">
  {#if saved}
    <div class="top">
      <span class="ok"><Icon name="check" size={16} /></span>
      <span><b>Registrado hoy</b>{#if savedLine}<small>{savedLine}</small>{/if}</span>
    </div>
  {:else}
    <div class="hd">
      <span class="lbl">Peso de hoy</span>
      {#if lastWeight > 0}<span class="last">Última vez <b>{formatWeight(lastWeight)} {units}</b></span>{/if}
    </div>
  {/if}
  <div class="r">
    <button type="button" class="b" aria-label="Menos peso" disabled={weight <= 0} onclick={() => step(-1)}><Icon name="minus" size={26} /></button>
    <label class="v">
      <input value={typing ?? display} placeholder="0" inputmode="decimal" pattern="[0-9.]*" style="width:{fieldWidth(typing ?? display)}" aria-label="Peso de hoy" oninput={typed} onfocus={focused} onblur={() => (typing = null)} />
      <small>{units}</small>
    </label>
    <button type="button" class="b" aria-label="Más peso" onclick={() => step(1)}><Icon name="plus" size={26} /></button>
  </div>
  <p class="cap">{saved ? 'Toca − o + para corregirlo' : caption}</p>
  {#if !saved}
    <button type="button" class="lnk" onclick={onblocks}>Series con pesos distintos<Icon name="chev" size={14} /></button>
  {/if}
</section>

<style>
  .stp { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px 4px; border-radius: var(--radius-2xl); background: var(--cv-fill-1); }
  .stp.saved { box-shadow: inset 0 0 0 1.5px var(--accent); padding-bottom: 16px; }
  .top { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: center; }
  .top b { display: block; font-size: 16px; }
  .top small { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 20px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .last { font-size: 13px; color: var(--text-tertiary); }
  .last b { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); letter-spacing: -0.03em; }
  .r { display: grid; grid-template-columns: 58px minmax(0, 1fr) 58px; align-items: center; }
  .b { width: 58px; height: 58px; border: 0; border-radius: 50%; background: var(--cv-fill-3); color: var(--text); display: grid; place-items: center; cursor: pointer; }
  .b:disabled { opacity: 0.3; cursor: default; }
  .v { display: flex; align-items: baseline; justify-content: center; min-width: 0; }
  .v input {
    max-width: 100%;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    padding: 0;
    text-align: center;
    color: var(--text);
    caret-color: var(--accent);
    font-family: var(--font-mono);
    font-size: 56px;
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 1;
  }
  .v input::placeholder { color: var(--text-muted); }
  .v small { font-size: 17px; color: var(--text-tertiary); margin-left: 4px; font-weight: 500; }
  .cap { text-align: center; font-size: 13px; color: var(--text-tertiary); margin-top: -6px; }
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
