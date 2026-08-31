<script lang="ts">
  let {
    username = '',
    streak = 0,
    exercisedToday = false,
    lastUpdate = '',
    gymTime = 0,
    position = 0,
    isMe = false,
    accent = 'var(--accent)',
    onremove = () => {}
  }: {
    username: string
    streak: number
    exercisedToday: boolean
    lastUpdate: string
    gymTime: number
    position: number
    isMe: boolean
    accent?: string
    onremove?: (username: string) => void
  } = $props()

  let confirmDelete = $state(false)

  const initial = $derived(username ? username[0].toUpperCase() : '?')
  const posLabel = $derived(position === 1 ? '🏆' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}`)
  const posColor = $derived(position <= 3 ? accent : 'var(--text-muted)')
  const gymMinutes = $derived(Math.floor((gymTime || 0) / 60))
  const streakLabel = $derived(`${streak} ${streak === 1 ? 'semana' : 'semanas'}`)

  function handleRemove() {
    if (!confirmDelete) {
      confirmDelete = true
      setTimeout(() => confirmDelete = false, 3000)
      return
    }
    onremove(username)
    confirmDelete = false
  }
</script>

<div class="friend-card" class:is-me={isMe}>
  <div class="pos" style="color:{posColor}">{posLabel}</div>
  <div class="avatar" style="background:{accent}20;color:{accent}">{initial}</div>
  <div class="info">
    <div class="name-row">
      <span class="name">{username}</span>
      <span class="name-streak" style="color:{accent}">- {streakLabel}</span>
      {#if isMe}<span class="me-badge" style="background:{accent}18;color:{accent}">Yo</span>{/if}
    </div>
    <div class="gym-row">
      <span class="gym">🏋️ {gymMinutes} {gymMinutes === 1 ? 'minuto' : 'minutos'} de gym esta semana</span>
    </div>
  </div>
  <div class="today-badge" class:active={exercisedToday}>
    {exercisedToday ? '✅' : '—'}
  </div>
  {#if !isMe}
    <button
      class="remove-btn"
      class:confirm={confirmDelete}
      onclick={handleRemove}
      type="button"
      aria-label={confirmDelete ? 'Confirmar eliminar' : 'Eliminar amigo'}
    >
      {#if confirmDelete}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      {/if}
    </button>
  {/if}
</div>

<style>
  .friend-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
    transition: background 0.15s;
  }
  .friend-card:active {
    background: var(--surface-hover);
  }
  .friend-card.is-me {
    border-color: rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
  }
  .pos {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }
  .avatar {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .name {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .name-streak {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .me-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }
  .gym-row {
    margin-top: 2px;
  }
  .gym {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .today-badge {
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0.4;
  }
  .today-badge.active {
    opacity: 1;
  }
  .remove-btn {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .remove-btn:active {
    background: rgba(255,255,255,0.08);
  }
  .remove-btn.confirm {
    background: rgba(255,68,68,0.15);
  }
</style>
