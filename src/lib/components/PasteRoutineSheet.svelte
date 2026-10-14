<script lang="ts">
  import { lineCount } from '$lib/program-chat'
  import { plural } from '$lib/program-utils'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  // Step before the paste chat: the routine is pasted (or typed) here as is.
  let { open = $bindable(false), online, onsubmit }: {
    open: boolean
    online: boolean
    onsubmit: (text: string) => void
  } = $props()

  let text = $state('')
  let writing = $state(false)
  let clipboardError = $state('')
  let textareaEl: HTMLTextAreaElement | null = $state(null)

  $effect(() => {
    if (open) { text = ''; writing = false; clipboardError = '' }
  })

  $effect(() => {
    if (writing) textareaEl?.focus()
  })

  async function pasteClipboard() {
    try {
      const pasted = await navigator.clipboard.readText()
      if (!pasted.trim()) { clipboardError = 'No hay nada copiado. Cópiala y vuelve a tocar, o escríbela aquí.'; return }
      text = pasted
      writing = true
    } catch {
      clipboardError = 'No se pudo leer lo copiado. Escríbela o pégala aquí.'
      writing = true
    }
  }

  function submit() {
    open = false
    onsubmit(text.trim())
  }

  let lines = $derived(lineCount(text))
</script>

<Sheet bind:open full title="Pega tu rutina" eyebrow="Como la tengas anotada" titleStyle="center" id="paste-routine-sheet">
  {#if !writing}
    <p class="lead">Días, ejercicios, series y repeticiones. Abreviado o con faltas, como se la dirías a un entrenador.</p>
    <div class="pst ph" aria-hidden="true">
      <span>Ejemplo:</span><span>Lunes pecho y tríceps</span><span>press banca 4x8</span><span>fondos 3 al fallo</span><span>…</span>
    </div>
  {:else}
    <textarea
      bind:this={textareaEl}
      bind:value={text}
      class="pst"
      aria-label="Tu rutina"
      placeholder={'Lunes pecho y tríceps\npress banca 4x8\nfondos 3 al fallo'}
    ></textarea>
    {#if lines}<p class="count">{plural(lines, 'línea', 'líneas')}</p>{/if}
  {/if}
  {#if clipboardError}<p class="err">{clipboardError}</p>{/if}

  {#snippet footer()}
    {#if writing}
      <p class="cap">Primero te muestra cómo queda; se crea cuando estés de acuerdo</p>
      <Button size="lg" variant="primary" disabled={!lines || !online} onclick={submit}>Ver cómo queda<Icon name="arrow" size={18} /></Button>
    {:else}
      <Button size="lg" variant="primary" onclick={pasteClipboard}>Pegar lo que copiaste</Button>
      <Button size="lg" variant="text" style="align-self:center" onclick={() => writing = true}>Escribirla aquí</Button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .lead { font-size: 16px; line-height: 1.5; color: var(--text-secondary); }
  .pst {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 260px;
    padding: 16px 18px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--surface-hover);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.45;
    resize: none;
    outline: none;
    caret-color: var(--accent);
    user-select: text;
    -webkit-user-select: text;
  }
  .pst.ph { min-height: 0; }
  .pst.ph span { color: var(--text-muted); }
  .count { margin-top: -10px; font-size: 13px; color: var(--text-tertiary); }
  .err { font-size: 13px; color: var(--cv-danger-text); }
  .cap { font-size: 13px; text-align: center; color: var(--text-tertiary); }
</style>
