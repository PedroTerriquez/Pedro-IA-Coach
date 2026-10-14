<script lang="ts">
  import { toast } from '$lib/stores/ui'
  import CoachChat, { type ChatTurn } from './CoachChat.svelte'
  import Button from './Button.svelte'

  type ChatReply = { reply: string; _provider?: string }

  // Text-only chat of Tú (card 13): the main button stays off until the coach
  // has answered and while it is writing.
  let {
    title,
    eyebrow = '',
    greeting = '',
    kickoff = '',
    kickoffMeta = '',
    context = [],
    quickReplies = [],
    placeholder = 'Escribe un cambio…',
    applyLabel,
    applyingLabel,
    send,
    apply,
    onquickreply = undefined,
    onclose,
  }: {
    title: string
    eyebrow?: string
    greeting?: string
    kickoff?: string
    kickoffMeta?: string
    context?: string[]
    quickReplies?: string[]
    placeholder?: string
    applyLabel: string
    applyingLabel: string
    send: (thread: ChatTurn[]) => Promise<ChatReply>
    /** Turns the agreed conversation into the next step; throws to stay in the chat */
    apply: (thread: ChatTurn[]) => Promise<void>
    onquickreply?: (chip: string) => boolean
    onclose: () => void
  } = $props()

  let thread = $state<ChatTurn[]>([])
  let applying = $state(false)
  let loading = $state(false)
  let hasReply = $derived(thread.some(t => t.role === 'assistant'))

  async function applyAgreement() {
    applying = true
    try {
      await apply($state.snapshot(thread))
    } catch (err: any) {
      toast.show(err?.message || 'El coach no pudo crear el programa. Intenta de nuevo.', true)
    }
    applying = false
  }
</script>

<CoachChat
  look="nuevo"
  {title}
  {eyebrow}
  {greeting}
  {kickoff}
  {kickoffMeta}
  {context}
  {quickReplies}
  {placeholder}
  {send}
  {onquickreply}
  bind:thread
  bind:loading
  busy={applying}
  {onclose}
>
  {#snippet footer()}
    <Button size="lg" variant="primary" onclick={applyAgreement} disabled={!hasReply || applying || loading}>
      {applying ? applyingLabel : applyLabel}
    </Button>
  {/snippet}
</CoachChat>
