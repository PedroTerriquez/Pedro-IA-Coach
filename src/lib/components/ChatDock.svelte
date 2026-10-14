<script lang="ts">
  import type { Snippet } from 'svelte'
  import FilterChip from './FilterChip.svelte'
  import IconButton from './IconButton.svelte'

  // Bottom of the text-only chat: caption, fixed quick replies, field + send,
  // and the chat's main button (passed as children).
  let {
    value = $bindable(''),
    placeholder = 'Escribe un cambio…',
    caption = '',
    chips = [],
    inputDisabled = false,
    sendDisabled = false,
    onsend,
    onchip,
    children
  }: {
    value?: string
    placeholder?: string
    caption?: string
    chips?: string[]
    inputDisabled?: boolean
    sendDisabled?: boolean
    onsend: () => void
    onchip: (chip: string) => void
    children?: Snippet
  } = $props()

  let textareaEl: HTMLTextAreaElement | null = $state(null)

  function autoResize() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = Math.min(Math.max(textareaEl.scrollHeight, 52), 120) + 'px'
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onsend()
    }
  }

  $effect(() => {
    if (value === '' && textareaEl) textareaEl.style.height = ''
  })
</script>

<div class="cd" data-component="ChatDock">
  {#if caption}<p class="cap">{caption}</p>{/if}
  {#if chips.length}
    <div class="qr">
      {#each chips as chip}
        <FilterChip variant="outline" disabled={sendDisabled} onclick={() => onchip(chip)}>{chip}</FilterChip>
      {/each}
    </div>
  {/if}
  <div class="cf">
    <textarea
      bind:this={textareaEl}
      bind:value
      rows="1"
      {placeholder}
      disabled={inputDisabled}
      oninput={autoResize}
      {onkeydown}
      aria-label={placeholder}
    ></textarea>
    <IconButton icon="send" label="Enviar" variant="filled" disabled={sendDisabled || inputDisabled || !value.trim()} onclick={onsend} />
  </div>
  {@render children?.()}
</div>

<style>
  .cd {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 20px max(26px, env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid var(--border-medium);
    background: var(--bg);
  }
  .cap { font-size: 13px; color: var(--text-tertiary); text-align: center; text-wrap: pretty; }
  .qr { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin-right: -20px; padding-right: 20px; }
  .qr::-webkit-scrollbar { display: none; }
  .cf { display: grid; grid-template-columns: minmax(0, 1fr) 52px; gap: 8px; align-items: end; }
  textarea {
    height: 52px;
    min-height: 52px;
    padding: 14px 16px;
    border: 0;
    border-radius: var(--cv-radius-field);
    background: var(--cv-fill-2);
    color: var(--text);
    caret-color: var(--accent);
    font-family: var(--font-sans);
    font-size: 17px;
    line-height: 1.4;
    resize: none;
    outline: none;
    overflow-y: hidden;
  }
  textarea::placeholder { color: var(--text-muted); }
  textarea:focus { box-shadow: inset 0 0 0 1px var(--cv-ring-focus); }
  textarea:disabled { opacity: 0.5; }
  .cf :global([data-component="IconButton"]) { width: 52px; height: 52px; border-radius: var(--cv-radius-field); background: var(--text); color: var(--bg); }
  .cf :global([data-component="IconButton"]:disabled) { background: var(--cv-fill-3); color: var(--text); opacity: 0.5; }
</style>
