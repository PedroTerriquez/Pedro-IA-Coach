<script lang="ts">
  import { PUSH_SERVER_URL } from '$lib/config'
  import { onMount } from 'svelte'
  import { toast } from '$lib/stores/ui'
  import { getAllLogs, getSettings, getPrograms, saveSettings } from '$lib/storage'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { toLocalDateStr } from '$lib/calendar-utils'
  import UsernameEditor from '$lib/components/UsernameEditor.svelte'
  import Leaderboard from '$lib/components/Leaderboard.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import SearchResults from '$lib/components/SearchResults.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Button from '$lib/components/Button.svelte'
  import SectionLabel from '$lib/components/SectionLabel.svelte'

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
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let accent = $state('var(--accent)')
  let settingsLoaded = $state(false)

  onMount(async () => {
    const s = await getSettings()
    accent = s.accentColor || 'var(--accent)'

    if (s.userName && !s.username) {
      s.username = s.userName
      await saveSettings(s)
    }

    username = s.username || ''
    settingsLoaded = true
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

  async function handleUsernameSave(newName: string) {
    const s = await getSettings()
    const oldName = s.username
    s.username = newName
    await saveSettings(s)
    if (PUSH_SERVER_URL) {
      fetch(`${PUSH_SERVER_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newName }),
      }).catch(() => {})
    }
    username = newName
    toast.show('Username actualizado')
  }

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
        toast.show(`${friendUsername} agregado`)
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

  async function removeFriend(friendUsername: string) {
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername }),
      })
      if (res.ok) {
        friends = friends.filter(f => f.username !== friendUsername)
        toast.show(`${friendUsername} eliminado`)
      } else {
        const data = await res.json()
        toast.show(data.error || 'Error', true)
      }
    } catch {
      toast.show('Error al eliminar amigo', true)
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
      🔥 Racha: <strong>{myStreak}</strong> {myStreak === 1 ? 'semana' : 'semanas'} {exercisedToday ? '· Hoy ✅' : ''}
    </div>

    <div class="section-label-wrap">
      <SectionLabel {accent}>Mi Perfil</SectionLabel>
    </div>
    <div class="section-pad">
      <UsernameEditor {username} {accent} onsave={handleUsernameSave} />
    </div>

    <div class="section-label-wrap">
      <SectionLabel {accent}>Ranking</SectionLabel>
    </div>
    <div class="section-pad" id="friends-list">
      {#if loading}
        <div class="friends-empty">Cargando amigos...</div>
      {:else}
        <Leaderboard {friends} {myStreak} myUsername={username} {accent} onremove={removeFriend} />
      {/if}
    </div>

    <div class="section-label-wrap">
      <SectionLabel {accent}>Buscar</SectionLabel>
    </div>
    <div class="section-pad">
      <SearchInput id="friend-search-input" value={searchQuery} placeholder="🔍 Buscar usuario..." oninput={(val) => searchQuery = val} />
      <SearchResults
        query={searchQuery}
        {searching}
        results={searchResults}
        {addingFriend}
        {accent}
        onadd={addFriend}
      />
    </div>
  </div>
{/if}

<style>
  .username-input-wrap {
    max-width: 280px;
    margin: 0 auto 16px;
  }
  .section-pad {
    padding: 0 16px 16px;
  }
  .section-label-wrap {
    padding: 0 16px;
  }
</style>
