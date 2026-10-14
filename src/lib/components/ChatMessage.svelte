<script lang="ts">
  import Icon from './Icon.svelte'

  // Coach messages go without a bubble; the user's go in a bubble on the right.
  // `paste` is the routine the user pasted, shown with its line count.
  let { role, content, meta = '', typing = false }: {
    role: 'coach' | 'user' | 'paste'
    content: string
    meta?: string
    typing?: boolean
  } = $props()

  let paragraphs = $derived(content.split(/\n+/).map(p => p.trim()).filter(Boolean))
</script>

{#if role === 'coach'}
  <div class="m c" data-component="ChatMessage" data-role="coach">
    <div class="m-by"><span class="ai-i"><Icon name="spark" size={12} /></span>Coach</div>
    {#if typing}
      <div class="dots" aria-label="El coach está escribiendo"><i></i><i></i><i></i></div>
    {:else}
      {#each paragraphs as p}<p>{p}</p>{/each}
    {/if}
  </div>
{:else if role === 'paste'}
  <div class="m u pu" data-component="ChatMessage" data-role="paste">
    <span class="pu-t">{content}</span>
    {#if meta}<span class="pu-m">{meta}</span>{/if}
  </div>
{:else}
  <div class="m u" data-component="ChatMessage" data-role="user">{content}</div>
{/if}

<style>
  .m { flex-shrink: 0; font-size: 16px; line-height: 1.5; text-wrap: pretty; word-break: break-word; }
  .m.c { align-self: stretch; display: flex; flex-direction: column; gap: 10px; }
  .m-by { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .ai-i { display: grid; color: var(--accent); }
  .m.u { align-self: flex-end; max-width: 84%; padding: 11px 15px; border-radius: 20px 20px 6px 20px; background: var(--cv-fill-3); white-space: pre-wrap; }
  .m.u.pu { display: flex; flex-direction: column; gap: 6px; }
  .pu-t {
    font-size: 14px;
    line-height: 1.45;
    color: var(--text-secondary);
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pu-m { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); }
  .dots { display: flex; align-items: center; gap: 5px; height: 24px; }
  .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--cv-ring-current); animation: coachBlink 1.2s infinite ease-in-out; }
  .dots i:nth-child(2) { animation-delay: 0.18s; }
  .dots i:nth-child(3) { animation-delay: 0.36s; }
</style>
