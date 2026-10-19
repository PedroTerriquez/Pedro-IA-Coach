<script module lang="ts">
  export interface ChatTurn {
    role: string
    content: string
  }
</script>

<script lang="ts">
  import { onMount, untrack, type Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'
  import ChatMessage from './ChatMessage.svelte'
  import ChatDock from './ChatDock.svelte'
  import Tag from './Tag.svelte'
  import { online } from '$lib/stores/network'

  interface Message extends ChatTurn {
    _provider?: string
    hidden?: boolean
  }

  let {
    title = 'Coach IA',
    greeting,
    kickoff = '',
    accent = 'var(--accent)',
    send,
    thread = $bindable([]),
    busy = false,
    chips,
    footer,
    onclose,
    eyebrow = '',
    context = [],
    quickReplies = [],
    placeholder = 'Escribe un cambio…',
    kickoffMeta = '',
    loading = $bindable(false),
    onquickreply = undefined,
  }: {
    title?: string
    /** First coach message; '' = the coach's reply to the kickoff opens the chat */
    greeting: string
    /** Hidden first user turn sent on open, so the coach starts the conversation */
    kickoff?: string
    accent?: string
    send: (thread: ChatTurn[]) => Promise<{ reply: string; _provider?: string }>
    thread?: ChatTurn[]
    busy?: boolean
    /** Ready-made questions above the field; gets the send function */
    chips?: Snippet<[(msg: string) => void]>
    footer?: Snippet
    onclose?: () => void
    /** Small mono line under the title */
    eyebrow?: string
    /** Tags of what the user picked before opening the chat */
    context?: string[]
    /** Fixed quick replies */
    quickReplies?: string[]
    placeholder?: string
    /** Shows the hidden kickoff as the pasted routine, with this meta line */
    kickoffMeta?: string
    /** True while the coach is answering */
    loading?: boolean
    /** A quick reply the parent handles itself; return true to skip sending it */
    onquickreply?: (chip: string) => boolean
  } = $props()

  let messages = $state<Message[]>(untrack(() => greeting) ? [{ role: 'assistant', content: untrack(() => greeting) }] : [])
  let input = $state('')
  let chatEl: HTMLDivElement | undefined = $state()

  function scrollToBottom() {
    setTimeout(() => {
      chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  function addTurn(turn: Message) {
    thread = [...thread, { role: turn.role, content: turn.content }]
    messages = [...messages, turn]
  }

  async function requestReply(msg: string, hidden = false) {
    addTurn({ role: 'user', content: msg, hidden })
    loading = true
    scrollToBottom()

    let result: { reply: string; _provider?: string } | undefined
    try {
      result = await send(thread)
    } catch {
      result = { reply: 'No pude conectar con el coach. Revisa tu conexión e intenta de nuevo.' }
    }
    addTurn({ role: 'assistant', content: result?.reply || 'No tengo respuesta ahora mismo.', _provider: result?._provider })
    loading = false
    scrollToBottom()
  }

  function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading || busy || !$online) return
    input = ''
    requestReply(msg)
  }

  // The kickoff waits for a connection: opened offline, the coach starts
  // talking as soon as the network comes back.
  let kickoffPending = $state(false)

  onMount(() => {
    kickoffPending = !!kickoff
  })

  $effect(() => {
    if (!kickoffPending || !$online) return
    kickoffPending = false
    untrack(() => requestReply(kickoff, true))
  })

  function quickReply(chip: string) {
    if (onquickreply?.(chip)) return
    sendMessage(chip)
  }

  let offlineCaption = $derived(!$online ? 'Sin conexión. La plática queda guardada; sigue cuando vuelva el internet.' : '')
</script>

{#snippet dockTop()}{@render chips?.(sendMessage)}{/snippet}

<div class="chat2" data-component="CoachChat" role="dialog" aria-modal="true" aria-label={title}>
  <div class="chat2-head">
    <button type="button" class="chat2-x" aria-label="Volver" onclick={onclose}><Icon name="back" size={20} /></button>
    <div class="chat2-ttl">{title}{#if eyebrow}<small>{eyebrow}</small>{/if}</div>
    <span></span>
  </div>
  <div class="chat2-debug"><DebugAIToggle {accent} /></div>
  <div class="chat2-msgs" bind:this={chatEl}>
    {#if context.length}
      <div class="ctx">{#each context as c}<Tag>{c}</Tag>{/each}</div>
    {/if}
    {#each messages as msg}
      {#if msg.hidden}
        {#if kickoffMeta}<ChatMessage role="paste" content={msg.content} meta={kickoffMeta} />{/if}
      {:else}
        <ChatMessage role={msg.role === 'user' ? 'user' : 'coach'} content={msg.content} />
      {/if}
    {/each}
    {#if loading}<ChatMessage role="coach" content="" typing />{/if}
  </div>
  <ChatDock
    bind:value={input}
    {placeholder}
    caption={offlineCaption || (loading ? 'El coach está escribiendo…' : '')}
    chips={quickReplies}
    inputDisabled={!$online}
    sendDisabled={loading || busy || !$online}
    onsend={() => sendMessage()}
    onchip={quickReply}
    top={chips ? dockTop : undefined}
  >
    {@render footer?.()}
  </ChatDock>
</div>

<style>
  .chat2 {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    padding-top: max(44px, env(safe-area-inset-top, 0px));
    background: var(--bg);
  }
  .chat2-head { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; padding: 10px 10px 0; flex-shrink: 0; }
  .chat2-x { width: 44px; height: 44px; border: 0; border-radius: 50%; background: none; color: var(--text-tertiary); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .chat2-ttl { text-align: center; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat2-ttl small { display: block; margin-top: 3px; font-family: var(--font-mono); font-size: 11px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chat2-debug { padding: 0 20px; flex-shrink: 0; }
  .chat2-debug:empty { display: none; }
  .chat2-msgs {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px 20px;
  }
  .ctx { align-self: flex-end; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; max-width: 88%; flex-shrink: 0; }
</style>
