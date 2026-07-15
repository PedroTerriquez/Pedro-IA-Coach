<script lang="ts">
  let { children, color = 'rgba(255,255,255,0.08)', textColor = '#fafafa', style = '' }: {
    children?: import('svelte').Snippet
    color?: string
    textColor?: string
    style?: string
  } = $props()
</script>

<span class="pill" style="background:{color};color:{textColor};{style}" role="status">
  {#if children}{@render children()}{/if}
</span>

<style>
  .pill {
    display: inline-block;
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
