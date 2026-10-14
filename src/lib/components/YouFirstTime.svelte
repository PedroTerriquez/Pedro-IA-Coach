<script lang="ts">
  import PageHeader from './PageHeader.svelte'
  import YouScreen from './YouScreen.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  type View = 'ejercicios' | 'ajustes' | 'copia'

  // Tú without any program: two numbered steps and one button that names what's next.
  let { profileFilled, exerciseCount, onguide, oncreate, onnavigate }: {
    profileFilled: number
    exerciseCount: number
    onguide: () => void
    oncreate: () => void
    onnavigate: (view: View) => void
  } = $props()

  let dataDone = $derived(profileFilled >= 7)
</script>

<YouScreen gap={28} id="you-first-time">
  <PageHeader eyebrow="Tú" title="Hola." sub="Cuéntale al coach de ti y arma tu programa." />

  <div class="sess">
    <button type="button" class="ph-row" class:cur={!dataDone} class:done={dataDone} onclick={onguide} id="you-step-datos">
      <span class="ph-i">1</span>
      <span class="txt"><span class="ph-t">Tus datos</span><span class="ph-s">Estatura, peso, objetivo… · {profileFilled} de 7</span></span>
      <span class="chev"><Icon name="chev" size={16} /></span>
    </button>
    <button type="button" class="ph-row" class:cur={dataDone} onclick={oncreate} id="you-step-programa">
      <span class="ph-i">2</span>
      <span class="txt"><span class="ph-t">Tu programa</span><span class="ph-s">Con el coach o a mano</span></span>
      <span class="chev"><Icon name="chev" size={16} /></span>
    </button>
  </div>

  <NavGroup>
    <NavRow id="you-row-ejercicios" label="Ejercicios" value={exerciseCount} onclick={() => onnavigate('ejercicios')} />
    <NavRow id="you-row-ajustes" label="Ajustes" onclick={() => onnavigate('ajustes')} />
    <NavRow id="you-row-copia" label="Copia de seguridad" onclick={() => onnavigate('copia')} />
  </NavGroup>

  <NextStepDock>
    {#if dataDone}
      <Button size="lg" variant="primary" onclick={oncreate}><Icon name="plus" size={20} />Crear programa</Button>
    {:else}
      <Button size="lg" variant="primary" onclick={onguide}>Completar mis datos<Icon name="arrow" size={18} /></Button>
    {/if}
  </NextStepDock>
</YouScreen>

<style>
  .sess { display: flex; flex-direction: column; gap: 12px; }
  .ph-row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 68px;
    padding: 10px 16px 10px 14px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .ph-i {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
    box-shadow: inset 0 0 0 1.5px var(--cv-line-strong);
  }
  .cur .ph-i { color: var(--text); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.6); }
  .done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .txt { min-width: 0; }
  .ph-t { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .ph-s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
  .chev { display: grid; color: var(--text-muted); }
</style>
