<script lang="ts">
  import { bodyPartsFor } from '$lib/data/body-parts'

  interface ExerciseCoach {
    name: string
    muscle: string
    alternatives?: { name: string; reason: string }[]
  }

  interface Message {
    role: string
    content: string
    _provider?: string
  }

  let { exercise, accent = 'var(--accent)', onclose }: {
    exercise: ExerciseCoach
    accent?: string
    onclose?: () => void
  } = $props()

  let messages = $state<Message[]>([])
  let input = $state('')
  let loading = $state(false)
  let chatThread = $state<{ role: string; content: string }[]>([])
  let showBodyParts = $state(false)
  let chatEl: HTMLDivElement

  let bodyParts = $derived(bodyPartsFor(exercise.muscle))

  function initChat() {
    messages = []
    chatThread = []
    showBodyParts = false
    const greeting = `¡Qué onda! 👋 Soy tu coach para «${exercise.name}». Pregúntame sobre técnica, peso, o si algo te molesta y lo ajustamos.`
    messages = [{ role: 'assistant', content: greeting }]
  }

  function handleQuickChip(msg: string) {
    sendMessage(msg)
  }

  function handlePainSelect(part: string) {
    sendMessage(`Siento molestia en ${part.toLowerCase()} al hacer este ejercicio. ¿Qué ajusto?`)
    showBodyParts = false
  }

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    input = ''
    showBodyParts = false

    chatThread.push({ role: 'user', content: msg })
    messages = [...messages, { role: 'user', content: msg }]
    loading = true

    const { exerciseCoachChat } = await import('$lib/ai')
    const alternatives = (exercise.alternatives || []).map(a => a.name)
    const result = await exerciseCoachChat(exercise.name, exercise.muscle, alternatives, chatThread)
    const reply = result?.reply || 'No tengo respuesta ahora mismo.'

    chatThread.push({ role: 'assistant', content: reply })
    messages = [...messages, { role: 'assistant', content: reply, _provider: result?._provider }]
    loading = false

    setTimeout(() => {
      chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  initChat()
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="coach-overlay">
  <div class="coach-backdrop" onclick={onclose}></div>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="coach-panel" onclick={(e) => e.stopPropagation()}>
    <div class="coach-header-bar">
      <div class="coach-avatar" style="background:{accent}1c;border-color:{accent}3a">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" stroke="{accent}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="9" cy="8.2" r="0.95" fill="{accent}"/><circle cx="6" cy="8.2" r="0.95" fill="{accent}"/><circle cx="12" cy="8.2" r="0.95" fill="{accent}"/></svg>
      </div>
      <div class="coach-header-info">
        <div class="coach-header-name">Coach IA</div>
        <div class="coach-header-ex-name">{exercise.name}</div>
      </div>
      <button class="coach-close-btn" onclick={onclose}>
        <svg width="13" height="13" viewBox="0 0 13 13"><path d="M1 1l11 11M12 1L1 12" stroke="var(--text)" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="coach-msgs" bind:this={chatEl}>
      <div class="coach-bubbles">
        {#each messages as msg}
          {#if msg.role === 'user'}
            <div class="bubble-row user-row">
              <div class="bubble user-bubble" style="background:{accent};color:var(--bg);border-radius:16px 16px 4px 16px;font-weight:600">
                {msg.content}
              </div>
            </div>
          {:else}
            <div class="bubble-row ai-row">
              <div class="ai-avatar-sm" style="background:{accent}1c;border-color:{accent}3a">
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" stroke="{accent}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="9" cy="8.2" r="0.95" fill="{accent}"/><circle cx="6" cy="8.2" r="0.95" fill="{accent}"/><circle cx="12" cy="8.2" r="0.95" fill="{accent}"/></svg>
              </div>
              <div>
                <div class="bubble ai-bubble">
                  {msg.content}
                </div>
                {#if msg._provider}
                  <div class="provider-badge">{msg._provider}</div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
        {#if loading}
          <div class="bubble-row ai-row">
            <div class="ai-avatar-sm" style="background:{accent}1c;border-color:{accent}3a">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" stroke="{accent}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="9" cy="8.2" r="0.95" fill="{accent}"/><circle cx="6" cy="8.2" r="0.95" fill="{accent}"/><circle cx="12" cy="8.2" r="0.95" fill="{accent}"/></svg>
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

    {#if showBodyParts}
      <div class="pain-picker">
        <div class="pain-header">
          <span class="pain-title">¿Dónde lo sientes?</span>
          <button class="pain-cancel" onclick={() => showBodyParts = false}>× cancelar</button>
        </div>
        <div class="pain-parts">
          {#each bodyParts as part}
            <button class="pain-part-btn" style="background:{accent}14;border-color:{accent}3a;color:{accent}" onclick={() => handlePainSelect(part)}>
              {part}
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <div class="coach-chips">
        <button class="chip-btn" onclick={() => handleQuickChip('¿Cómo mejoro mi técnica en este ejercicio?')}>
          Mejorar técnica
        </button>
        <button class="chip-btn" style="background:{accent}16;border-color:{accent}3a;color:{accent}" onclick={() => showBodyParts = true}>
          ⚠️ Me duele algo
        </button>
        <button class="chip-btn" onclick={() => handleQuickChip('¿Cómo sé si estoy usando demasiado peso?')}>
          ¿Voy muy pesado?
        </button>
        <button class="chip-btn" onclick={() => handleQuickChip('Dame una variante más fácil de este ejercicio.')}>
          Variante fácil
        </button>
      </div>
    {/if}

    <div class="coach-input-row">
      <div class="coach-input-wrap">
        <input
          type="text"
          placeholder="Escribe tu pregunta…"
          class="coach-input"
          bind:value={input}
          onkeydown={handleKeydown}
        >
      </div>
      <button class="coach-send-btn" style="background:{accent}" onclick={() => sendMessage()} disabled={loading}>
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
  .pain-cancel {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 2px;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 11px;
  }
  .pain-parts {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .pain-part-btn {
    padding: 8px 13px;
    border-radius: var(--radius-full);
    cursor: pointer;
    border: 0.5px solid;
    font-family: var(--font-sans);
    font-size: 12.5px;
    font-weight: 600;
  }
  .coach-chips {
    flex-shrink: 0;
    padding: 10px 16px 8px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .coach-chips::-webkit-scrollbar {
    display: none;
  }
  .chip-btn {
    flex-shrink: 0;
    padding: 8px 13px;
    border-radius: var(--radius-full);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.05);
    border: 0.5px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    font-family: var(--font-sans);
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    transition: opacity 0.15s;
  }
  .chip-btn:active {
    opacity: 0.7;
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
    align-items: center;
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
