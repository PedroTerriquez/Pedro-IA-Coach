<script lang="ts">
  import { bodyPartsFor } from '$lib/data/body-parts'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { settings } from '$lib/stores/settings'
  import CoachChat, { type ChatTurn } from './CoachChat.svelte'
  import QuickAskList from './QuickAskList.svelte'

  interface ExerciseCoach {
    name: string
    muscle: string
    alternatives?: { name: string }[]
  }

  let { exercise, accent = 'var(--accent)', onclose }: {
    exercise: ExerciseCoach
    accent?: string
    onclose?: () => void
  } = $props()

  const PAIN = 'Me duele algo'
  // What each quick question actually asks the coach
  const QUICK: Record<string, string> = {
    'Mejorar técnica': '¿Cómo mejoro mi técnica en este ejercicio?',
    [PAIN]: '',
    '¿Voy muy pesado?': '¿Cómo sé si estoy usando demasiado peso?',
    'Dame una variante': 'Dame 2-3 alternativas reales para este ejercicio. Dame el nombre en inglés y en español.',
  }

  let showBodyParts = $state(false)
  let loading = $state(false)
  let bodyParts = $derived(bodyPartsFor(exercise.muscle))
  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
  let greeting = $derived(`Hola. Soy tu coach para ${displayName}. Pregúntame de técnica, de peso o si algo te molesta, y lo ajustamos.`)

  async function send(thread: ChatTurn[]) {
    showBodyParts = false
    const { exerciseCoachChat } = await import('$lib/ai')
    const alternatives = (exercise.alternatives || []).map(a => a.name)
    return exerciseCoachChat(exercise.name, exercise.muscle, alternatives, thread)
  }

  function painMessage(part: string) {
    return `Siento molestia en ${part.toLowerCase()} al hacer este ejercicio. ¿Qué ajusto?`
  }

  function ask(item: string, sendMessage: (msg: string) => void) {
    if (item === PAIN) showBodyParts = true
    else sendMessage(QUICK[item])
  }
</script>

<CoachChat title="Coach · {displayName}" {greeting} {accent} {send} {onclose} placeholder="Escribe tu pregunta" bind:loading>
  {#snippet chips(sendMessage)}
    {#if showBodyParts}
      <QuickAskList label="¿Dónde lo sientes?" items={bodyParts} layout="grid" disabled={loading} onpick={(part) => sendMessage(painMessage(part))} oncancel={() => (showBodyParts = false)} />
    {:else}
      <QuickAskList label="Preguntas rápidas" items={Object.keys(QUICK)} disabled={loading} onpick={(item) => ask(item, sendMessage)} />
    {/if}
  {/snippet}
</CoachChat>
