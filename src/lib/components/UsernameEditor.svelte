<script lang="ts">
  let {
    username = '',
    accent = 'var(--accent)',
    onsave = async () => {}
  }: {
    username: string
    accent?: string
    onsave?: (name: string) => Promise<void>
  } = $props()

  let editing = $state(false)
  let draft = $state(username)
  let saving = $state(false)
  let inputEl: HTMLInputElement | null = null

  function startEdit() {
    draft = username
    editing = true
    setTimeout(() => inputEl?.focus(), 0)
  }

  async function confirm() {
    const val = draft.trim()
    if (val.length < 2 || val.length > 20 || val === username) {
      editing = false
      return
    }
    saving = true
    try {
      await onsave(val)
      editing = false
    } catch {
      draft = username
      editing = false
    } finally {
      saving = false
    }
  }

  function cancel() {
    draft = username
    editing = false
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); confirm() }
    if (e.key === 'Escape') cancel()
  }

  const initial = $derived(username ? username[0].toUpperCase() : '?')
</script>

<div class="username-editor">
  <div class="avatar" style="background:{accent}20;color:{accent}">{initial}</div>
  {#if editing}
    <div class="edit-row">
      <input
        bind:this={inputEl}
        class="name-input"
        type="text"
        bind:value={draft}
        maxlength={20}
        placeholder="tu_usuario"
        {onkeydown}
        style="caret-color:{accent}"
      />
      <button type="button" class="icon-btn" onclick={confirm} disabled={saving || draft.trim().length < 2} aria-label="Guardar">
        {#if saving}
          <span class="spinner"></span>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        {/if}
      </button>
      <button type="button" class="icon-btn cancel" onclick={cancel} aria-label="Cancelar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  {:else}
    <div class="display-row">
      <span class="name-text">{username}</span>
      <button type="button" class="icon-btn" onclick={startEdit} aria-label="Editar nombre">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .username-editor {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
  }
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 20px;
    flex-shrink: 0;
  }
  .display-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .name-text {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 16px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .name-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 6px 10px;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 600;
    outline: none;
    min-width: 0;
  }
  .name-input:focus {
    border-color: rgba(255,255,255,0.2);
  }
  .icon-btn {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .icon-btn:active {
    background: rgba(255,255,255,0.08);
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
