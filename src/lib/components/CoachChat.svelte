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
  }: {
    title?: string
    subtitle?: string
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
  } = $props()

  let messages = $state<Message[]>([{ role: 'assistant', content: untrack(() => greeting) }])
  let input = $state('')
  let loading = $state(false)
  let chatEl: HTMLDivElement
  let textareaEl: HTMLTextAreaElement

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

    const result = await send(thread)
    addTurn({ role: 'assistant', content: result?.reply || 'No tengo respuesta ahora mismo.', _provider: result?._provider })
    loading = false
    scrollToBottom()
  }

  function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading || busy) return
    input = ''
    if (textareaEl) { textareaEl.style.height = 'auto' }
    requestReply(msg)
  }

  onMount(() => {
    if (kickoff) requestReply(kickoff, true)
  })

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
</script>

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

    <div class="coach-input-row">
      <div class="coach-input-wrap">
        <textarea
          placeholder="Escribe tu pregunta…"
          class="coach-input"
          rows="1"
          bind:value={input}
          bind:this={textareaEl}
          oninput={autoResize}
          onkeydown={handleKeydown}
        ></textarea>
      </div>
      <button class="coach-send-btn" style="background:{accent}" onclick={() => sendMessage()} disabled={loading || busy}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15V3M9 3l-5 5M9 3l5 5" stroke="var(--bg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</div>

<style>
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
