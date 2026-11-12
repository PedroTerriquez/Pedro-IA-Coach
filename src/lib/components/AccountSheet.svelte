<script lang="ts">
  import { goto } from '$app/navigation'
  import { untrack } from 'svelte'
  import Sheet from './Sheet.svelte'
  import TextInput from './TextInput.svelte'
  import Button from './Button.svelte'
  import Lead from './Lead.svelte'
  import ResultSheet from './ResultSheet.svelte'
  import { settings } from '$lib/stores/settings'
  import { getSettings, saveSettings } from '$lib/storage'
  import { createAccount, login, uploadSnapshot, downloadAll, isValidEmail, MIN_PASSWORD, type AuthResult } from '$lib/cloud'
  import { ROUTES } from '$lib/routes'
  import type { ResultInfo } from '$lib/you-data'

  type AccountMode = 'crear' | 'entrar'

  // «Guarda tus datos en la nube» (crear) and «Ya tengo cuenta» (entrar).
  let { open = $bindable(false), mode = $bindable<AccountMode>('crear'), presetUsername = '', onclose = () => {} }: {
    open: boolean
    mode?: AccountMode
    /** Prefills «Usuario» in entrar (Amigos → usuario protegido) */
    presetUsername?: string
    onclose?: () => void
  } = $props()

  const NETWORK_ERROR = 'Sin conexión. Intenta otra vez.'

  let savedUsername = $state('')
  let username = $state('')
  let email = $state('')
  let password = $state('')
  let busy = $state(false)
  let emailError = $state('')
  let passwordError = $state('')
  let formError = $state('')
  let protectedTaken = $state(false)
  let forgotShown = $state(false)
  let resultOpen = $state(false)
  let result = $state<ResultInfo | null>(null)

  let needsUsername = $derived(mode === 'entrar' || !savedUsername)
  let title = $derived(mode === 'crear' ? 'Guarda tus datos en la nube' : 'Iniciar sesión')
  let canSubmit = $derived(!busy && password.length > 0 && (!needsUsername || username.trim().length >= 2) && (mode === 'entrar' || email.trim().length > 0))

  function resetErrors() {
    emailError = ''
    passwordError = ''
    formError = ''
    protectedTaken = false
  }

  // Clears synchronously; the saved name arrives later and only fills an
  // empty field, never what the person already typed.
  async function prepare() {
    resetErrors()
    forgotShown = false
    password = ''
    email = ''
    username = presetUsername
    savedUsername = $settings.username || ''
    const saved = (await getSettings()).username || ''
    savedUsername = saved
    if (!username && mode === 'entrar') username = saved
  }

  // Only opening resets the form: settings or props changing while it is open don't.
  $effect(() => {
    if (open) untrack(() => prepare())
  })

  function switchToLogin() {
    const name = username.trim() || savedUsername
    mode = 'entrar'
    resetErrors()
    password = ''
    username = name
  }

  function validateCreate(): boolean {
    emailError = isValidEmail(email) ? '' : 'Correo no válido'
    passwordError = password.length >= MIN_PASSWORD ? '' : `Mínimo ${MIN_PASSWORD} caracteres`
    return !emailError && !passwordError
  }

  function showFailure(res: Exclude<AuthResult, { ok: true }>) {
    if (res.reason === 'protected') { formError = 'Ese usuario ya está protegido'; protectedTaken = true }
    else if (res.reason === 'wrong') formError = 'Usuario o contraseña incorrectos'
    else if (res.reason === 'invalid') formError = res.message || 'Revisa los datos'
    else formError = NETWORK_ERROR
  }

  async function saveUsername(name: string) {
    const s = await getSettings()
    if (s.username === name) return
    await saveSettings({ ...s, username: name })
    await settings.load()
  }

  async function submitCreate() {
    if (!validateCreate()) return
    const name = savedUsername || username.trim()
    const res = await createAccount(name, email, password)
    if (!res.ok) return showFailure(res)
    await saveUsername(name)
    const upload = await uploadSnapshot()
    open = false
    result = upload === 'saved'
      ? { ok: true, heading: 'Tus datos están en la nube', text: 'Se guardan solos cada vez que terminas tus ejercicios.' }
      : { ok: true, heading: 'Tu usuario está protegido', text: 'Tus datos se subirán en cuanto haya conexión.' }
    resultOpen = true
  }

  async function submitLogin() {
    const name = username.trim()
    const res = await login(name, password)
    if (!res.ok) return showFailure(res)
    try {
      await downloadAll()
    } catch {
      formError = NETWORK_ERROR
      return
    }
    await saveUsername(name)
    await settings.load()
    open = false
    goto(ROUTES.today)
  }

  async function submit() {
    if (!canSubmit) return
    resetErrors()
    busy = true
    try {
      if (mode === 'crear') await submitCreate()
      else await submitLogin()
    } finally {
      busy = false
    }
  }
</script>

<Sheet bind:open {title} id="account-sheet" {onclose}>
  <div class="form" data-component="AccountSheet" data-mode={mode}>
    {#if mode === 'crear'}
      <Lead size={15}>Protege tu usuario con correo y contraseña y recupera todo en otro teléfono.</Lead>
    {/if}
    {#if needsUsername}
      <TextInput variant="field" label="Usuario" id="account-username" bind:value={username} maxlength={20} autocomplete="username" mono />
    {/if}
    {#if mode === 'crear'}
      <TextInput variant="field" type="email" inputmode="email" label="Correo" id="account-email" bind:value={email} autocomplete="email" error={emailError} placeholder="tu@correo.com" />
    {/if}
    <TextInput variant="field" type="password" label="Contraseña" id="account-password" bind:value={password} autocomplete={mode === 'crear' ? 'new-password' : 'current-password'} error={passwordError} />

    {#if formError}
      <p class="form-error" role="alert">{formError}</p>
    {/if}
    {#if protectedTaken}
      <Button variant="text" id="account-go-login" onclick={switchToLogin}>Iniciar sesión</Button>
    {/if}

    <Button size="lg" variant="primary" id="account-submit" disabled={!canSubmit} onclick={submit}>
      {#if mode === 'crear'}{busy ? 'Guardando…' : 'Guardar en la nube'}{:else}{busy ? 'Entrando…' : 'Iniciar sesión'}{/if}
    </Button>

    {#if mode === 'entrar'}
      {#if forgotShown}
        <Lead size={14}>Escríbele a Pedro para restablecerla.</Lead>
      {:else}
        <Button variant="text" id="account-forgot" onclick={() => (forgotShown = true)}>¿Olvidaste tu contraseña?</Button>
      {/if}
    {/if}
  </div>
</Sheet>

<ResultSheet bind:open={resultOpen} title="Cuenta" {result} />

<style>
  .form { display: flex; flex-direction: column; gap: 16px; }
  .form-error { margin: 0; padding: 0 4px; font-size: 14px; color: var(--cv-danger-text); }
</style>
