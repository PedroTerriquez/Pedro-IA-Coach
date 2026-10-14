<script lang="ts">
  // Numbered steps (install, notifications blocked)
  let { steps }: { steps: { title: string; text?: string }[] } = $props()
</script>

<ol class="tips" data-component="StepsList">
  {#each steps as s, i}
    <li class="tip"><span class="tip-i">{i + 1}</span><div><b>{s.title}</b>{#if s.text}<span>{s.text}</span>{/if}</div></li>
  {/each}
</ol>

<style>
  .tips { display: flex; flex-direction: column; margin: -8px 0; list-style: none; }
  .tip { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 12px; padding: 13px 4px; }
  .tip + .tip { box-shadow: 0 -0.5px 0 var(--border); }
  .tip-i { padding-top: 2px; font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); }
  b { display: block; font-size: 16px; font-weight: 600; }
  span:not(.tip-i) { display: block; margin-top: 4px; font-size: 14px; line-height: 1.45; color: var(--text-secondary); text-wrap: pretty; }
</style>
