<script lang="ts">
  import { toast } from '$lib/stores/ui'
  import type { Program } from '$lib/types'
  import CoachChat, { type ChatTurn } from './CoachChat.svelte'
  import Button from './Button.svelte'

  type ChatReply = { reply: string; _provider?: string }
  type ApplyResult = { program?: Program; message?: string }

  let {
    title,
    subtitle = '',
    greeting,
    kickoff = '',
    applyLabel,
    applyingLabel,
    accent = 'var(--accent)',
    send,
    apply,
    onapplied,
    onclose,
  }: {
    title: string
    subtitle?: string
    greeting: string
    kickoff?: string
    applyLabel: string
    applyingLabel: string
    accent?: string
    send: (thread: ChatTurn[]) => Promise<ChatReply>
    /** Turns the agreed conversation into a saved program */
    apply: (thread: ChatTurn[]) => Promise<ApplyResult>
    onapplied?: (program: Program) => void
    onclose?: () => void
  } = $props()

  let thread = $state<ChatTurn[]>([])
  let applying = $state(false)
  let status = $state('')
  let hasReply = $derived(thread.some(t => t.role === 'assistant'))

  function sendTurn(turns: ChatTurn[]) {
    status = ''
    return send(turns)
  }

  function finish(program: Program) {
    toast.show(`✅ Programa "${program.name}" creado y activado`)
    onapplied?.(program)
    onclose?.()
  }

  async function applyAgreement() {
    applying = true
    status = `⏳ ${applyingLabel}`
    try {
      const result = await apply(thread)
      if (result.program) return finish(result.program)
      status = result.message || 'El coach no devolvió un programa. Intenta de nuevo.'
    } catch (err: any) {
      status = `❌ ${err.message}`
    }
    applying = false
  }
</script>

<CoachChat {title} {subtitle} {greeting} {kickoff} {accent} send={sendTurn} bind:thread busy={applying} {onclose}>
  {#snippet footer()}
    <div class="apply-bar" data-component="ProgramChatApply">
      {#if status}<div class="apply-status">{status}</div>{/if}
      <Button variant="primary" {accent} fullWidth onclick={applyAgreement} disabled={!hasReply || applying}>
        {applying ? applyingLabel : applyLabel}
      </Button>
    </div>
  {/snippet}
</CoachChat>

<style>
  .apply-bar {
    flex-shrink: 0;
    padding: 10px 16px 4px;
    border-top: 0.5px solid var(--border);
  }
  .apply-status {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    white-space: pre-wrap;
  }
</style>
