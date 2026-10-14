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
    subtitle = '',
    greeting,
    kickoff = '',
    accent = 'var(--accent)',
    send,
    thread = $bindable([]),
    busy = false,
    chips,
    footer,
    onclose,
    look = 'classic',
    eyebrow = '',
    context = [],
    quickReplies = [],
    placeholder = 'Escribe un cambio…',
    kickoffMeta = '',
    loading = $bindable(false),
    onquickreply = undefined,
  }: {
    title?: string
    subtitle?: string
    /** First coach message; '' = the coach's reply to the kickoff opens the chat */
    greeting: string
    /** Hidden first user turn sent on open, so the coach starts the conversation */
    kickoff?: string
    accent?: string
    send: (thread: ChatTurn[]) => Promise<{ reply: string; _provider?: string }>
    thread?: ChatTurn[]
    busy?: boolean
    chips?: Snippet<[(msg: string) => void]>
    footer?: Snippet
    onclose?: () => void
    /** classic = Detalle's chat (debt) · nuevo = text-only chat of Tú v2 */
    look?: 'classic' | 'nuevo'
    /** nuevo: small mono line under the title */
    eyebrow?: string
    /** nuevo: tags of what the user picked before opening the chat */
    context?: string[]
    /** nuevo: fixed quick replies */
    quickReplies?: string[]
    placeholder?: string
    /** nuevo: shows the hidden kickoff as the pasted routine, with this meta line */
    kickoffMeta?: string
    /** True while the coach is answering */
    loading?: boolean
    /** nuevo: a quick reply the parent handles itself; return true to skip sending it */
    onquickreply?: (chip: string) => boolean
  } = $props()

  let messages = $state<Message[]>(untrack(() => greeting) ? [{ role: 'assistant', content: untrack(() => greeting) }] : [])
  let input = $state('')
  let chatEl: HTMLDivElement | undefined = $state()
  let textareaEl: HTMLTextAreaElement | undefined = $state()

  function autoResize() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px'
  }

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
    if (textareaEl) { textareaEl.style.height = 'auto' }
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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function quickReply(chip: string) {
    if (onquickreply?.(chip)) return
    sendMessage(chip)
  }

  let offlineCaption = $derived(!$online ? 'Sin conexión. La plática queda guardada; sigue cuando vuelva el internet.' : '')
</script>

{#if look === 'nuevo'}
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
    >
      {@render footer?.()}
    </ChatDock>
  </div>
{:else}
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="coach-overlay" data-component="CoachChat">
  <div class="coach-backdrop" onclick={onclose}></div>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="coach-panel" onclick={(e) => e.stopPropagation()}>
    <div class="coach-header-bar">
      <div class="coach-avatar" style="background:{accent}1c;border-color:{accent}3a">
        <Icon name="coach" size={18} color={accent} />
      </div>
      <div class="coach-header-info">
        <div class="coach-header-name">{title}</div>
        {#if subtitle}<div class="coach-header-ex-name">{subtitle}</div>{/if}
      </div>
      <button class="coach-close-btn" onclick={onclose}>
        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M1 1l11 11M12 1L1 12" stroke="var(--text)" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="coach-debug-wrap">
      <DebugAIToggle {accent} />
    </div>

    <div class="coach-msgs" bind:this={chatEl}>
      <div class="coach-bubbles">
        {#each messages as msg}
          {#if msg.hidden}
            <!-- kickoff turn: sent to the AI, not shown -->
          {:else if msg.role === 'user'}
            <div class="bubble-row user-row">
              <div class="bubble user-bubble" style="background:{accent};color:var(--bg);border-radius:16px 16px 4px 16px;font-weight:600">
                {msg.content}
              </div>
            </div>
          {:else}
            {#each msg.content.split(/\n+/) as part, pi}
              <div class="bubble-row ai-row">
                <div class="ai-avatar-sm" style="background:{accent}1c;border-color:{accent}3a">
                  <Icon name="coach" size={13} color={accent} />
                </div>
                <div>
                  <div class="bubble ai-bubble">
                    {part.replace(/^\n+|\n+$/g, '')}
                  </div>
                  {#if pi === 0 && msg._provider}
                    <div class="provider-badge">{msg._provider}</div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        {/each}
        {#if loading}
          <div class="bubble-row ai-row">
            <div class="ai-avatar-sm" style="background:{accent}1c;border-color:{accent}3a">
              <Icon name="coach" size={13} color={accent} />
            </div>
            <div class="typing-indicator">
              <span class="typing-dot" style="background:{accent}"></span>
              <span class="typing-dot" style="background:{accent};animation-delay:0.18s"></span>
              <span class="typing-dot" style="background:{accent};animation-delay:0.36s"></span>
            </div>
          </div>
        {/if}
      </div>
    </div>

    {@render chips?.(sendMessage)}
    {@render footer?.()}

    {#if !$online}
      <div class="coach-offline" data-testid="coach-offline">Requiere internet · el coach vuelve cuando tengas conexión</div>
    {/if}

    <div class="coach-input-row">
      <div class="coach-input-wrap">
        <textarea
          placeholder="Escribe tu pregunta…"
          class="coach-input"
          rows="1"
          disabled={!$online}
          bind:value={input}
          bind:this={textareaEl}
          oninput={autoResize}
          onkeydown={handleKeydown}
        ></textarea>
      </div>
      <button class="coach-send-btn" style="background:{accent}" onclick={() => sendMessage()} disabled={loading || busy || !$online}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15V3M9 3l-5 5M9 3l5 5" stroke="var(--bg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</div>
{/if}

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
  .chat2-ttl { text-align: center; font-size: 15px; font-weight: 600; }
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

  .coach-offline {
    margin: 0 16px 8px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    background: #2a0f0f;
    color: #ff6b6b;
    border: 0.5px solid rgba(255, 107, 107, 0.25);
  }
  .coach-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    pointer-events: auto;
  }
  .coach-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }
  .coach-panel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }
  .coach-header-bar {
    flex-shrink: 0;
    padding: 52px 16px 12px;
    border-bottom: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .coach-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    flex-shrink: 0;
    border: 0.5px solid;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .coach-header-info {
    flex: 1;
    min-width: 0;
  }
  .coach-header-name {
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .coach-header-ex-name {
    font-size: 11.5px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .coach-close-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.07);
    border: 0.5px solid var(--border-medium);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .coach-msgs {
    flex: 1;
    overflow-y: auto;
    padding: 18px 16px 8px;
    scroll-behavior: smooth;
  }
  .coach-debug-wrap {
    flex-shrink: 0;
    padding: 0 16px;
    border-bottom: 0.5px solid var(--border);
  }
  .coach-debug-wrap:empty {
    display: none;
  }
  .coach-bubbles {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bubble-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    max-width: 86%;
  }
  .user-row {
    align-self: flex-end;
    flex-direction: row-reverse;
  }
  .ai-row {
    align-self: flex-start;
    flex-direction: row;
  }
  .bubble {
    padding: 11px 14px;
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    letter-spacing: -0.1px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .user-bubble {
    font-weight: 600;
  }
  .ai-bubble {
    background: var(--surface-2);
    border: 0.5px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    font-weight: 400;
  }
  .ai-avatar-sm {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    flex-shrink: 0;
    border: 0.5px solid;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .provider-badge {
    margin-top: 4px;
    font-size: 9px;
    font-family: var(--font-mono);
    letter-spacing: 0.6px;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .typing-indicator {
    background: var(--surface-2);
    border: 0.5px solid var(--border);
    border-radius: 4px 16px 16px 16px;
    padding: 12px 14px;
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    opacity: 0.25;
    animation: coachBlink 1.2s 0s infinite ease-in-out;
  }
  :global(.coach-chips) {
    flex-shrink: 0;
    padding: 10px 16px 8px;
  }
  .coach-input-row {
    flex-shrink: 0;
    padding: 6px 16px 28px;
    display: flex;
    align-items: flex-end;
    gap: 9px;
  }
  .coach-input-wrap {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 0.5px solid var(--border-medium);
    border-radius: 22px;
    padding: 4px 6px 4px 16px;
    display: flex;
    align-items: flex-end;
  }
  .coach-input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    padding: 8px 0;
    min-width: 0;
    resize: none;
    overflow-y: hidden;
    line-height: 1.4;
  }
  .coach-send-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    flex-shrink: 0;
    padding: 0;
    cursor: pointer;
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .coach-send-btn:disabled {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  .coach-send-btn:active {
    opacity: 0.8;
  }
</style>
