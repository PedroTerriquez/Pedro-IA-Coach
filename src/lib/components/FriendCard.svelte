<script lang="ts">
  let {
    username = '',
    streak = 0,
    exercisedToday = false,
    lastUpdate = null
  }: {
    username: string
    streak: number
    exercisedToday: boolean
    lastUpdate?: string | null
  } = $props()

  let initial = $derived(username.charAt(0).toUpperCase())
  let statusText = $derived(exercisedToday ? 'Hoy ✅' : (lastUpdate ? 'Inactivo' : '—'))
</script>

<div class="friend-card">
  <div class="friend-avatar">{initial}</div>
  <div class="friend-info">
    <div class="friend-name">{username}</div>
    <div class="friend-status">{statusText}</div>
  </div>
  <div class="friend-streak">{streak}<span class="unit">{streak === 1 ? 'día' : 'días'}</span></div>
</div>

<style>
  .friend-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
  }
  .friend-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    flex-shrink: 0;
  }
  .friend-info {
    flex: 1;
    min-width: 0;
  }
  .friend-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .friend-status {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-top: 2px;
  }
  .friend-streak {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    color: var(--accent, #d4ff3a);
    letter-spacing: -0.5px;
    flex-shrink: 0;
  }
  .friend-streak .unit {
    font-size: 9px;
    color: var(--text-tertiary);
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-left: 2px;
  }
</style>
