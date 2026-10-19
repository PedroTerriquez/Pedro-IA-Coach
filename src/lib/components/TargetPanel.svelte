<script lang="ts">
  // What today asks for. Exercises: «4 × 8-10» + «2:00 de descanso».
  // Moves (`one`): the whole sentence of their dose, as text.
  let { variant = 'two', sets = 0, reps = '', rest = '', text = '' }: {
    variant?: 'two' | 'one'
    sets?: number
    reps?: string
    /** m:ss */
    rest?: string
    text?: string
  } = $props()
</script>

{#if variant === 'one'}
  <div class="obj one" data-component="TargetPanel">
    <div class="cell"><p class="phrase">{text}</p></div>
  </div>
{:else}
  <div class="obj" data-component="TargetPanel">
    <div class="cell">
      <b>{sets}<i>×</i>{reps}</b>
      <span class="lab">series × reps</span>
    </div>
    <div class="cell rest">
      <b>{rest}</b>
      <span class="lab">de descanso</span>
    </div>
  </div>
{/if}

<style>
  .obj { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 8px; }
  .obj.one { grid-template-columns: minmax(0, 1fr); }
  .cell { display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; padding: 12px 16px 11px; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  b { font-family: var(--font-mono); font-size: 34px; font-weight: 500; letter-spacing: -0.06em; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  b i { font-style: normal; color: var(--text-muted); font-size: 22px; margin: 0 5px; letter-spacing: 0; vertical-align: 4px; }
  .rest b { font-size: 26px; color: var(--text-secondary); }
  .lab { font-size: 13px; color: var(--text-tertiary); }
  .phrase { font-size: 17px; line-height: 1.4; letter-spacing: -0.2px; color: var(--text); text-wrap: pretty; padding: 2px 0 3px; }
</style>
