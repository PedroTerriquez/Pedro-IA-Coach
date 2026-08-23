<script lang="ts">
  import { settings } from '$lib/stores/settings'
  import { lastAIExchange, formatExchange } from '$lib/stores/debug'

  let { accent = 'var(--accent)' }: { accent?: string } = $props()

  let show = $state(false)
  let ex = $derived($lastAIExchange)
  let text = $derived(formatExchange(ex))
</script>

{#if $settings.debugAI}
  <div class="debug-ai" data-component="DebugAIToggle">
    <button class="debug-chip" style="color:{accent};border-color:{accent}3a;background:{accent}0f" onclick={() => show = !show}>
      Debug IA {ex ? `· ${ex.label}` : '· sin intercambios aún'}
    </button>
    {#if show}
      <textarea class="debug-out" readonly spellcheck="false" value={text}></textarea>
    {/if}
  </div>
{/if}

<style>
  .debug-ai {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .debug-chip {
    align-self: flex-start;
    padding: 5px 12px;
    border-radius: 9999px;
    border: 0.5px solid;
    background: transparent;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    cursor: pointer;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .debug-out {
    width: 100%;
    height: 240px;
    resize: vertical;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: rgba(255,255,255,0.75);
    font-size: 10px;
    line-height: 1.5;
    font-family: var(--font-mono);
    padding: 10px;
    box-sizing: border-box;
    outline: none;
    white-space: pre;
    overflow: auto;
  }
</style>
