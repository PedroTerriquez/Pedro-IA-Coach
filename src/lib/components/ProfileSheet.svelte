<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Avatar from './Avatar.svelte'
  import Button from './Button.svelte'
  import StatBlock from './StatBlock.svelte'
  import UsernameField from './UsernameField.svelte'
  import Caption from './Caption.svelte'
  import Lead from './Lead.svelte'
  import { TOUCH, TOUCH_SECONDARY } from './friends-touch'

  type RenameResult = 'ok' | 'taken' | 'error'

  let {
    open = $bindable(false),
    username = '',
    streak = 0,
    friendCount = 0,
    registered = true,
    registering = false,
    online = true,
    onrename = async () => 'error' as RenameResult,
    onregister = () => {},
    onshare = () => {}
  }: {
    open: boolean
    username: string
    streak: number
    friendCount: number
    registered?: boolean
    registering?: boolean
    online?: boolean
    onrename?: (newName: string) => Promise<RenameResult>
    onregister?: () => void
    onshare?: () => void
  } = $props()

  let editing = $state(false)
  let draft = $state('')
  let saving = $state(false)
  let taken = $state(false)

  const cleanDraft = $derived(draft.trim())
  const canSave = $derived(online && !saving && cleanDraft.length >= 2 && cleanDraft !== username)

  function startEdit() {
    draft = username
    taken = false
    editing = true
  }

  async function save() {
    if (!canSave) return
    saving = true
    const result = await onrename(cleanDraft)
    saving = false
    taken = result === 'taken'
    if (result === 'ok') editing = false
  }

  $effect(() => {
    if (!open) editing = false
  })
</script>

<Sheet bind:open>
  {#snippet header()}{editing ? 'Cambiar usuario' : 'Mi perfil'}{/snippet}
  <div class="profile" class:editing data-component="ProfileSheet">
    {#if editing}
      <!-- Field first: the iOS keyboard covers the bottom of the sheet. -->
      <UsernameField id="rename-input" bind:value={draft} error={taken ? 'Ese usuario ya está tomado' : ''} oninput={() => taken = false} />
      <Lead size={14}>Tus amigos verán el cambio en su liga.</Lead>
      <Button variant="primary" fullWidth style={TOUCH} disabled={!canSave} onclick={save}>Guardar</Button>
      {#if !online}<Caption style="margin-top:-4px">Necesitas internet para cambiar tu usuario.</Caption>{/if}
    {:else}
      <div class="who">
        <Avatar {username} size={64} />
        <div class="who-text">
          <div class="who-name">{username}</div>
          <div class="who-sub">{registered ? 'Así te encuentran tus amigos' : 'Solo visible en este teléfono'}</div>
        </div>
        {#if registered}
          <!-- Oculto por ahora (Pedro). El botón sigue aquí para reactivarlo quitando `hidden`. -->
          <button type="button" class="edit" aria-label="Editar usuario" onclick={startEdit} hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>
          </button>
        {/if}
      </div>

      {#if registered}
        <div class="duo">
          <!-- A streak of 0 is never shown as a number. -->
          <div><StatBlock value={streak > 0 ? streak : '—'} label={streak === 0 ? 'racha nueva' : streak === 1 ? 'semana seguida' : 'semanas seguidas'} /></div>
          <div><StatBlock value={friendCount} label={friendCount === 1 ? 'amigo en tu liga' : 'amigos en tu liga'} /></div>
        </div>
        <Button variant="secondary" fullWidth style={TOUCH_SECONDARY} onclick={onshare}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v7h14v-7"/></svg>
          Compartir mi usuario
        </Button>
      {:else}
        <div class="notice">
          <span class="notice-title">Aún no pueden encontrarte</span>
          <span class="note">Registra tu usuario para aparecer en la liga de tus amigos. Tus entrenos siguen guardados en tu teléfono.</span>
        </div>
        <Button variant="primary" fullWidth style={TOUCH} disabled={registering} onclick={onregister}>Registrar mi usuario</Button>
      {/if}
    {/if}
  </div>
</Sheet>

<style>
  .profile {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 18px 0 calc(28px + env(safe-area-inset-bottom, 0px));
  }
  /* Tall while typing, so the field stays above the iOS keyboard. */
  .profile.editing {
    min-height: 70vh;
    gap: 14px;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .who-text {
    flex: 1;
    min-width: 0;
  }
  .who-name {
    font-family: var(--font-mono);
    font-size: 21px;
    font-weight: 600;
    letter-spacing: -0.6px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who-sub {
    margin-top: 4px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .edit {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.06);
    color: var(--text);
    cursor: pointer;
    touch-action: manipulation;
  }
  /* `.edit` sets display, which would beat the browser's [hidden] rule — keep it off. */
  .edit[hidden] { display: none; }
  .duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .duo > div {
    padding: 16px;
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.04);
  }
  /* StatBlock is centred and uppercase elsewhere; here it reads as a sentence. */
  .duo :global(.stat-block) { text-align: left; }
  .duo :global(.stat-label) {
    margin-top: 8px;
    font-family: var(--font-sans);
    font-size: 13px;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-tertiary);
  }
  .notice {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.04);
  }
  .notice-title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--text);
  }
  .note {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
</style>
