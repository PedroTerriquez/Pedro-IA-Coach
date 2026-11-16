<script lang="ts">
  import Icon from './Icon.svelte'
  import { formatWeight } from '$lib/exercise-history'
  import type { SetEntry } from '$lib/set-log'
  import TID from '$lib/test-ids.json'

  // «Registrado hoy»: what was done today, one read-only row per set (also
  // when they are all equal). Read at a glance between sets, so nothing here
  // edits; the one action, «Editar series», opens «Confirma tus series».
  let { sets, units = 'kg', target = '', recordIdx = -1, before = '', onedit }: {
    sets: SetEntry[]
    units?: string
    /** The plan's reps («8-10»), to mark the sets that fell short or went over */
    target?: string
    /** The set that beats the best before, or -1 */
    recordIdx?: number
    /** That best before, for the record strip («82.5 × 8») */
    before?: string
    onedit: () => void
  } = $props()

  let range = $derived(repRange(target))
  let volume = $derived(Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0)))
  // Six or more: two columns read top to bottom, the unit moves to the header
  let twoCols = $derived(sets.length >= 6)

  function repRange(reps: string): [number, number] {
    const n = String(reps).match(/\d+/g)?.map(Number) ?? []
    return [n[0] ?? 0, n[1] ?? n[0] ?? 0]
  }

  function offTarget(reps: number): number {
    const [lo, hi] = range
    if (!lo || !reps) return 0
    return reps < lo ? reps - lo : reps > hi ? reps - hi : 0
  }

  function tag(s: SetEntry, i: number): string {
    if (i === recordIdx) return 'Récord'
    const d = offTarget(s.reps)
    if (!d) return ''
    return `${d < 0 ? '−' : '+'}${Math.abs(d)}${twoCols ? '' : ' rep'}`
  }
</script>

<section class="rh" data-component="LoggedPanel">
  <div class="rh-h">
    <span class="rh-ok"><Icon name="check" size={16} /></span>
    <span><b>Registrado hoy</b><small><em>{sets.length} {sets.length === 1 ? 'serie' : 'series'}</em> · {volume.toLocaleString('en-US')} {units}</small></span>
    {#if twoCols}<span class="rh-leg">{units} × reps</span>{/if}
  </div>
  {#if recordIdx >= 0}
    <div class="rh-pr"><Icon name="up" size={16} /><b>Tu nuevo récord</b>{#if before}<span>antes {before}</span>{/if}</div>
  {/if}
  <div class="rh-l" class:g={twoCols} style={twoCols ? `grid-template-rows:repeat(${Math.ceil(sets.length / 2)},auto)` : ''}>
    {#each sets as s, i}
      <div class="rh-r" class:pr={i === recordIdx} class:lo={i !== recordIdx && offTarget(s.reps) < 0} data-testid={TID.loggedSet}>
        <span class="rh-n">{i + 1}</span>
        <span class="rh-v"><b>{formatWeight(s.weight)}</b>{#if !twoCols}<small>{units}</small>{/if}<i>×</i>{s.reps}</span>
        <span class="rh-t">{tag(s, i)}</span>
      </div>
    {/each}
  </div>
  <button class="rh-e" type="button" onclick={onedit}><Icon name="pen" size={18} />Editar series</button>
</section>

<style>
  /* scroll-margin: revealed after saving, it stops above the dock */
  .rh { scroll-margin: 12px 0 190px; border-radius: var(--radius-2xl); background: var(--cv-fill-1); box-shadow: inset 0 0 0 1.5px var(--accent); padding: 16px 14px 14px; display: flex; flex-direction: column; gap: 12px; }
  .rh-h { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 4px; }
  .rh-ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .rh-h b { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .rh-h small { display: block; margin-top: 2px; font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
  .rh-h small em { font-style: normal; color: var(--text); }
  .rh-leg { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .rh-pr { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: var(--radius-md); background: var(--accent); color: var(--bg); }
  .rh-pr b { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; white-space: nowrap; }
  .rh-pr span { margin-left: auto; font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: #0a0a0ab3; white-space: nowrap; }
  .rh-l { display: flex; flex-direction: column; gap: 6px; }
  .rh-l.g { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; gap: 6px; }
  .rh-r { min-height: 52px; border-radius: var(--radius-md); background: #ffffff08; display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 14px 0 10px; }
  .rh-n { width: 30px; height: 30px; border-radius: 50%; background: #ffffff12; display: grid; place-items: center; font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .rh-v { font-family: var(--font-mono); font-size: 24px; font-weight: 500; letter-spacing: -0.06em; line-height: 1; white-space: nowrap; display: flex; align-items: baseline; }
  .rh-v b { font-weight: 500; min-width: 4ch; text-align: right; }
  .rh-v small { font-size: 12px; letter-spacing: 0.5px; color: var(--text-tertiary); margin-left: 3px; }
  .rh-v i { font-style: normal; font-size: 16px; color: var(--text-muted); margin: 0 7px; letter-spacing: 0; }
  .rh-t { font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; white-space: nowrap; display: flex; align-items: center; gap: 6px; color: var(--text-tertiary); }
  .rh-r.lo .rh-t { color: #ffb35c; }
  .rh-r.lo .rh-t::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ffb35c; }
  .rh-r.pr { background: color-mix(in srgb, var(--accent) 9%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent); }
  .rh-r.pr .rh-n { background: var(--accent); color: var(--bg); }
  .rh-r.pr .rh-t { color: var(--accent); }
  .g .rh-r { grid-template-columns: 26px minmax(0, 1fr) auto; gap: 8px; padding: 0 10px 0 8px; }
  .g .rh-n { width: 26px; height: 26px; font-size: 12px; }
  .g .rh-v { font-size: 21px; }
  .g .rh-v b { min-width: 0; }
  .g .rh-v i { margin: 0 4px; font-size: 14px; }
  .rh-e { height: 52px; margin-top: 2px; border: 0; border-radius: var(--radius-lg); background: var(--cv-fill-2); color: var(--text); font-family: var(--font-sans); font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: background 0.15s; }
  .rh-e:active { background: var(--cv-fill-3); }
  .rh-e :global(svg) { color: var(--text-secondary); }

  /* iPhone SE */
  @media (max-width: 360px), (max-height: 600px) {
    .rh { padding: 10px; gap: 8px; border-radius: var(--radius-xl); }
    .rh-h { gap: 10px; }
    .rh-h b { font-size: 16px; }
    .rh-h small { font-size: 12px; }
    .rh-l { gap: 4px; }
    .rh-r { min-height: 44px; gap: 10px; padding: 0 12px 0 8px; }
    .rh-n { width: 28px; height: 28px; }
    .rh-v { font-size: 22px; }
    .rh-e { height: 48px; font-size: 15px; }
  }
</style>
