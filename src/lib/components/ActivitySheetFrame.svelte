<script lang="ts">
  import type { Snippet } from 'svelte'

  // The frame of Hoy's activity sheets (Nuevo · Hoy actividades): scrim, a
  // sheet with its own big heading in the body and a fixed dock at the foot.
  // Tapping the scrim closes it when `onclose` is given.
  let { id = undefined, label, name = 'ActivitySheet', onclose = null, children, dock }: {
    id?: string
    label: string
    name?: string
    onclose?: (() => void) | null
    children: Snippet
    dock?: Snippet
  } = $props()
</script>

<div {id} class="as" data-component={name} role="dialog" aria-modal="true" aria-label={label}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="scrim" role="presentation" onclick={() => onclose?.()}></div>
  <div class="sh">
    <div class="handle"></div>
    <div class="sb">{@render children()}</div>
    {#if dock}<div class="dk">{@render dock()}</div>{/if}
  </div>
</div>

<style>
  .as { position: fixed; inset: 0; z-index: 150; }
  .scrim { position: absolute; inset: 0; background: var(--cv-scrim); }
  .sh {
    position: absolute; left: 0; right: 0; bottom: 0;
    max-height: calc(100% - max(56px, var(--safe-top)));
    background: var(--surface);
    border-radius: 28px 28px 0 0;
    border: 0.5px solid var(--border);
    border-bottom: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.5);
  }
  .handle { width: 36px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.18); margin: 8px auto 0; flex-shrink: 0; }
  .sb { flex: 1; min-height: 0; overflow: auto; padding: 18px 20px 8px; display: flex; flex-direction: column; gap: 20px; scrollbar-width: none; }
  .sb::-webkit-scrollbar { display: none; }
  .sb > :global(*) { flex-shrink: 0; }
  .dk { flex-shrink: 0; padding: 12px 20px max(16px, env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }

  /* Shared pieces of the activity sheets */
  .as :global(.eyb) { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .as :global(.h) { font-size: 26px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.1; margin: 6px 0 0; text-wrap: balance; }
  .as :global(.why) { font-size: 15px; color: var(--text-secondary); margin: 8px 0 0; line-height: 1.45; text-wrap: pretty; }
  .as :global(.cap) { font-size: 13px; color: var(--text-tertiary); text-align: center; text-wrap: pretty; line-height: 1.4; margin: 0; }
  .as :global(.cap b) { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); }
  .as :global(.ghost) { height: 48px; width: 100%; border: 0; background: none; color: var(--text-secondary); font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
  .as :global(.ghost.del) { color: var(--cv-danger-text); }
  .as :global(.shd) { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; align-items: center; }
  .as :global(.shd .h) { margin-top: 2px; }
  .as :global(.back) { width: 48px; height: 48px; border-radius: 50%; border: 0; background: var(--cv-fill-3, rgba(255,255,255,0.08)); color: var(--text); display: grid; place-items: center; cursor: pointer; padding: 0; }
  @media (max-height: 600px) {
    .sh { max-height: calc(100% - 20px); }
    .sb { padding: 12px 16px 6px; gap: 14px; }
    .dk { padding: 8px 16px 12px; gap: 6px; }
    .as :global(.h) { font-size: 22px; letter-spacing: -0.6px; }
  }
</style>
