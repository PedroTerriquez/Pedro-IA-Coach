<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import Button from '$lib/components/Button.svelte'
  import Avatar from '$lib/components/Avatar.svelte'
  import WeekCard from '$lib/components/WeekCard.svelte'
  import Leaderboard from '$lib/components/Leaderboard.svelte'
  import FriendDetail from '$lib/components/FriendDetail.svelte'
  import AddFriend from '$lib/components/AddFriend.svelte'
  import ProfileSheet from '$lib/components/ProfileSheet.svelte'
  import UsernameField from '$lib/components/UsernameField.svelte'
  import { TOUCH, TOUCH_SECONDARY, TOUCH_TEXT } from '$lib/components/friends-touch'
  import { PUSH_SERVER_URL } from '$lib/config'
  import { onMount } from 'svelte'
  import { toast } from '$lib/stores/ui'
  import { online } from '$lib/stores/network'
  import { registerUser, renameUser, syncUserToWorker, checkUserExists } from '$lib/push'
  import { getAllLogs, getSettings, getPrograms, saveSettings, getWeeklyGymSeconds } from '$lib/storage'
  import { computeStreakWeeks, computeBestStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { toLocalDateStr, mondayOf } from '$lib/calendar-utils'
  import { shareUsername } from '$lib/share'
  import { buildLeague, weekDays, weekProgress, weekPhrase, weekEyebrow, formatSavedAt, type FriendData } from '$lib/league'
  import type { ExerciseLog } from '$lib/types'

  const FRIENDS_CACHE_KEY = 'friends-cache'

  // Last friends list we got from the Worker, shown as-is while offline.
  function readFriendsCache(): { friends: FriendData[]; savedAt: number } | null {
    try {
      const raw = localStorage.getItem(FRIENDS_CACHE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function writeFriendsCache(list: FriendData[]) {
    try {
      localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({ friends: list, savedAt: Date.now() }))
    } catch {}
  }

  let username = $state('')
  let inputUsername = $state('')
  let friends = $state<FriendData[]>([])
  let initialLoading = $state(true)
  let loading = $state(true)
  let saving = $state(false)
  let registered = $state(true)
  let registering = $state(false)
  let removing = $state(false)
  let cachedAt = $state<number | null>(null)

  let today = $state(toLocalDateStr(new Date()))
  let logs = $state<ExerciseLog[]>([])
  let daysPerWeek = $state(0)
  let myStreak = $state(0)
  let bestStreak = $state(0)
  let myGymSeconds = $state(0)
  let exercisedToday = $state(false)

  let searchQuery = $state('')
  let searchResults = $state<FriendData[]>([])
  let searching = $state(false)
  let addingFriend = $state<string | null>(null)
  let searchSeq = 0
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  let profileOpen = $state(false)
  let addOpen = $state(false)
  let detailOpen = $state(false)
  let selectedUser = $state('')

  const league = $derived(buildLeague({ username, streak: myStreak, exercisedToday, gymTime: myGymSeconds }, friends, today))
  const friendCount = $derived(league.length - 1)
  const myMinutes = $derived(league.find((e) => e.isMe)?.minutes ?? 0)
  const inLeague = $derived(league.filter((e) => !e.isMe).map((e) => e.username))
  const selected = $derived(league.find((e) => e.username === selectedUser && !e.isMe) ?? null)
  const progress = $derived(weekProgress(logs, daysPerWeek, today))
  const phrase = $derived(weekPhrase({ streak: myStreak, best: bestStreak, progress, league, today }))

  onMount(async () => {
    const s = await getSettings()

    if (s.userName && !s.username) {
      s.username = s.userName
      await saveSettings(s)
    }

    username = s.username || ''
    initialLoading = false
    if (username) {
      await refreshRegistered()
      await loadLeague()
    } else {
      loading = false
    }
  })

  async function refreshRegistered() {
    if (!username || !PUSH_SERVER_URL) {
      registered = true
      return
    }
    registered = await checkUserExists(username)
  }

  // Everything the week card needs comes from this phone, never from the Worker.
  async function loadMyWeek() {
    const [allLogs, s, progs] = await Promise.all([getAllLogs(), getSettings(), getPrograms()])
    const activeProg = progs.find(p => p.id === s.activeProgramId)
    today = toLocalDateStr(new Date())
    logs = allLogs
    daysPerWeek = trainingDaysPerWeek(activeProg, s.currentWeekIdx || 0)
    myStreak = computeStreakWeeks(allLogs, daysPerWeek, today)
    bestStreak = computeBestStreakWeeks(allLogs, daysPerWeek, today)
    exercisedToday = allLogs.some(l => l.date === today && l.weight > 0)
    myGymSeconds = await getWeeklyGymSeconds(mondayOf(today))
  }

  function showCachedFriends() {
    const cache = readFriendsCache()
    friends = cache?.friends || []
    cachedAt = cache?.savedAt ?? null
  }

  async function loadFriends() {
    if (!PUSH_SERVER_URL) {
      friends = []
      return
    }
    try {
      const res = await fetch(`${PUSH_SERVER_URL}/api/friends/list?username=${encodeURIComponent(username)}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      friends = data.friends || []
      cachedAt = null
      writeFriendsCache(friends)
    } catch {
      showCachedFriends()
    }
  }

  async function loadLeague() {
    await loadMyWeek()
    // Push our own streak/today/weekly gym time so friends see real data.
    if (PUSH_SERVER_URL) syncUserToWorker(username, myStreak, exercisedToday, myGymSeconds).catch(() => {})
    await loadFriends()
    loading = false
  }

  async function saveUsername(val: string) {
    const s = await getSettings()
    s.username = val
    await saveSettings(s)
    username = val
  }

  // "Listo" registers right away. A name that already exists is accepted
  // (registerUser treats 409 as success): it is the only way to get your user
  // back after reinstalling.
  async function handleSubmitUsername() {
    const val = inputUsername.trim()
    if (val.length < 2 || saving) return
    saving = true
    loading = true
    try {
      await saveUsername(val)
      registered = !PUSH_SERVER_URL || await registerUser(val)
      await loadLeague()
    } finally {
      saving = false
      loading = false
    }
  }

  async function handleRename(newName: string): Promise<'ok' | 'taken' | 'error'> {
    const result = await renameUser(username, newName)
    if (result === 'error') toast.show('No se pudo cambiar el usuario', true)
    if (result !== 'ok') return result
    await saveUsername(newName)
    toast.show('Usuario actualizado')
    await loadLeague()
    return result
  }

  async function handleRegisterUser() {
    if (!username || registering) return
    registering = true
    try {
      if (await registerUser(username)) {
        registered = true
        toast.show('Usuario registrado')
      } else {
        toast.show('No se pudo registrar', true)
      }
    } finally {
      registering = false
    }
  }

  async function handleShare() {
    const result = await shareUsername(username)
    if (result === 'copied') toast.show('Copiado')
    if (result === 'failed') toast.show('No se pudo compartir', true)
  }

  function selectEntry(name: string) {
    if (name === username) {
      profileOpen = true
      return
    }
    selectedUser = name
    detailOpen = true
  }

  function closeAddFriend() {
    searchQuery = ''
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
      searchResults = (data.results || []).filter((r: FriendData) => r.username !== username)
    } catch {
      if (seq !== searchSeq) return
      searchResults = []
    } finally {
      if (seq === searchSeq) searching = false
    }
  }

  function postFriend(path: string, friendUsername: string): Promise<Response> {
    return fetch(`${PUSH_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, friendUsername }),
    })
  }

  // The sheet stays open after adding: the row just turns into "En tu liga".
  async function addFriend(friendUsername: string) {
    addingFriend = friendUsername
    try {
      const res = await postFriend('/api/friends/add', friendUsername)
      if (res.ok) {
        toast.show(`${friendUsername} está en tu liga`)
        await loadFriends()
      } else {
        const data = await res.json()
        toast.show(data.error || 'Error', true)
      }
    } catch {
      toast.show('No se pudo agregar', true)
    } finally {
      addingFriend = null
    }
  }

  // One-sided: it only leaves my league, theirs is untouched.
  async function removeFriend(friendUsername: string) {
    removing = true
    try {
      const res = await postFriend('/api/friends/remove', friendUsername)
      if (res.ok) {
        friends = friends.filter(f => f.username !== friendUsername)
        writeFriendsCache(friends)
        detailOpen = false
        toast.show(`${friendUsername} ya no está en tu liga`)
      } else {
        const data = await res.json()
        toast.show(data.error || 'Error', true)
      }
    } catch {
      toast.show('No se pudo quitar', true)
    } finally {
      removing = false
    }
  }
</script>

{#snippet addButton(primary: boolean)}
  <Button variant={primary ? 'primary' : 'secondary'} fullWidth style={primary ? TOUCH : TOUCH_SECONDARY} disabled={!$online} onclick={() => addOpen = true}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    Agregar amigo
  </Button>
{/snippet}

{#if initialLoading}
  <div class="page">
    <EmptyState id="friends-list" class="friends-empty" message="Cargando…" />
  </div>
{:else if !username}
  <!-- Field and button right under the text, in the top half: the iOS keyboard covers the rest. -->
  <div class="page first-time" id="username-prompt">
    <Avatar username={inputUsername.trim()} size={88} />
    <h1>Elige tu usuario</h1>
    <p>Así te encuentran tus amigos para ver quién entrena más cada semana.</p>
    <div class="first-form">
      <UsernameField id="username-input" bind:value={inputUsername} />
      <Button id="username-btn" variant="primary" fullWidth style={TOUCH} onclick={handleSubmitUsername} disabled={inputUsername.trim().length < 2 || saving}>Listo</Button>
    </div>
  </div>
{:else}
  <div class="page">
    <PageHeader eyebrow={weekEyebrow(today)} title="Amigos.">
      {#snippet action()}
        <button type="button" class="me-btn" aria-label="Mi perfil" onclick={() => profileOpen = true}>
          <Avatar {username} />
        </button>
      {/snippet}
    </PageHeader>

    <div class="body">
      {#if loading}
        <EmptyState id="friends-list" class="friends-empty" message="Cargando…" />
      {:else}
        <WeekCard
          streak={myStreak}
          done={progress.done}
          needed={progress.needed}
          minutes={myMinutes}
          days={weekDays(logs, today)}
          {phrase}
        />

        {#if friendCount === 0}
          <section class="empty" id="friends-list">
            <div class="slots">
              <Avatar {username} />
              <span class="slot"></span>
              <span class="slot"></span>
            </div>
            <h2>Entrena con tu gente</h2>
            <p>Agrega a tus amigos por su usuario y vean cada semana quién suma más minutos. No necesitan aceptar.</p>
            <div class="acts">
              {@render addButton(true)}
              {#if !$online}<p class="cap">Necesitas internet para agregar amigos.</p>{/if}
              <Button variant="text" fullWidth style={TOUCH_TEXT} onclick={handleShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v7h14v-7"/></svg>
                Compartir mi usuario
              </Button>
            </div>
          </section>
        {:else}
          <section class="league" id="friends-list">
            <Leaderboard
              {league}
              updated={cachedAt ? `Datos del ${formatSavedAt(cachedAt)}. Se actualizan al volver la conexión.` : ''}
              onselect={selectEntry}
            />
            <div class="add">
              {@render addButton(friendCount === 1)}
              {#if !$online}
                <p class="cap">Necesitas internet para agregar amigos.</p>
              {:else if friendCount === 1}
                <p class="cap">Con más amigos, la semana se pone más reñida.</p>
              {/if}
            </div>
          </section>
        {/if}
      {/if}
    </div>
  </div>

  <FriendDetail bind:open={detailOpen} friend={selected} {myMinutes} online={$online} {removing} onremove={removeFriend} />
  <AddFriend
    bind:open={addOpen}
    {username}
    query={searchQuery}
    {searching}
    results={searchResults}
    {addingFriend}
    {inLeague}
    onquery={(q) => searchQuery = q}
    onadd={addFriend}
    onshare={handleShare}
    onclose={closeAddFriend}
  />
  <ProfileSheet
    bind:open={profileOpen}
    {username}
    streak={myStreak}
    {friendCount}
    {registered}
    {registering}
    online={$online}
    onrename={handleRename}
    onregister={handleRegisterUser}
    onshare={handleShare}
  />
{/if}

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 8px 20px 0;
  }
  .me-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: none;
    cursor: pointer;
    touch-action: manipulation;
  }
  .league {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .add {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cap {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-tertiary);
    text-align: center;
    text-wrap: pretty;
  }
  .empty {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 28px 20px 20px;
    border-radius: var(--radius-2xl);
    border: 1px dashed rgba(255,255,255,0.12);
  }
  .empty h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.6px;
    line-height: 1.15;
    color: var(--text);
  }
  .empty p:not(.cap) {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
  .acts {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  .slots { display: flex; }
  .slots :global(.avatar) {
    box-shadow: 0 0 0 3px var(--bg);
    z-index: 1;
  }
  .slot {
    width: 40px;
    height: 40px;
    margin-left: -8px;
    border-radius: 50%;
    border: 1px dashed rgba(255,255,255,0.22);
    background: var(--bg);
  }
  .first-time {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: calc(48px + env(safe-area-inset-top, 0px)) 20px 120px;
    text-align: center;
  }
  .first-time h1 {
    margin: 24px 0 0;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.9px;
    color: var(--text);
  }
  .first-time p {
    max-width: 300px;
    margin: 10px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
  .first-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin-top: 28px;
  }
</style>
