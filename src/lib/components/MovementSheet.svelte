<script lang="ts">
  import { online } from '$lib/stores/network'
  import DetailSheet from './DetailSheet.svelte'
  import ExerciseMedia from './ExerciseMedia.svelte'
  import TitleNav from './TitleNav.svelte'
  import TargetPanel from './TargetPanel.svelte'
  import DetailRow from './DetailRow.svelte'
  import LogDock from './LogDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import { settings } from '$lib/stores/settings'
  import { holdSeconds, sidesOf, clockText, PREP_SECONDS } from '$lib/stretch-timer'

  interface Move {
    name: string
    tag?: string
    imgUrl?: string
    gif?: string
    posInicial?: string
    ejecucion?: string
    respiracion?: string
    duracion?: string
    desc?: string
    stallbar?: boolean
    /** The zone's moves («Otra opción» cycles them) and which one is today's */
    options?: Move[]
    pick?: number
  }

  type Stage = 'ready' | 'hold'
  interface Run { stage: Stage; side: number; endsAt: number; left: number; paused: boolean }

  // Calentamiento / Estiramiento on the Detalle v2 sheet: one move at a time,
  // Hecho marks it and moves on, Siguiente only moves on. Estiramiento is
  // guided: Empezar holds the move on a clock (each side), then moves on by
  // itself after a 5 s «Prepárate».
  let { items, mode, startIdx = 0, marks = [], nextStep, onMark, onFinish, onStartNext, onClose }: {
    items: Move[]
    mode: 'warmup' | 'stretch'
    startIdx?: number
    marks?: number[]
    /** The completed panel's button: «Empezar con …» or «Terminar sesión» */
    nextStep: { label: string; caption: string }
    onMark: (idx: number) => void
    onFinish: () => void
    onStartNext: () => void
    onClose: () => void
  } = $props()

  let idx = $state(0)
  let finished = $state(false)
  let howOpen = $state(true)

  $effect.pre(() => {
    idx = Math.min(Math.max(0, startIdx), items.length - 1)
  })

  let swaps = $state<Record<number, number>>({})
  let run = $state<Run | null>(null)
  let now = $state(Date.now())

  let phase = $derived(mode === 'warmup' ? 'Calentamiento' : 'Estiramiento')
  let guided = $derived(mode === 'stretch')
  let item = $derived(shown(idx))
  let isLast = $derived(idx === items.length - 1)
  let steps = $derived(howSteps(item))
  let markedItems = $derived(items.map((_, i) => shown(i)).filter((_, i) => marks.includes(i)))
  let accent = $derived($settings.accentColor)
  let dose = $derived(item?.duracion || item?.desc || '')
  let hold = $derived(holdSeconds(dose))
  let sides = $derived(sidesOf(dose))
  let optionCount = $derived(items[idx]?.options?.length || 0)
  let remaining = $derived(run ? Math.ceil((run.paused ? run.left : run.endsAt - now) / 1000) : 0)
  let stageTotal = $derived(run?.stage === 'ready' ? PREP_SECONDS : hold)

  /** The move on screen at i: today's pick, moved on by «Otra opción» */
  function shown(i: number): Move {
    const base = items[i]
    const opts = base?.options
    if (!opts?.length) return base
    return opts[((base.pick || 0) + (swaps[i] || 0)) % opts.length]
  }

  function swapMove() {
    swaps = { ...swaps, [idx]: (swaps[idx] || 0) + 1 }
    run = null
  }

  // ── Guided clock ──

  $effect(() => {
    if (!run || run.paused) return
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  })

  function startStage(stage: Stage, side: number) {
    const secs = stage === 'ready' ? PREP_SECONDS : hold
    now = Date.now()
    run = { stage, side, endsAt: now + secs * 1000, left: 0, paused: false }
    navigator.vibrate?.(120)
  }

  function tick() {
    now = Date.now()
    if (run && now >= run.endsAt) advance(run)
  }

  function advance(r: Run) {
    if (r.stage === 'ready') startStage('hold', r.side)
    else if (r.side < sides) startStage('ready', r.side + 1)
    else completeMove()
  }

  function completeMove() {
    run = null
    if (isLast) return finish()
    onMark(idx)
    goTo(idx + 1)
    startStage('ready', 1)
  }

  function togglePause() {
    if (!run) return
    if (run.paused) run = { ...run, paused: false, endsAt: Date.now() + run.left }
    else run = { ...run, paused: true, left: run.endsAt - Date.now() }
  }

  function stageLabel(r: Run): string {
    if (r.stage === 'ready') return r.side > 1 ? 'Cambia de lado' : 'Prepárate'
    return sides > 1 ? `Sostén · lado ${r.side} de ${sides}` : 'Sostén'
  }

  function howSteps(m: Move): { label: string; text: string }[] {
    const sections = [
      { label: 'Posición inicial', text: m?.posInicial || '' },
      { label: 'Ejecución', text: m?.ejecucion || '' },
      { label: 'Respiración', text: m?.respiracion || '' },
    ].filter(s => s.text)
    if (sections.length) return sections
    return m?.desc ? [{ label: '', text: m.desc }] : []
  }

  function goTo(i: number) {
    if (i < 0 || i >= items.length) return
    idx = i
    howOpen = true
    run = null
  }

  function done() {
    onMark(idx)
    goTo(idx + 1)
  }

  function finish() {
    onMark(idx)
    finished = true
    onFinish()
  }

  function caption(): string {
    if (!$online) return 'Sin internet también puedes seguir'
    if (isLast) return 'Último movimiento'
    return `Después: ${shown(idx + 1).name}`
  }

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.7) return
    goTo(dx < 0 ? idx + 1 : idx - 1)
  }
</script>

{#snippet position()}
  {phase} · <b>{finished ? 'listo' : `${idx + 1} de ${items.length}`}</b>
{/snippet}

{#snippet dock()}
  {#if finished}
    <LogDock caption={nextStep.caption}>
      <Button variant="primary" size="lg" onclick={onStartNext}><span class="one-line">{nextStep.label}</span></Button>
    </LogDock>
  {:else if run}
    <LogDock caption={caption()} layout="even">
      <Button variant="secondary" size="lg" onclick={togglePause}><span class="one-line">{run.paused ? 'Seguir' : 'Pausar'}</span></Button>
      <Button variant="primary" size="lg" {accent} onclick={completeMove}><span class="one-line">Saltar</span><Icon name="skip" size={18} /></Button>
    </LogDock>
  {:else if guided}
    <LogDock caption={caption()} layout="even">
      {#if isLast}
        <Button variant="secondary" size="lg" onclick={finish}><span class="one-line">Terminar estiramiento</span></Button>
      {:else}
        <Button variant="secondary" size="lg" onclick={done}><span class="one-line">Siguiente</span><Icon name="chev" size={18} /></Button>
      {/if}
      <Button variant="primary" size="lg" {accent} onclick={() => startStage('hold', 1)}>
        <Icon name="play" size={18} /><span class="one-line">Empezar <span class="mono">{sides > 1 ? '2 × ' : ''}{clockText(hold)}</span></span>
      </Button>
    </LogDock>
  {:else if isLast}
    <LogDock caption="Último movimiento">
      <Button variant="primary" size="lg" {accent} onclick={finish}><span class="one-line">Terminar {mode === 'warmup' ? 'calentamiento' : 'estiramiento'}</span></Button>
    </LogDock>
  {:else}
    <LogDock caption={caption()}>
      <Button variant="primary" size="lg" {accent} onclick={done}><span class="one-line">Siguiente</span><Icon name="arrow" size={18} /></Button>
    </LogDock>
  {/if}
{/snippet}

<DetailSheet name="MovementSheet" onclose={onClose} {position} {dock} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <ExerciseMedia kind="move" imgUrl={item.imgUrl} gifUrl={item.gif} searchName={item.name} />
  <TitleNav name={item.name} muscle={item.tag || ''} hasPrev={!finished && idx > 0} hasNext={!finished && !isLast} onprev={() => goTo(idx - 1)} onnext={() => goTo(idx + 1)}>
    {#snippet badge()}{#if item.stallbar}<span class="stallbar">STALLBAR</span>{/if}{/snippet}
  </TitleNav>
  {#if finished}
    <section class="sum">
      <span class="sum-t">{phase} listo</span>
      <span class="sum-s">{marks.length} de {items.length} hechos</span>
      {#each markedItems as m}
        <div class="sum-r"><span class="okn"><Icon name="check" size={12} /></span><span>{m.name}</span></div>
      {/each}
    </section>
  {:else}
    {#if run}
      <div class="clock" data-stage={run.stage} data-testid="stretch-clock">
        <span class="clock-l">{stageLabel(run)}</span>
        <b>{clockText(remaining)}</b>
        <div class="bar"><i style="width:{Math.min(100, (1 - remaining / stageTotal) * 100)}%; background:{run.stage === 'hold' ? accent : 'var(--text-tertiary)'}"></i></div>
      </div>
    {:else if item.duracion}<TargetPanel variant="one" text={item.duracion} />{/if}
    {#if optionCount > 1}
      <button class="swap" type="button" onclick={swapMove}>
        <Icon name="swap" size={16} /><span>Otra opción</span><span class="swap-n">{((items[idx].pick || 0) + (swaps[idx] || 0)) % optionCount + 1} de {optionCount}</span>
      </button>
    {/if}
    {#if steps.length}
      <DetailRow label="Cómo se hace" count="{steps.length} {steps.length === 1 ? 'paso' : 'pasos'}" bind:open={howOpen}>
        {#each steps as s}
          <div class="step">{#if s.label}<span class="step-l">{s.label}</span>{/if}<p>{s.text}</p></div>
        {/each}
      </DetailRow>
    {/if}
  {/if}
</DetailSheet>

<style>
  .stallbar { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: var(--radius-full); background: var(--cv-fill-3); color: var(--text-secondary); font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.6px; }
  .clock { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px 16px; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  .clock-l { font-size: 13px; color: var(--text-tertiary); }
  .clock b { font-family: var(--font-mono); font-size: 56px; font-weight: 500; letter-spacing: -0.06em; line-height: 1; }
  .clock[data-stage="ready"] b { color: var(--text-secondary); }
  .bar { height: 6px; border-radius: var(--radius-full); background: var(--cv-fill-3); overflow: hidden; margin-top: 6px; }
  .bar i { display: block; height: 100%; border-radius: inherit; transition: width 0.25s linear; }
  .swap { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 4px; background: none; border: 0; color: var(--text-secondary); font: inherit; font-size: 15px; }
  .swap-n { margin-left: auto; font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); }
  .sum { display: flex; flex-direction: column; padding: 16px 18px 6px; border-radius: var(--radius-2xl); background: var(--cv-fill-1); }
  .sum-t { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .sum-s { font-size: 13px; color: var(--text-tertiary); margin: 3px 0 8px; }
  .sum-r { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 12px; align-items: center; min-height: 44px; font-size: 15px; color: var(--text-secondary); }
  .sum-r span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sum-r + .sum-r { box-shadow: 0 -0.5px 0 var(--border); }
  .okn { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--cv-fill-on); color: var(--text); }
</style>
