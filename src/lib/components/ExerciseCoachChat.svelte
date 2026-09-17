<script lang="ts">
  import { bodyPartsFor } from '$lib/data/body-parts'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { settings } from '$lib/stores/settings'
  import CoachChat, { type ChatTurn } from './CoachChat.svelte'
  import Button from './Button.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'

  interface ExerciseCoach {
    name: string
    muscle: string
    alternatives?: { name: string; reason: string }[]
  }

  let { exercise, accent = 'var(--accent)', onclose }: {
    exercise: ExerciseCoach
    accent?: string
    onclose?: () => void
  } = $props()

  let showBodyParts = $state(false)
  let bodyParts = $derived(bodyPartsFor(exercise.muscle))
  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
  let greeting = $derived(`¡Qué onda! 👋 Soy tu coach para «${exercise.name}». Pregúntame sobre técnica, peso, o si algo te molesta y lo ajustamos.`)

  async function send(thread: ChatTurn[]) {
    showBodyParts = false
    const { exerciseCoachChat } = await import('$lib/ai')
    const alternatives = (exercise.alternatives || []).map(a => a.name)
    return exerciseCoachChat(exercise.name, exercise.muscle, alternatives, thread)
  }

  function painMessage(part: string) {
    return `Siento molestia en ${part.toLowerCase()} al hacer este ejercicio. ¿Qué ajusto?`
  }
</script>

<CoachChat subtitle={displayName} {greeting} {accent} {send} {onclose}>
  {#snippet chips(sendMessage)}
    {#if showBodyParts}
      <div class="pain-picker">
        <div class="pain-header">
          <span class="pain-title">¿Dónde lo sientes?</span>
          <Button variant="text" onclick={() => showBodyParts = false}>× cancelar</Button>
        </div>
        <ChipRow gap={7}>
          {#each bodyParts as part}
            <FilterChip variant="sans" size="lg" style="background:{accent}14;border-color:{accent}3a;color:{accent}" onclick={() => sendMessage(painMessage(part))}>
              {part}
            </FilterChip>
          {/each}
        </ChipRow>
      </div>
    {:else}
      <ChipRow class="coach-chips" gap={7} scroll>
        <FilterChip variant="sans" size="lg" onclick={() => sendMessage('¿Cómo mejoro mi técnica en este ejercicio?')}>
          Mejorar técnica
        </FilterChip>
        <FilterChip variant="sans" size="lg" style="background:{accent}16;border-color:{accent}3a;color:{accent}" onclick={() => showBodyParts = true}>
          ⚠️ Me duele algo
        </FilterChip>
        <FilterChip variant="sans" size="lg" onclick={() => sendMessage('¿Cómo sé si estoy usando demasiado peso?')}>
          ¿Voy muy pesado?
        </FilterChip>
        <FilterChip variant="sans" size="lg" onclick={() => sendMessage('Dame 2-3 alternativas reales para este ejercicio. Dame el nombre en inglés y en español.')}>
          Variante
        </FilterChip>
      </ChipRow>
    {/if}
  {/snippet}
</CoachChat>

<style>
  .pain-picker {
    flex-shrink: 0;
    padding: 12px 16px;
    border-top: 0.5px solid var(--border);
    background: rgba(255, 255, 255, 0.015);
  }
  .pain-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
  }
  .pain-title {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
  }
</style>
