<script lang="ts">
  import Icon from './Icon.svelte'
  import ExerciseRow from './ExerciseRow.svelte'
  import type { PhaseView, PhaseKey } from '$lib/session-steps'

  // Hoy v2: the three numbered steps. Only the current one is unfolded; the
  // done and later ones fold into a 68 row that opens with a tap.
  let { phases, onrow }: {
    phases: PhaseView[]
    onrow: (key: PhaseKey, idx: number) => void
  } = $props()

  let expanded = $state<Record<string, boolean>>({})

  function toggle(key: PhaseKey) {
    expanded = { ...expanded, [key]: !expanded[key] }
  }
</script>

{#snippet rows(ph: PhaseView)}
  <div class="xl">
    {#each ph.rows as r, i}
      <ExerciseRow variant="session" name={r.name} sub={r.sub} right={r.right} imgUrl={r.imgUrl} state={r.state} pips={r.pips} onclick={() => onrow(ph.key, i)} />
    {/each}
  </div>
{/snippet}

<div class="sess" data-component="SessionSteps">
  {#each phases as ph (ph.key)}
    {#if ph.state === 'open'}
      <section class="ph" data-phase={ph.key} data-state="open">
        <div class="ph-h">
          <span class="ph-i">{ph.num}</span>
          <span class="ph-t">{ph.name}</span>
          <span class="ph-c">{ph.done} de {ph.total}</span>
        </div>
        {@render rows(ph)}
      </section>
    {:else}
      <section class="ph" data-phase={ph.key} data-state={ph.state}>
        <button type="button" class="ph-row" class:done={ph.state === 'done'} aria-expanded={!!expanded[ph.key]} onclick={() => toggle(ph.key)}>
          {#if ph.state === 'done'}
            <span class="ph-i ok"><Icon name="check" size={16} /></span>
          {:else}
            <span class="ph-i">{ph.num}</span>
          {/if}
          <span class="min0">
            <span class="ph-t">{ph.name}</span>
            <span class="ph-s">{ph.state === 'done' ? `${ph.total} de ${ph.total} hechos` : ph.sub}</span>
          </span>
          <span class="ph-c">{#if ph.state === 'later'}Después{/if}<Icon name={expanded[ph.key] ? 'up' : 'down'} size={16} /></span>
        </button>
        {#if expanded[ph.key]}{@render rows(ph)}{/if}
      </section>
    {/if}
  {/each}
</div>

<style>
  .sess { display: flex; flex-direction: column; gap: 12px; }
  .ph { display: flex; flex-direction: column; gap: 10px; }
  .ph-h { display: flex; align-items: center; gap: 12px; padding: 4px 4px 2px; }
  .ph-i { width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-mono); font-size: 13px; color: var(--text); box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.6); }
  .ph-i.ok { background: var(--accent); color: var(--bg); box-shadow: none; }
  .ph-t { display: block; font-size: 20px; font-weight: 600; letter-spacing: -0.4px; }
  .ph-h .ph-t { flex: 1; }
  .ph-c { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .ph-row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 68px;
    padding: 10px 16px 10px 14px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  .ph-row .ph-t { font-size: 17px; letter-spacing: -0.2px; }
  .ph-row .ph-i { color: var(--text-muted); box-shadow: inset 0 0 0 1.5px var(--cv-line-strong); }
  .ph-row .ph-i.ok { color: var(--bg); box-shadow: none; }
  .ph-row.done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .ph-s { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .min0 { min-width: 0; }
  .xl { display: flex; flex-direction: column; gap: 8px; }
</style>
