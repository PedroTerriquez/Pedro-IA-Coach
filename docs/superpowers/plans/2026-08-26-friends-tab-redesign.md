# Friends Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the friends tab with profile management, leaderboard, search, and friend removal. Unify username concepts.

**Architecture:** New Worker endpoint for friend removal, new UsernameEditor and Leaderboard components, redesigned FriendCard, improved SearchInput/SearchResults, rewritten friends page, simplified You page header.

**Tech Stack:** Svelte 5 (runes), TypeScript, Cloudflare Workers, KV store

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `push-worker/src/index.js` | Modify | Add `/api/friends/remove` endpoint |
| `src/lib/components/UsernameEditor.svelte` | Create | Inline username editor with avatar |
| `src/lib/components/FriendCard.svelte` | Rewrite | Redesigned friend row with position, avatar, streak, remove |
| `src/lib/components/Leaderboard.svelte` | Create | Sorted friends list with ranking |
| `src/lib/components/SearchInput.svelte` | Modify | Add search icon, clear button, focus styles |
| `src/lib/components/SearchResults.svelte` | Modify | Add avatar, improve styling |
| `src/routes/friends/+page.svelte` | Rewrite | New page structure with all sections |
| `src/routes/you/+page.svelte` | Modify | Remove username header, simplify |

---

### Task 1: Worker — Add `/api/friends/remove` endpoint

**Files:**
- Modify: `push-worker/src/index.js`

- [ ] **Step 1: Add the remove endpoint handler**

After the `/api/friends/add` block (around line 525), add:

```javascript
if (url.pathname === '/api/friends/remove') {
  try {
    const { username, friendUsername } = await req.json()
    if (!username || !friendUsername) return respond({ error: 'username and friendUsername required' }, 400)
    const existingRaw = await env.PUSH_KV.get(`friends_${username}`)
    const friends = existingRaw ? JSON.parse(existingRaw) : []
    const idx = friends.findIndex(f => f.friendUsername === friendUsername)
    if (idx === -1) return respond({ error: 'No es tu amigo' }, 404)
    friends.splice(idx, 1)
    await env.PUSH_KV.put(`friends_${username}`, JSON.stringify(friends))
    return respond({ status: 'ok' })
  } catch (err) {
    return respond({ error: err.message }, 500)
  }
}
```

- [ ] **Step 2: Deploy the Worker**

```bash
cd push-worker && npx wrangler deploy
```

Expected: "Uploaded coach-pedro-ai" success message.

- [ ] **Step 3: Test with curl**

```bash
curl -s -X POST "https://coach-pedro-ai.pollothe.workers.dev/api/friends/remove" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","friendUsername":"test2"}'
```

Expected: `{"error":"No es tu amigo"}` (404) — confirms endpoint exists and runs.

- [ ] **Step 4: Commit**

```bash
git add push-worker/src/index.js
git commit -m "feat(worker): add /api/friends/remove endpoint"
```

---

### Task 2: Create `UsernameEditor.svelte`

**Files:**
- Create: `src/lib/components/UsernameEditor.svelte`

- [ ] **Step 1: Create the component**

```svelte
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
    if (val.length < 2 || val === username) {
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
      <button class="icon-btn" onclick={confirm} disabled={saving || draft.trim().length < 2} aria-label="Guardar">
        {#if saving}
          <span class="spinner"></span>
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        {/if}
      </button>
      <button class="icon-btn cancel" onclick={cancel} aria-label="Cancelar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  {:else}
    <div class="display-row">
      <span class="name-text">{username}</span>
      <button class="icon-btn" onclick={startEdit} aria-label="Editar nombre">
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
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors (only pre-existing warnings)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/UsernameEditor.svelte
git commit -m "feat: add UsernameEditor component"
```

---

### Task 3: Rewrite `FriendCard.svelte`

**Files:**
- Rewrite: `src/lib/components/FriendCard.svelte`

- [ ] **Step 1: Rewrite the component**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  let {
    username = '',
    streak = 0,
    exercisedToday = false,
    lastUpdate = '',
    position = 0,
    isMe = false,
    accent = 'var(--accent)',
    onremove = () => {}
  }: {
    username: string
    streak: number
    exercisedToday: boolean
    lastUpdate: string
    position: number
    isMe: boolean
    accent?: string
    onremove?: (username: string) => void
  } = $props()

  let confirmDelete = $state(false)

  const initial = $derived(username ? username[0].toUpperCase() : '?')
  const posLabel = $derived(position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}`)
  const posColor = $derived(position <= 3 ? accent : 'var(--text-muted)')

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
      {#if isMe}<span class="me-badge" style="background:{accent}18;color:{accent}">Yo</span>{/if}
    </div>
    <div class="streak-row">
      <span class="streak" style="color:{accent}">{streak} {streak === 1 ? 'sem' : 'sems'}</span>
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
  .friend-card.isMe {
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
  }
  .name {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
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
  .streak-row {
    margin-top: 2px;
  }
  .streak {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
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
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/FriendCard.svelte
git commit -m "feat: redesign FriendCard with position, avatar, streak, remove"
```

---

### Task 4: Create `Leaderboard.svelte`

**Files:**
- Create: `src/lib/components/Leaderboard.svelte`

- [ ] **Step 1: Create the component**

```svelte
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
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Leaderboard.svelte
git commit -m "feat: add Leaderboard component"
```

---

### Task 5: Improve `SearchInput.svelte`

**Files:**
- Modify: `src/lib/components/SearchInput.svelte`

- [ ] **Step 1: Rewrite with icon and clear button**

```svelte
<script lang="ts">
  let {
    value = '',
    placeholder = 'Buscar...',
    oninput = () => {},
    id = undefined
  }: {
    value?: string
    placeholder?: string
    oninput?: (val: string) => void
    id?: string
  } = $props()

  let inputEl: HTMLInputElement | null = null

  function clear() {
    oninput('')
    inputEl?.focus()
  }
</script>

<div class="search-wrap">
  <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  <input
    bind:this={inputEl}
    class="search-input"
    type="text"
    {value}
    {placeholder}
    {id}
    data-component="SearchInput"
    oninput={(e) => oninput((e.target as HTMLInputElement).value)}
  />
  {#if value.length > 0}
    <button class="clear-btn" onclick={clear} aria-label="Limpiar búsqueda">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  {/if}
</div>

<style>
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    pointer-events: none;
    flex-shrink: 0;
  }
  .search-input {
    width: 100%;
    padding: 10px 34px 10px 36px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .search-input:focus {
    border-color: rgba(255,255,255,0.18);
  }
  .clear-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .clear-btn:active {
    background: rgba(255,255,255,0.08);
  }
</style>
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SearchInput.svelte
git commit -m "feat: improve SearchInput with icon, clear button, focus styles"
```

---

### Task 6: Improve `SearchResults.svelte`

**Files:**
- Modify: `src/lib/components/SearchResults.svelte`

- [ ] **Step 1: Rewrite with avatar and improved styling**

```svelte
<script lang="ts">
  import Button from './Button.svelte'
  import EmptyState from './EmptyState.svelte'

  let {
    query = '',
    searching = false,
    results = [],
    addingFriend = null,
    accent = 'var(--accent)',
    onadd = undefined
  }: {
    query: string
    searching: boolean
    results: { username: string; streak: number }[]
    addingFriend: string | null
    accent?: string
    onadd?: (username: string) => void
  } = $props()

  let show = $derived(query.length >= 1 || searching || results.length > 0)
</script>

{#if show}
  <div class="search-results" data-component="SearchResults">
    {#if searching}
      <EmptyState message="Buscando..." style="padding:20px" />
    {:else if results.length === 0}
      <EmptyState message="No se encontraron usuarios" style="padding:20px" />
    {:else}
      {#each results as r (r.username)}
        <div class="sr-item">
          <div class="sr-avatar" style="background:{accent}20;color:{accent}">{r.username[0].toUpperCase()}</div>
          <div class="sr-info">
            <span class="sr-name">{r.username}</span>
            <span class="sr-streak">{r.streak} {r.streak === 1 ? 'sem' : 'sems'}</span>
          </div>
          <button
            class="add-btn"
            style="border-color:{accent};color:{accent}"
            onclick={() => onadd?.(r.username)}
            disabled={addingFriend === r.username}
          >
            {#if addingFriend === r.username}
              <span class="spinner"></span>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            {/if}
          </button>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .search-results {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sr-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
  }
  .sr-avatar {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }
  .sr-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .sr-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .sr-streak {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }
  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    border: 1.5px solid;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, opacity 0.15s;
  }
  .add-btn:active {
    background: rgba(255,255,255,0.06);
  }
  .add-btn:disabled {
    opacity: 0.4;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SearchResults.svelte
git commit -m "feat: improve SearchResults with avatar, streak, add button"
```

---

### Task 7: Rewrite `friends/+page.svelte`

**Files:**
- Rewrite: `src/routes/friends/+page.svelte`

- [ ] **Step 1: Rewrite the page**

```svelte
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
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/friends/+page.svelte
git commit -m "feat: rewrite friends page with profile, leaderboard, search"
```

---

### Task 8: Modify `you/+page.svelte` — Remove username header

**Files:**
- Modify: `src/routes/you/+page.svelte`

- [ ] **Step 1: Replace the page header**

Find and replace the `<div class="page-header">` block (lines 550-563):

**Before:**
```svelte
<div class="page-header">
  <div class="page-header-eyebrow">Perfil</div>
  <div class="page-header-title">
    <span id="user-name" class="username-field" contenteditable role="textbox" aria-multiline="false" tabindex="0" style="caret-color:{accent}"
      onblur={async (e) => { const v = (e.target as HTMLElement).textContent?.trim() || 'Pedro'; userName = v; await saveProfileField('userName', v) }}
      onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
    >{userName}</span>
    <button id="user-edit-btn" class="edit-btn" aria-label="Editar nombre"
      onclick={() => { const el = document.getElementById('user-name'); if (el) { el.focus(); const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range) } }}>
      <Icon name="pencil" size={22} color="rgba(255,255,255,0.3)" />
    </button>
  </div>
</div>
```

**After:**
```svelte
<div class="page-header">
  <div class="page-header-eyebrow">Tú</div>
  <div class="page-header-title">Tú</div>
</div>
```

- [ ] **Step 2: Type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/you/+page.svelte
git commit -m "feat: simplify You page header (username moved to Friends)"
```

---

### Task 9: Version bump, build, deploy Worker, push

**Files:**
- Modify: `src/lib/pwa.ts` (version bump)

- [ ] **Step 1: Bump version**

```bash
bash scripts/bump-version.sh
```

- [ ] **Step 2: Update version description**

Edit `src/lib/pwa.ts` to set `_VER_DESC` to something like:
```
feat: redesigned friends tab with profile, leaderboard, remove
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: "✓ built in Xs" success

- [ ] **Step 4: Deploy Worker**

```bash
cd push-worker && npx wrangler deploy
```

Expected: "Uploaded coach-pedro-ai" success

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: friends tab redesign v2.42"
git push
```

- [ ] **Step 6: Run E2E tests**

Run: `npx playwright test`
Expected: Tests pass (or pre-existing failures only)
