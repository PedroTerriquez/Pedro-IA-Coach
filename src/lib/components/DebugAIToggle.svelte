<script lang="ts">
  import { settings } from '$lib/stores/settings'
  import { aiExchanges, formatExchange } from '$lib/stores/debug'

  let {
    label = '',
    accent = 'var(--accent)'
  }: {
    label?: string
    accent?: string
  } = $props()

  let show = $state(false)
  let ex = $derived(label ? $aiExchanges.get(label) ?? null : null)
  let text = $derived(formatExchange(ex))
</script>

{#if $settings.debugAI}
  <div class="debug-toggle" data-component="DebugAIToggle">
    <button class="debug-btn" onclick={() => show = !show}>
      <span class="debug-dot"></span>
      DBG
    </button>
    {#if show}
      <div class="debug-panel">
        <div class="debug-panel-label">{label || 'AI'}</div>
        <textarea class="debug-textarea" readonly spellcheck="false" value={text}></textarea>
      </div>
    {/if}
  </div>
{/if}

<style>
  .debug-toggle {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .debug-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.4);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    align-self: flex-start;
  }
  .debug-btn:hover {
    border-color: rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.6);
  }
  .debug-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
  }
  .debug-panel {
    background: #111;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 8px;
    margin-top: 4px;
  }
  .debug-panel-label {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 6px;
  }
  .debug-textarea {
    width: 100%;
    height: 180px;
    resize: vertical;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.65);
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1.5;
    outline: none;
    white-space: pre;
    overflow: auto;
  }
</style>
