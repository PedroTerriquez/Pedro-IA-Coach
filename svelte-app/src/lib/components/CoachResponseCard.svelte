<script lang="ts">
  import type { Snippet } from 'svelte'
  import CoachIcon from './CoachIcon.svelte'

  let {
    title = 'Coach IA',
    accent = 'var(--accent)',
    provider = '',
    children
  }: {
    title?: string
    accent?: string
    provider?: string
    children?: Snippet
  } = $props()
</script>

<div class="coach-response" style="border-left:3px solid {accent}">
  <div class="response-header">
    <span class="response-icon" style="background:{accent}1f">
      <CoachIcon size={13} color={accent} />
    </span>
    <span class="response-label" style="color:{accent}">{title}</span>
  </div>
  {#if children}
    <div class="response-body">
      {@render children()}
    </div>
  {/if}
  {#if provider}
    <div class="response-provider">{provider}</div>
  {/if}
</div>

<style>
  .coach-response {
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
  }
  .response-header {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .response-icon {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .response-body {
    margin-top: 12px;
    font-size: 14.5px;
    line-height: 1.55;
    color: rgba(255,255,255,0.9);
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: -0.1px;
    white-space: pre-wrap;
  }
  .response-provider {
    margin-top: 6px;
    font-size: 9px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.6px;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }
</style>
