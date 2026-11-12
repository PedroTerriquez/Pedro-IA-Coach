<script lang="ts">
  import Card from './Card.svelte'
  import Lead from './Lead.svelte'
  import Button from './Button.svelte'
  import { fetchAccountStatus, type AccountStatus } from '$lib/cloud'

  // Tú without an account (Cuenta v2): asks the Worker about this phone's
  // username and says what's next — create, add a password or sign in.
  let { username, oncreate, onlogin }: {
    username: string
    oncreate: () => void
    onlogin: () => void
  } = $props()

  let status = $state<AccountStatus | 'checking'>('checking')
  let checkId = 0

  async function check(name: string) {
    const id = ++checkId
    status = 'checking'
    const next = await fetchAccountStatus(name)
    if (id === checkId) status = next
  }

  $effect(() => { check(username) })
</script>

<div id="cloud-card" data-status={status}>
  {#if status === 'checking'}
    <Card label="Comprobando tu usuario" title="Guarda tus datos en la nube" class="checking">
      <span class="bar"></span>
      <span class="bar short"></span>
      <span class="pill"></span>
    </Card>
  {:else if status === 'none'}
    <Card title="Crea tu usuario y contraseña">
      <Lead size={14}>Guarda tus datos en la nube y recupéralos en otro teléfono.</Lead>
      <Button size="pill" variant="primary" id="cloud-card-create" onclick={oncreate}>Crear cuenta</Button>
    </Card>
  {:else if status === 'no-password'}
    <Card title="Tu usuario no tiene contraseña">
      <Lead size={14}>El usuario <b class="who">{username}</b> existe, pero sin contraseña. Ponle una para guardar tus datos en la nube.</Lead>
      <Button size="pill" variant="primary" id="cloud-card-create" onclick={oncreate}>Ponerle contraseña</Button>
    </Card>
  {:else if status === 'has-password'}
    <Card title="Ya tienes cuenta">
      <Lead size={14}>El usuario <b class="who">{username}</b> ya tiene contraseña. Inicia sesión para recuperar tus datos.</Lead>
      <Button size="pill" variant="primary" id="cloud-card-login" onclick={onlogin}>Iniciar sesión</Button>
    </Card>
  {:else}
    <!-- No answer (offline): the plain invitation; creating tells the rest -->
    <Card title="Guarda tus datos en la nube">
      <Lead size={14}>Protege tu usuario con correo y contraseña y recupera todo en otro teléfono.</Lead>
      <Button size="pill" variant="primary" id="cloud-card-create" onclick={oncreate}>Crear cuenta</Button>
    </Card>
  {/if}
</div>

<style>
  .who { font-family: var(--font-mono); font-weight: 600; color: var(--text); }
  #cloud-card :global(.checking .lbl) { display: flex; align-items: center; gap: 8px; }
  #cloud-card :global(.checking .lbl)::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .bar, .pill { display: block; background: var(--surface-hover); }
  .bar { height: 10px; border-radius: var(--radius-full); }
  .bar.short { width: 70%; }
  .pill { width: 120px; height: 44px; margin-top: 4px; border-radius: var(--radius-full); }
  @keyframes pulse { 50% { opacity: 0.3; } }
</style>
