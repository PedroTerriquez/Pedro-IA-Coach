<script lang="ts">
  import type { Program } from '$lib/types'
  import { dayDurationMin, plural, weekdayName } from '$lib/program-utils'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  // «Listo, {nombre}.» after a program is created with the coach or from a paste.
  let { program, userName, ontoday, onprogram }: {
    program: Program
    userName: string
    ontoday: () => void
    onprogram: () => void
  } = $props()

  let firstDay = $derived(program.weeks[0]?.days.find(d => d.exercises.length) || null)
  let firstDayTitle = $derived(firstDay ? [weekdayName(firstDay.weekday), firstDay.name].filter(Boolean).join(' · ') : '')
</script>

<div class="cel" role="dialog" aria-modal="true" aria-label="Programa listo" data-component="ProgramReady">
  <div class="cel-c">
    <span class="ok"><Icon name="check" size={24} /></span>
    <div class="ttl">Listo, {userName}.</div>
    <p class="note">«{program.name}» ya es tu programa activo.</p>
    {#if firstDay}
      <div class="nextup">
        <span class="lbl">Empiezas con</span>
        <div class="nextup-t">{firstDayTitle}<small>{plural(firstDay.exercises.length, 'ejercicio', 'ejercicios')} · ~{dayDurationMin(firstDay.exercises)} min</small></div>
      </div>
    {/if}
  </div>
  <div class="cel-d">
    <Button size="lg" variant="primary" onclick={ontoday}>Ver en Hoy<Icon name="arrow" size={18} /></Button>
    <Button size="lg" variant="text" style="align-self:center" onclick={onprogram}>Ver programa</Button>
  </div>
</div>

<style>
  .cel {
    position: fixed;
    inset: 0;
    z-index: 210;
    display: flex;
    flex-direction: column;
    padding: max(54px, env(safe-area-inset-top, 0px)) 24px 0;
    background: var(--bg);
  }
  .cel-c { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; padding-bottom: 28px; }
  .ok { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--bg); }
  .ttl { margin-top: 14px; font-size: 38px; font-weight: 700; letter-spacing: -1.5px; line-height: 1; }
  .note { font-size: 17px; line-height: 1.5; color: var(--text-secondary); }
  .nextup { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: var(--radius-2xl); background: var(--surface); }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .nextup-t { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
  .nextup-t small { display: block; margin-top: 6px; font-family: var(--font-mono); font-size: 14px; font-weight: 500; letter-spacing: 0; color: var(--text-secondary); }
  .cel-d { display: flex; flex-direction: column; gap: 4px; padding-bottom: max(44px, env(safe-area-inset-bottom, 0px)); }
</style>
