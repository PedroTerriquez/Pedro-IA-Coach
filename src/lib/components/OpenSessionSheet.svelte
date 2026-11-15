<script lang="ts">
  import { untrack } from 'svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import PendingExerciseCard from './PendingExerciseCard.svelte'
  import { joinNames, type PendingExercise } from '$lib/session-idle'

  // «Tu sesión quedó abierta»: the session went 45 min without activity. It
  // ends at the last activity + 3 min; what's pending can be confirmed here.
  // On an earlier day (`eyebrow` set) there is no «Sigo entrenando».
  let {
    eyebrow = '',
    endTime,
    lastTime,
    minutes,
    pending,
    doneNames,
    units = 'kg',
    accent = 'var(--accent)',
    onsave,
    oncontinue = null,
  }: {
    eyebrow?: string
    /** «18:42» */
    endTime: string
    lastTime: string
    minutes: number
    pending: PendingExercise[]
    doneNames: string[]
    units?: string
    accent?: string
    onsave: (confirmed: { item: PendingExercise; weight: number }[]) => void
    oncontinue?: (() => void) | null
  } = $props()

  let confirmed = $state<(number | null)[]>(untrack(() => pending.map(() => null)))
  let left = $derived(pending.filter((_, i) => confirmed[i] == null))
  let total = $derived(pending.length + doneNames.length)
  let caption = $derived([pendingCaption(), eyebrow ? 'Después ves tu día de hoy.' : ''].filter(Boolean).join(' '))

  function pendingCaption(): string {
    if (!pending.length) return ''
    if (!left.length) return `Se guardan los ${total} ejercicios.`
    return `${joinNames(left.map(p => p.name))} ${left.length === 1 ? 'queda' : 'quedan'} sin registrar.`
  }

  function save() {
    onsave(pending.flatMap((item, i) => (confirmed[i] != null ? [{ item, weight: confirmed[i] as number }] : [])))
  }
</script>

<div class="os" data-component="OpenSessionSheet" role="dialog" aria-modal="true" aria-label="Tu sesión quedó abierta">
  <div class="scrim"></div>
  <div class="sh">
    <div class="handle"></div>
    <div class="sb">
      <div>
        {#if eyebrow}<div class="k">{eyebrow}</div>{/if}
        <h2 class="h">Tu sesión quedó abierta</h2>
        <p class="when">Terminaste a las <b>{endTime}</b> · <b>{minutes} min</b></p>
        <p class="why">Tu última actividad fue a las <b>{lastTime}</b>. Lo que pasó después no cuenta.</p>
      </div>
      {#if pending.length}
        <div>
          <div class="k" style="margin-bottom:10px">Falta registrar · {pending.length} {pending.length === 1 ? 'ejercicio' : 'ejercicios'}</div>
          <div class="list">
            {#each pending as item, i (item.exerciseId)}
              <PendingExerciseCard {item} {units} bind:confirmed={confirmed[i]} />
            {/each}
          </div>
        </div>
      {:else if doneNames.length}
        <div class="allok">
          <span class="chk"><Icon name="check" size={16} /></span>
          <span class="tx">
            <span class="pn">{doneNames.length} de {doneNames.length} {doneNames.length === 1 ? 'ejercicio registrado' : 'ejercicios registrados'}</span>
            <span class="ps">{joinNames(doneNames)}</span>
          </span>
        </div>
      {/if}
    </div>
    <div class="dk">
      {#if caption}<p class="cap">{caption}</p>{/if}
      <Button variant="primary" size="lg" fullWidth {accent} onclick={save}>Guardar así</Button>
      {#if oncontinue}
        <button type="button" class="ghost" onclick={oncontinue}>Sigo entrenando</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .os { position: fixed; inset: 0; z-index: 150; }
  .scrim { position: absolute; inset: 0; background: var(--cv-scrim); }
  .sh {
    position: absolute; left: 0; right: 0; bottom: 0;
    max-height: calc(100% - max(24px, var(--safe-top)));
    background: var(--surface);
    border-radius: 28px 28px 0 0;
    border: 0.5px solid var(--border);
    border-bottom: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.5);
  }
  .handle { width: 36px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.18); margin: 8px auto 0; flex-shrink: 0; }
  .sb { flex: 1; min-height: 0; overflow: auto; padding: 18px 20px 8px; display: flex; flex-direction: column; gap: 20px; }
  .sb > * { flex-shrink: 0; }
  .k { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .h { font-size: 26px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.1; margin: 6px 0 0; text-wrap: balance; }
  .when { font-size: 19px; color: var(--text-secondary); margin: 10px 0 0; letter-spacing: -0.2px; }
  .when b { font-family: var(--font-mono); font-weight: 500; color: var(--text); letter-spacing: -0.04em; }
  .why { font-size: 13px; color: var(--text-tertiary); margin: 6px 0 0; text-wrap: pretty; }
  .why b { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .allok { background: var(--cv-fill-1); border-radius: 20px; padding: 14px 16px; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 14px; align-items: center; }
  .chk { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .tx { min-width: 0; display: flex; flex-direction: column; }
  .pn { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; line-height: 1.25; }
  .ps { font-size: 13px; color: var(--text-tertiary); margin-top: 3px; }
  .dk { flex-shrink: 0; padding: 12px 20px max(16px, env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }
  .cap { font-size: 13px; color: var(--text-tertiary); text-align: center; text-wrap: pretty; line-height: 1.4; margin: 0; }
  .ghost { height: 48px; width: 100%; border: 0; background: none; color: var(--text-secondary); font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
  @media (max-height: 600px) {
    .sb { padding: 12px 16px 6px; gap: 14px; }
    .h { font-size: 22px; letter-spacing: -0.6px; }
    .when { font-size: 17px; margin-top: 6px; }
    .dk { padding: 8px 16px 12px; gap: 6px; }
  }
</style>
