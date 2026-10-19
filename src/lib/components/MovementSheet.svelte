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
  }

  // Calentamiento / Estiramiento on the Detalle v2 sheet: one move at a time,
  // Hecho marks it and moves on, Siguiente only moves on.
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

  let phase = $derived(mode === 'warmup' ? 'Calentamiento' : 'Estiramiento')
  let item = $derived(items[idx])
  let isLast = $derived(idx === items.length - 1)
  let steps = $derived(howSteps(item))
  let markedItems = $derived(items.filter((_, i) => marks.includes(i)))
  let accent = $derived($settings.accentColor)

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
    return `Después: ${items[idx + 1].name}`
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
    {#if item.duracion}<TargetPanel variant="one" text={item.duracion} />{/if}
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
  .sum { display: flex; flex-direction: column; padding: 16px 18px 6px; border-radius: var(--radius-2xl); background: var(--cv-fill-1); }
  .sum-t { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .sum-s { font-size: 13px; color: var(--text-tertiary); margin: 3px 0 8px; }
  .sum-r { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 12px; align-items: center; min-height: 44px; font-size: 15px; color: var(--text-secondary); }
  .sum-r span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sum-r + .sum-r { box-shadow: 0 -0.5px 0 var(--border); }
  .okn { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--cv-fill-on); color: var(--text); }
</style>
