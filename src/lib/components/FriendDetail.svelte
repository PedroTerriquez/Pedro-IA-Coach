<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Avatar from './Avatar.svelte'
  import Button from './Button.svelte'
  import StatBlock from './StatBlock.svelte'
  import { TOUCH, TOUCH_SECONDARY, TOUCH_DANGER_TEXT } from './friends-touch'
  import type { LeagueEntry } from '$lib/league'

  let { open = $bindable(false), friend, myMinutes = 0, online = true, removing = false, onremove = () => {} }: {
    open: boolean
    friend: LeagueEntry | null
    myMinutes: number
    online?: boolean
    removing?: boolean
    onremove?: (username: string) => void
  } = $props()

  let confirming = $state(false)

  // Bars are relative to whoever has more minutes of the two.
  const scale = $derived(Math.max(friend?.minutes ?? 0, myMinutes, 1))
  const width = (minutes: number) => `${Math.round((minutes / scale) * 100)}%`

  $effect(() => {
    if (!open) confirming = false
  })
</script>

<Sheet bind:open>
  {#if friend}
    <div class="friend-detail" data-component="FriendDetail">
      <div class="who">
        <Avatar username={friend.username} size={64} today={friend.today} />
        <div class="who-text">
          <div class="who-name">{friend.username}</div>
          <div class="who-sub">
            {#if friend.today}<i></i>{/if}
            <span>{friend.today ? 'Entrenó hoy · ' : ''}#{friend.position} esta semana</span>
          </div>
        </div>
      </div>

      <div class="duo">
        <div><StatBlock value={friend.streak} label={friend.streak === 1 ? 'semana seguida' : 'semanas seguidas'} /></div>
        <div><StatBlock value={friend.minutes} label="min esta semana" /></div>
      </div>

      <div class="compare">
        <div class="label">Minutos esta semana</div>
        <div class="bar-row">
          <span class="bar-name">{friend.username}</span>
          <span class="bar"><span style="width:{width(friend.minutes)}"></span></span>
          <span class="bar-value">{friend.minutes}</span>
        </div>
        <div class="bar-row me">
          <span class="bar-name">Tú</span>
          <span class="bar"><span style="width:{width(myMinutes)}"></span></span>
          <span class="bar-value">{myMinutes}</span>
        </div>
      </div>

      {#if confirming}
        <div class="confirm">
          <span class="confirm-title">¿Quitar a {friend.username} de tu liga?</span>
          <span class="note">Dejarás de ver su progreso. No le avisamos y puedes volver a agregarle cuando quieras.</span>
          <div class="pair">
            <Button variant="secondary" fullWidth style={TOUCH_SECONDARY} onclick={() => confirming = false}>Cancelar</Button>
            <Button variant="danger" fullWidth style={TOUCH} disabled={removing || !online} onclick={() => onremove(friend.username)}>Quitar</Button>
          </div>
        </div>
      {:else}
        <div class="remove">
          <Button variant="danger" fullWidth style={TOUCH_DANGER_TEXT} disabled={!online} onclick={() => confirming = true}>Quitar de mi liga</Button>
          {#if !online}<p class="cap">Necesitas internet para quitar amigos.</p>{/if}
        </div>
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .friend-detail {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 20px 0 calc(28px + env(safe-area-inset-bottom, 0px));
    --ring: var(--surface);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .who-text { min-width: 0; }
  .who-name {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.6px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who-sub {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 4px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .who-sub i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
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
  .compare {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .bar-row {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) 48px;
    align-items: center;
    gap: 12px;
  }
  .bar-name {
    font-size: 14px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: rgba(255,255,255,0.3);
  }
  .bar-row.me .bar-name { color: var(--text); }
  .bar-row.me .bar span { background: var(--text); }
  .bar-value {
    font-family: var(--font-mono);
    font-size: 15px;
    letter-spacing: -0.04em;
    text-align: right;
    color: var(--text);
  }
  .confirm {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.04);
  }
  .confirm-title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--text);
  }
  .note {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
  }
  .remove {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: -6px;
  }
  .cap {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-tertiary);
    text-align: center;
  }
</style>
