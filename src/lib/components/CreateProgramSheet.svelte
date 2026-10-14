<script lang="ts">
  import Sheet from './Sheet.svelte'
  import SectionLabel from './SectionLabel.svelte'
  import AIEntry from './AIEntry.svelte'

  // One «Crear programa», three paths. Offline the two AI paths turn off and say why.
  let { open = $bindable(false), online, oncoach, onpaste, onscratch }: {
    open: boolean
    online: boolean
    oncoach: () => void
    onpaste: () => void
    onscratch: () => void
  } = $props()

  function go(fn: () => void) {
    open = false
    fn()
  }
</script>

<Sheet bind:open title="Nuevo programa" id="create-program-sheet">
  <div class="cg">
    <SectionLabel>
      Con IA
      {#snippet right()}
        {#if online}<span class="ai-tag">Gratis por ahora</span>{:else}Necesita internet{/if}
      {/snippet}
    </SectionLabel>
    <div class="opts">
      <AIEntry id="create-coach" title="Platícalo con el coach" desc="Te propone un programa según tus datos; lo ajustan juntos y lo crea." disabled={!online} onclick={() => go(oncoach)} />
      <AIEntry id="create-paste" title="Pega tu rutina" desc="Pégala como la tengas; el coach te muestra cómo queda y la ajustan juntos." disabled={!online} onclick={() => go(onpaste)} />
    </div>
  </div>
  <div class="cg">
    <SectionLabel>A mano</SectionLabel>
    <AIEntry id="create-scratch" ai={false} title="Desde cero" desc="Ponle nombre y agrega días y ejercicios." onclick={() => go(onscratch)} />
  </div>
  {#if !online}<p class="cap">Sin conexión. Desde cero funciona igual.</p>{/if}
</Sheet>

<style>
  .cg { display: flex; flex-direction: column; gap: 10px; }
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .ai-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: var(--radius-full);
    background: var(--cv-accent-tag);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  .cap { margin: -4px 0 -8px; font-size: 13px; text-align: center; color: var(--text-tertiary); }
</style>
