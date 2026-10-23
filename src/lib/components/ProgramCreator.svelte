<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import type { Program } from '$lib/types'
  import type { ChatTurn } from './CoachChat.svelte'
  import { generateProgramChat, generateProgramWithAI, programCoachChat, programCoach, pasteRoutineChat, createProgramFromPaste } from '$lib/ai'
  import { GENERATE_KICKOFF, GENERATE_CHIPS, IMPROVE_CHIPS, PASTE_CHIPS, PASTE_AGAIN_CHIP, improveGreeting, lineCount, pasteKickoff, suggestedVersionName } from '$lib/program-chat'
  import { choicesToOverrides, choicesToTags, type SetupChoices } from '$lib/program-setup'
  import { markFirstProgramCreated } from '$lib/profile'
  import { plural } from '$lib/program-utils'
  import { toast } from '$lib/stores/ui'
  import CreateProgramSheet from './CreateProgramSheet.svelte'
  import CoachSetupSheet from './CoachSetupSheet.svelte'
  import PasteRoutineSheet from './PasteRoutineSheet.svelte'
  import ProgramChat from './ProgramChat.svelte'
  import NewVersionSheet from './NewVersionSheet.svelte'
  import ProgramReady from './ProgramReady.svelte'
  import ProgramEditor from './ProgramEditor.svelte'

  // Every way into a program: «Crear programa» (3 paths), «Mejorar con el coach»
  // and the editor. The route opens them through the exported functions.
  let { programs, userName, online, onchanged, onshowprograms }: {
    programs: Program[]
    userName: string
    online: boolean
    /** Something was saved: reload */
    onchanged: () => void
    /** «Ver programa» on the Listo screen */
    onshowprograms: () => void
  } = $props()

  type Chat = 'generate' | 'paste' | 'improve' | null

  let menuOpen = $state(false)
  let setupOpen = $state(false)
  let pasteOpen = $state(false)
  let editorOpen = $state(false)
  let versionOpen = $state(false)
  let chat = $state<Chat>(null)
  let chatKey = $state(0)
  let choices = $state<SetupChoices | null>(null)
  let pasted = $state('')
  let improving = $state<Program | null>(null)
  let editing = $state<Program | null>(null)
  let agreedThread = $state<ChatTurn[]>([])
  let creatingVersion = $state(false)
  let ready = $state<Program | null>(null)
  const CREATING_LABEL = 'Creando programa…'
  // The coach writes the program, then a second pass reviews it
  let generateLabel = $state(CREATING_LABEL)

  export function openCreate() { menuOpen = true }

  export function openImprove(program: Program) {
    improving = program
    openChat('improve')
  }

  export function openEditor(program: Program | null) {
    editing = program
    editorOpen = true
  }

  function openChat(kind: Chat) {
    chatKey++
    chat = kind
  }

  function startGenerate(c: SetupChoices) {
    choices = c
    openChat('generate')
  }

  function startPaste(text: string) {
    pasted = text
    openChat('paste')
  }

  function pasteAgain(chip: string): boolean {
    if (chip !== PASTE_AGAIN_CHIP) return false
    chat = null
    pasteOpen = true
    return true
  }

  async function created(program: Program) {
    await markFirstProgramCreated()
    chat = null
    ready = program
    onchanged()
  }

  async function applyGenerate(thread: ChatTurn[]) {
    generateLabel = CREATING_LABEL
    await created(await generateProgramWithAI(choicesToOverrides(choices!), thread, (phase) => {
      if (phase === 'review') generateLabel = 'Revisando el programa…'
    }))
  }

  async function applyPaste(thread: ChatTurn[]) {
    await created(await createProgramFromPaste(thread))
  }

  async function askVersion(thread: ChatTurn[]) {
    agreedThread = thread
    versionOpen = true
  }

  async function createVersion(opts: { name: string; activate: boolean }) {
    if (!improving) return
    creatingVersion = true
    try {
      const result = await programCoach(improving, agreedThread, opts)
      if (!result.program) throw new Error(result.message || 'El coach no devolvió un programa. Intenta de nuevo.')
      versionOpen = false
      chat = null
      toast.show(opts.activate ? 'Versión nueva activa. La anterior sigue abajo.' : 'Versión nueva creada. Está en Otros programas.')
      onchanged()
    } catch (err: any) {
      toast.show(err?.message || 'No se pudo crear la versión.', true)
    }
    creatingVersion = false
  }

  function closeReady(toToday: boolean) {
    ready = null
    if (toToday) goto(ROUTES.today)
    else onshowprograms()
  }

  let versionName = $derived(improving ? suggestedVersionName(improving.name, programs.map(p => p.name)) : '')
</script>

<CreateProgramSheet
  bind:open={menuOpen}
  {online}
  oncoach={() => setupOpen = true}
  onpaste={() => pasteOpen = true}
  onscratch={() => openEditor(null)}
/>
<CoachSetupSheet bind:open={setupOpen} {online} onstart={startGenerate} />
<PasteRoutineSheet bind:open={pasteOpen} {online} onsubmit={startPaste} />

{#key chatKey}
  {#if chat === 'generate' && choices}
    <ProgramChat
      title="Con el coach"
      eyebrow="Programa nuevo"
      kickoff={GENERATE_KICKOFF}
      context={choicesToTags(choices)}
      quickReplies={GENERATE_CHIPS}
      applyLabel="Crear este programa"
      applyingLabel={generateLabel}
      send={(thread) => generateProgramChat(thread, choicesToOverrides(choices!))}
      apply={applyGenerate}
      onclose={() => chat = null}
    />
  {:else if chat === 'paste'}
    <ProgramChat
      title="Con el coach"
      eyebrow="Desde tu rutina"
      kickoff={pasteKickoff(pasted)}
      kickoffMeta="Tu rutina · {plural(lineCount(pasted), 'línea', 'líneas')}"
      quickReplies={PASTE_CHIPS}
      placeholder="Contesta o pide un cambio…"
      applyLabel="Crear este programa"
      applyingLabel="Creando programa…"
      send={pasteRoutineChat}
      apply={applyPaste}
      onquickreply={pasteAgain}
      onclose={() => chat = null}
    />
  {:else if chat === 'improve' && improving}
    {@const program = improving}
    <ProgramChat
      title="Mejorar con el coach"
      eyebrow={program.name}
      greeting={improveGreeting(program, userName)}
      quickReplies={IMPROVE_CHIPS}
      placeholder="Pregunta o pide un cambio…"
      applyLabel="Crear versión nueva"
      applyingLabel="Crear versión nueva"
      send={(thread) => programCoachChat(thread, program)}
      apply={askVersion}
      onclose={() => chat = null}
    />
  {/if}
{/key}

<NewVersionSheet
  bind:open={versionOpen}
  programName={improving?.name || ''}
  suggestedName={versionName}
  busy={creatingVersion}
  oncreate={createVersion}
/>

<ProgramEditor bind:open={editorOpen} program={editing} onsave={() => onchanged()} />

{#if ready}
  <ProgramReady program={ready} {userName} ontoday={() => closeReady(true)} onprogram={() => closeReady(false)} />
{/if}
