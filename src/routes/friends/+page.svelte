<script lang="ts">
  import { PUSH_SERVER_URL } from '$lib/config'
  import { onMount } from 'svelte'
  import { toast } from '$lib/stores/ui'
  import { getAllLogs, getSettings, getPrograms, saveSettings } from '$lib/storage'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { toLocalDateStr } from '$lib/calendar-utils'
  import FriendCard from '$lib/components/FriendCard.svelte'
  import SearchResults from '$lib/components/SearchResults.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Button from '$lib/components/Button.svelte'

  let username = $state('')
  let inputUsername = $state('')
  let friends = $state<any[]>([])
  let searchQuery = $state('')
  let searchResults = $state<any[]>([])
  let loading = $state(true)
  let initialLoading = $state(true)
  let saving = $state(false)
  let searching = $state(false)
  let addingFriend = $state<string | null>(null)
  let myStreak = $state(0)
  let exercisedToday = $state(false)
  let searchSeq = 0

  onMount(async () => {
    const s = await getSettings()
    username = s.username || ''
    initialLoading = false
    if (username) {
      await loadFriends()
    } else {
      loading = false
    }
  })

  async function loadFriends() {
    loading = true
    const allLogs = await getAllLogs()
    const [s, progs] = await Promise.all([getSettings(), getPrograms()])
    const activeProg = progs.find(p => p.id === s.activeProgramId)
    const daysPerWeek = trainingDaysPerWeek(activeProg, s.currentWeekIdx || 0)
    const today = toLocalDateStr(new Date())
    myStreak = computeStreakWeeks(allLogs, daysPerWeek, today)
    exercisedToday = allLogs.some(l => l.date === today && l.weight > 0)

    try {
      if (!PUSH_SERVER_URL) {
        friends = []
        return
      }
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/list?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      friends = data.friends || []
    } catch {
      friends = []
    } finally {
      loading = false
    }
  }

  async function handleSubmitUsername() {
    const val = inputUsername.trim()
    if (val.length < 2 || saving) return
    saving = true
    try {
      const s = await getSettings()
      s.username = val
      await saveSettings(s)
      if (PUSH_SERVER_URL) {
        fetch(`${PUSH_SERVER_URL}/api/user/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: val }),
        }).catch(() => {})
      }
      username = val
      await loadFriends()
    } catch {
      try {
        const s = await getSettings()
        s.username = val
        await saveSettings(s)
        username = val
        await loadFriends()
      } catch {}
    } finally {
      saving = false
    }
  }

  async function removeFriend(friendUsername: string) {
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername }),
      })
      if (res.ok) {
        toast.show('Amigo eliminado')
        await loadFriends()
      } else {
        toast.show('Error al eliminar', true)
      }
    } catch {
      toast.show('Error al eliminar', true)
    }
  }

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    const q = searchQuery
    if (searchTimer) clearTimeout(searchTimer)
    if (q.length < 1) {
      searchResults = []
      searching = false
      return
    }
    searching = true
    searchTimer = setTimeout(() => loadSearchResults(q), 250)
    return () => { if (searchTimer) clearTimeout(searchTimer) }
  })

  async function loadSearchResults(q: string) {
    const seq = ++searchSeq
    try {
      if (!PUSH_SERVER_URL) {
        searchResults = []
        return
      }
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/search?q=${encodeURIComponent(q)}`)
      if (seq !== searchSeq) return
      const data = await res.json()
      if (seq !== searchSeq) return
      searchResults = (data.results || []).filter((r: any) => r.username !== username)
    } catch {
      if (seq !== searchSeq) return
      searchResults = []
    } finally {
      if (seq === searchSeq) searching = false
    }
  }

  async function addFriend(friendUsername: string) {
    addingFriend = friendUsername
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername }),
      })
      if (res.ok) {
        searchQuery = ''
        searchResults = []
        await loadFriends()
      } else {
        const data = await res.json()
        toast.show(data.error || 'Error', true)
      }
    } catch {
      toast.show('Error al agregar amigo', true)
    } finally {
      addingFriend = null
    }
  }
</script>

{#if initialLoading}
  <div class="page">
    <div class="friends-empty" id="friends-list">Cargando...</div>
  </div>
{:else if !username}
  <div class="page username-prompt" id="username-prompt">
    <h2>👋 Bienvenido a Amigos</h2>
    <p>Elige un nombre de usuario para compartir tu racha con amigos.</p>
    <div class="username-input-wrap">
      <TextInput
        id="username-input"
        bind:value={inputUsername}
        placeholder="tu_usuario"
        maxlength={20}
        autocomplete="off"
      />
    </div>
    <Button
      id="username-btn"
      variant="primary"
      onclick={handleSubmitUsername}
      disabled={inputUsername.trim().length < 2 || saving}
    >
      {saving ? 'Registrando...' : 'Listo'}
    </Button>
  </div>
{:else}
  <div class="page">
    <div class="page-header">
      <div class="friends-header">👥 Amigos</div>
    </div>
    <div class="friends-my-streak">
      🔥 Tu racha: <strong>{myStreak}</strong> {myStreak === 1 ? 'semana' : 'semanas'} {exercisedToday ? '· Hoy ✅' : ''}
    </div>
    <div class="friends-list" id="friends-list">
      {#if loading}
        <div class="friends-empty">Cargando amigos...</div>
      {:else if friends.length === 0}
        <div class="friends-empty">Aún no tienes amigos. Busca y agrega amigos arriba. 👆</div>
      {:else}
        <FriendCard
          username={username}
          streak={myStreak}
          exercisedToday={exercisedToday}
          lastUpdate=""
          position={0}
          isMe={true}
        />
        {#each [...friends].sort((a, b) => b.streak - a.streak) as f, i (f.username)}
          <FriendCard
            username={f.username}
            streak={f.streak}
            exercisedToday={f.exercisedToday}
            lastUpdate={f.lastUpdate}
            position={i + 1}
            isMe={false}
            onremove={removeFriend}
          />
        {/each}
      {/if}
    </div>
    <div class="friend-search">
      <SearchInput id="friend-search-input" value={searchQuery} placeholder="🔍 Buscar usuario..." oninput={(val) => searchQuery = val} />
    </div>
    <SearchResults
      query={searchQuery}
      {searching}
      results={searchResults}
      {addingFriend}
      onadd={addFriend}
    />
  </div>
{/if}

<style>
  .username-input-wrap {
    max-width: 280px;
    margin: 0 auto 16px;
  }
</style>
