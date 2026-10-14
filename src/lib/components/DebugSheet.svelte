<script lang="ts">
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { lastAIExchange, DEBUG_PASSWORD, formatExchange } from '$lib/stores/debug'
  import Sheet from './Sheet.svelte'
  import TextInput from './TextInput.svelte'
  import Button from './Button.svelte'

  // «Modo debug de IA»: password when off; status, last exchange, Mostrar / Copiar todo when on.
  let { open = $bindable(false) }: { open: boolean } = $props()

  let pass = $state('')
  let error = $state('')
  let showing = $state(false)

  let exchange = $derived($lastAIExchange)
  let text = $derived(formatExchange(exchange))

  $effect(() => {
    if (!open) { pass = ''; error = ''; showing = false }
  })

  async function activate() {
    if (pass.trim() !== DEBUG_PASSWORD) { error = 'Contraseña incorrecta'; return }
    await settings.update({ debugAI: true })
    toast.show('Debug IA activado')
    pass = ''
  }

  async function deactivate() {
    await settings.update({ debugAI: false })
    toast.show('Debug IA desactivado')
    open = false
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text)
      toast.show('Copiado')
    } catch {
      toast.show('No se pudo copiar', true)
    }
  }
</script>

<Sheet bind:open title="Modo debug de IA" id="debug-ai-section">
  {#if !$settings.debugAI}
    <p class="lead">Guarda lo que la app le manda al coach y lo que responde, para revisar errores. Es para desarrolladores.</p>
    <TextInput variant="field" label="Contraseña" type="password" mono id="debug-pass-input" autocomplete="off" bind:value={pass} {error}
      onkeydown={(e) => { if (e.key === 'Enter') activate() }} />
    <Button size="lg" variant="primary" onclick={activate}>Activar</Button>
  {:else}
    {#if !showing}
      <div class="ro"><span class="l">Estado</span><span class="on-dot"><i></i>Activado</span></div>
    {/if}
    <div class="dbg">
      <span class="lbl">Último intercambio</span>
      {#if exchange}
        <b>{exchange.label}</b>
        <span class="meta">{exchange.ts} · {exchange.endpoint}</span>
      {:else}
        <span class="meta">Esperando la primera conexión con la IA…</span>
      {/if}
    </div>
    {#if showing}
      <textarea id="debug-ai-output" readonly spellcheck="false" value={text}></textarea>
      <div class="duo">
        <Button size="lg" variant="secondary" onclick={() => showing = false}>Ocultar</Button>
        <Button size="lg" variant="secondary" onclick={copyAll}>Copiar todo</Button>
      </div>
    {:else}
      <Button size="lg" variant="secondary" disabled={!exchange} onclick={() => showing = true}>Mostrar</Button>
      <div class="far">
        <Button size="lg" variant="danger-text" style="align-self:center" onclick={deactivate}>Desactivar</Button>
      </div>
    {/if}
  {/if}
</Sheet>

<style>
  .lead { margin-top: -6px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
  .ro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 56px; padding: 8px 16px; border-radius: var(--cv-radius-field); background: var(--cv-fill-1); }
  .l { font-size: 16px; font-weight: 500; }
  .on-dot { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-secondary); }
  .on-dot i { width: 8px; height: 8px; border-radius: 50%; background: var(--text); }
  .dbg { display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: var(--radius-lg); background: var(--cv-fill-1); }
  .dbg b { font-size: 16px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .meta { font-family: var(--font-mono); font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
  textarea {
    height: 260px;
    padding: 12px 14px;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--bg);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.55;
    white-space: pre;
    resize: vertical;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
  }
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .far { display: flex; flex-direction: column; padding-top: 6px; margin-bottom: -14px; border-top: 0.5px solid var(--border-medium); }
</style>
