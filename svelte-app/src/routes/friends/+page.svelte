<script lang="ts">
  declare const PUSH_SERVER_URL: string

  import { onMount } from 'svelte'
  import { toast } from '$lib/stores/ui'
  import { getAllLogs, getSettings, saveSettings } from '$lib/storage'

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

  function getPreviousDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  function computeStreak(allLogs: any[]): number {
    const dates = [...new Set(allLogs.filter(l => l.weight > 0).map(l => l.date))]
    dates.sort().reverse()
    let streak = 0
    const today = new Date().toISOString().slice(0, 10)
    let expected = today
    for (const d of dates) {
      if (d === expected) { streak++; expected = getPreviousDate(expected) }
      else break
    }
    return streak
  }

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
    myStreak = computeStreak(allLogs)
    const today = new Date().toISOString().slice(0, 10)
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

  $effect(() => {
    const q = searchQuery
    if (q.length < 1) {
      searchResults = []
      searching = false
      return
    }
    loadSearchResults(q)
  })

  async function loadSearchResults(q: string) {
    searching = true
    try {
      if (!PUSH_SERVER_URL) {
        searchResults = []
        return
      }
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      searchResults = (data.results || []).filter((r: any) => r.username !== username)
    } catch {
      searchResults = []
    } finally {
      searching = false
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
  <div class="friends-view">
    <div class="friends-empty" id="friends-list">Cargando...</div>
  </div>
{:else if !username}
  <div class="username-prompt" id="username-prompt">
    <h2>👋 Bienvenido a Amigos</h2>
    <p>Elige un nombre de usuario para compartir tu racha con amigos.</p>
    <input
      type="text"
      id="username-input"
      placeholder="tu_usuario"
      maxlength="20"
      autocomplete="off"
      oninput={(e) => inputUsername = (e.target as HTMLInputElement).value}
    >
    <div class="error-msg" id="username-error" style="display:none"></div>
    <button
      class="btn-primary"
      id="username-btn"
      onclick={handleSubmitUsername}
      disabled={inputUsername.trim().length < 2 || saving}
    >
      {saving ? 'Registrando...' : 'Listo'}
    </button>
  </div>
{:else}
  <div class="friends-view">
    <div class="friends-header">👥 Amigos</div>
    <div class="friends-my-streak">
      🔥 Tu racha: <strong>{myStreak}</strong> {myStreak === 1 ? 'día' : 'días'} {exercisedToday ? '· Hoy ✅' : ''}
    </div>
    <div class="friends-list" id="friends-list">
      {#if loading}
        <div class="friends-empty">Cargando amigos...</div>
      {:else if friends.length === 0}
        <div class="friends-empty">Aún no tienes amigos. Busca y agrega amigos arriba. 👆</div>
      {:else}
        {#each friends as f (f.username)}
          <div class="friend-card">
            <div class="friend-avatar">{f.username.charAt(0).toUpperCase()}</div>
            <div class="friend-info">
              <div class="friend-name">{f.username}</div>
              <div class="friend-status">{f.exercisedToday ? 'Hoy ✅' : (f.lastUpdate ? 'Inactivo' : '—')}</div>
            </div>
            <div class="friend-streak">{f.streak}<span class="unit">{f.streak === 1 ? 'día' : 'días'}</span></div>
          </div>
        {/each}
      {/if}
    </div>
    <div class="friend-search">
      <input
        type="text"
        id="friend-search-input"
        placeholder="🔍 Buscar usuario..."
        autocomplete="off"
        bind:value={searchQuery}
      >
    </div>
    {#if searchQuery.length >= 1 || searching || searchResults.length > 0}
      <div class="search-results" id="search-results">
        {#if searching}
          <div class="friends-empty">Buscando...</div>
        {:else if searchResults.length === 0}
          <div class="friends-empty">No se encontraron usuarios</div>
        {:else}
          {#each searchResults as r (r.username)}
            <div class="search-result-item">
              <div class="search-result-info">
                <span class="search-result-name">{r.username}</span>
                <span class="search-result-streak">{r.streak} {r.streak === 1 ? 'día' : 'días'}</span>
              </div>
              <button
                class="search-result-add"
                onclick={() => addFriend(r.username)}
                disabled={addingFriend === r.username}
              >
                {addingFriend === r.username ? '...' : 'Agregar'}
              </button>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
