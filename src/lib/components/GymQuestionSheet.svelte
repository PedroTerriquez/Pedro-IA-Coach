<script lang="ts">
  import ActivitySheetFrame from './ActivitySheetFrame.svelte'
  import Icon from './Icon.svelte'

  // «¿Y Pecho y tríceps?» (Nuevo · Hoy actividades 05): asked once, after the
  // first activity saved on a gym day. The workout stays, moves a day
  // («Me salté un día») or is left as not done this week.
  let { saved, minutes, dayName, onlater, onmove, onskip }: {
    /** «Correr» */
    saved: string
    minutes: number
    dayName: string
    onlater: () => void
    onmove: () => void
    onskip: () => void
  } = $props()
</script>

<ActivitySheetFrame id="gym-question-sheet" label="¿Y {dayName}?" name="GymQuestionSheet">
  <div class="saved"><span class="ok"><Icon name="check" size={16} /></span><span>{saved} · <b>{minutes} min</b> guardado</span></div>
  <div>
    <h2 class="h">¿Y {dayName}?</h2>
    <p class="why">Sigue en tu plan de hoy. Elige qué pasa con él.</p>
  </div>
  {#snippet dock()}
    <div class="chs">
      <button type="button" class="ch pri" onclick={onlater}><b>Lo hago hoy más tarde</b><span>Sigue como entrenamiento de hoy</span></button>
      <button type="button" class="ch" onclick={onmove}><b>Pasarlo a mañana</b><span>Mueve la semana un día, como «Me salté un día»</span></button>
      <button type="button" class="ch" onclick={onskip}><b>Saltarlo esta semana</b><span>El resto de la semana no cambia</span></button>
    </div>
  {/snippet}
</ActivitySheetFrame>

<style>
  .saved { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--text-secondary); }
  .saved b { font-family: var(--font-mono); font-weight: 500; color: var(--text); }
  .ok { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; background: var(--act); color: var(--text); }
  .chs { display: flex; flex-direction: column; gap: 8px; }
  .ch { width: 100%; min-height: 64px; padding: 10px 18px; display: flex; flex-direction: column; justify-content: center; gap: 2px; border: 0; border-radius: 18px; background: var(--cv-fill-2); color: var(--text); font-family: inherit; text-align: left; cursor: pointer; }
  .ch b { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .ch span { font-size: 13px; color: var(--text-tertiary); }
  .ch.pri { background: var(--accent); color: var(--bg); }
  .ch.pri span { color: rgba(10, 10, 10, 0.65); }
</style>
