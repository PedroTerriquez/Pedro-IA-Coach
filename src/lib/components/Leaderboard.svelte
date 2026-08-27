<script lang="ts">
  import FriendCard from './FriendCard.svelte'

  let {
    friends = [],
    myStreak = 0,
    myUsername = '',
    accent = 'var(--accent)',
    onremove = () => {}
  }: {
    friends: { username: string; streak: number; exercisedToday: boolean; lastUpdate: string }[]
    myStreak: number
    myUsername: string
    accent?: string
    onremove?: (username: string) => void
  } = $props()

  const sorted = $derived(() => {
    const me = { username: myUsername, streak: myStreak, exercisedToday: false, lastUpdate: new Date().toISOString(), isMe: true }
    const all = [me, ...friends.map(f => ({ ...f, isMe: f.username === myUsername }))]
    const unique = all.filter((item, idx, arr) => arr.findIndex(x => x.username === item.username) === idx)
    return unique.sort((a, b) => b.streak - a.streak || new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
  })
</script>

<div class="leaderboard">
  {#if friends.length === 0 && !myUsername}
    <div class="empty">Registra tu username para empezar.</div>
  {:else if friends.length === 0}
    <div class="empty">Aún no tienes amigos. Busca y agrega arriba. 👆</div>
  {:else}
    {#each sorted() as item, i (item.username)}
      <FriendCard
        username={item.username}
        streak={item.streak}
        exercisedToday={item.exercisedToday}
        lastUpdate={item.lastUpdate}
        position={i + 1}
        isMe={item.isMe || false}
        {accent}
        onremove={onremove}
      />
    {/each}
  {/if}
</div>

<style>
  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .empty {
    text-align: center;
    padding: 24px 16px;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 13px;
  }
</style>
