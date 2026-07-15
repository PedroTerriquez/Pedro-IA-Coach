# Amigos (Friends) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th "Amigos" tab with username setup, friend search/add, and streak sharing via the existing Cloudflare Worker.

**Architecture:** Ping-based relay — app computes streak from exerciseLogs locally, POSTs to Worker on each exercise log. Friend list fetches from Worker. KV stores user data and friend relationships.

**Tech Stack:** Vanilla JS + IndexedDB (app), Cloudflare Worker + KV (backend), Playwright (tests)

---

### Task 1: Storage — add `username` to settings defaults

**Files:**
- Modify: `storage.js:306`

- [ ] **Add `username` field to default settings**

In `storage.js`, add `username: ''` to the default settings object on line 306:

```js
// Before (line 306):
return s || { id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg', accentColor: '#d4ff3a', userName: 'Pedro', height: '', weight: '', sex: '', age: '', goal: '', experience: '', occupation: '', pushServerUrl: '', pushSubscribed: false, hasWatch: false, lastCoachAnalysis: null, lastUpdate: '', sessionState: null, rescheduleWeekOrder: {} }
// After:
return s || { id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg', accentColor: '#d4ff3a', userName: 'Pedro', height: '', weight: '', sex: '', age: '', goal: '', experience: '', occupation: '', pushServerUrl: '', pushSubscribed: false, hasWatch: false, lastCoachAnalysis: null, lastUpdate: '', sessionState: null, rescheduleWeekOrder: {}, username: '' }
```

---

### Task 2: Worker — add 5 new endpoints for friends/streak

**Files:**
- Modify: `push-worker/src/index.js`

- [ ] **Add `POST /api/user/register`, `POST /api/user/sync`, `GET /api/friends/search`, `POST /api/friends/add`, `GET /api/friends/list`**

Add after the `/api/rest-timer/cancel` handler (before the `/api/rest-timer/start` handler, around line 409):

```js
    // ── User & Friends endpoints ──

    if (url.pathname === '/api/user/register') {
      try {
        const { username } = await req.json()
        if (!username || username.length < 2) return respond({ error: 'Username must be at least 2 characters' }, 400)
        const existing = await env.PUSH_KV.get(`user_${username}`)
        if (existing) return respond({ error: 'Nombre de usuario ya registrado' }, 409)
        await env.PUSH_KV.put(`user_${username}`, JSON.stringify({ username, streak: 0, exercisedToday: false, lastExerciseDate: '', lastUpdate: new Date().toISOString() }))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/user/sync') {
      try {
        const { username, streak, exercisedToday } = await req.json()
        if (!username) return respond({ error: 'username required' }, 400)
        const raw = await env.PUSH_KV.get(`user_${username}`)
        const data = raw ? JSON.parse(raw) : { username }
        data.streak = streak ?? data.streak ?? 0
        data.exercisedToday = exercisedToday ?? data.exercisedToday ?? false
        data.lastExerciseDate = exercisedToday ? new Date().toISOString().slice(0, 10) : data.lastExerciseDate
        data.lastUpdate = new Date().toISOString()
        await env.PUSH_KV.put(`user_${username}`, JSON.stringify(data))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/search') {
      try {
        const q = url.searchParams.get('q') || ''
        if (q.length < 1) return respond({ results: [] })
        // List from usernames set — simplified: search all keys with prefix "user_"
        // In production, maintain a usernames set. For simplicity, search by prefix.
        const all = await env.PUSH_KV.list({ prefix: 'user_' })
        const results = []
        for (const key of all.keys) {
          const raw = await env.PUSH_KV.get(key.name)
          if (!raw) continue
          const u = JSON.parse(raw)
          if (u.username.toLowerCase().includes(q.toLowerCase())) {
            results.push({ username: u.username, streak: u.streak, exercisedToday: u.exercisedToday })
          }
        }
        return respond({ results })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/add') {
      try {
        const { username, friendUsername } = await req.json()
        if (!username || !friendUsername) return respond({ error: 'username and friendUsername required' }, 400)
        if (username === friendUsername) return respond({ error: 'No puedes agregarte a ti mismo' }, 400)
        const friendRaw = await env.PUSH_KV.get(`user_${friendUsername}`)
        if (!friendRaw) return respond({ error: 'Usuario no encontrado' }, 404)
        const existingRaw = await env.PUSH_KV.get(`friends_${username}`)
        const friends = existingRaw ? JSON.parse(existingRaw) : []
        if (friends.some(f => f.friendUsername === friendUsername)) return respond({ error: 'Ya es tu amigo' }, 409)
        friends.push({ friendUsername, addedAt: new Date().toISOString() })
        await env.PUSH_KV.put(`friends_${username}`, JSON.stringify(friends))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/list') {
      try {
        const username = url.searchParams.get('username')
        if (!username) return respond({ error: 'username required' }, 400)
        const rawFriends = await env.PUSH_KV.get(`friends_${username}`)
        const friendUsernames = rawFriends ? JSON.parse(rawFriends) : []
        const friends = []
        for (const f of friendUsernames) {
          const raw = await env.PUSH_KV.get(`user_${f.friendUsername}`)
          if (raw) {
            const u = JSON.parse(raw)
            friends.push({ username: u.username, streak: u.streak, exercisedToday: u.exercisedToday, lastUpdate: u.lastUpdate })
          }
        }
        return respond({ friends })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }
```

Also update the CORS headers on line 2 to include GET:
```js
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
```

And on line 229, change the method check from `req.method !== 'POST'` to allow GET:
```js
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }
```

- [ ] **Commit**

```bash
git add push-worker/src/index.js storage.js
git commit -m "feat: add storage.username and Worker friends endpoints"
```

---

### Task 3: Tab bar — add 5th "Amigos" tab with icon

**Files:**
- Modify: `components/ui.js`

- [ ] **Add TabIconFriends + 5th tab entry**

Add after `TabIconUser` (line 112):

```js
function TabIconFriends({ active }) {
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="2.8" stroke="currentColor" stroke-width="1.6" fill="${active ? 'currentColor' : 'none'}" fill-opacity="${active ? 0.15 : 0}"/><circle cx="14" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5" fill="${active ? 'currentColor' : 'none'}" fill-opacity="${active ? 0.15 : 0}"/><path d="M3 15.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 14.5c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
}
```

In `TabBar`, add the 5th tab before 'you' in the tabs array (line 81):

```js
  const tabs = [
    { id: 'today', label: 'Hoy', icon: TabIconHome },
    { id: 'plan', label: 'Plan', icon: TabIconCal },
    { id: 'history', label: 'Historial', icon: TabIconChart },
    { id: 'friends', label: 'Amigos', icon: TabIconFriends },
    { id: 'you', label: 'Tú', icon: TabIconUser },
  ]
```

- [ ] **Commit**

```bash
git add components/ui.js
git commit -m "feat: add Amigos tab with friends icon"
```

---

### Task 4: styles.css — friends screen styles

**Files:**
- Modify: `styles.css`

- [ ] **Add friends-specific CSS**

Append at the end of `styles.css`:

```css
/* ── Friends Screen ── */
.friends-view {
  padding: 20px 16px 100px;
}

.friends-header {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #fafafa;
  letter-spacing: -0.8px;
  margin-bottom: 8px;
}

.friends-my-streak {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent, #d4ff3a);
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.06);
}

/* Username prompt */
.username-prompt {
  text-align: center;
  padding: 40px 20px;
}

.username-prompt h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #fafafa;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.username-prompt p {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 24px;
  line-height: 1.4;
}

.username-prompt input {
  width: 100%;
  max-width: 280px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #fafafa;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.username-prompt input:focus {
  border-color: var(--accent, #d4ff3a);
}

.username-prompt .btn-primary {
  padding: 12px 32px;
  border-radius: 12px;
  border: 0;
  background: var(--accent, #d4ff3a);
  color: #0a0a0a;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.username-prompt .btn-primary:disabled {
  opacity: 0.4;
  cursor: default;
}

.username-prompt .error-msg {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 8px;
}

/* Friend list */
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.friend-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.02);
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.06);
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #fafafa;
  flex-shrink: 0;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #fafafa;
  letter-spacing: -0.3px;
}

.friend-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin-top: 2px;
}

.friend-streak {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 500;
  color: var(--accent, #d4ff3a);
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

.friend-streak .unit {
  font-size: 9px;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin-left: 2px;
}

/* Search bar */
.friend-search {
  position: relative;
  margin-top: 4px;
}

.friend-search input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: #fafafa;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  box-sizing: border-box;
}

.friend-search input:focus {
  border-color: var(--accent, #d4ff3a);
}

.friend-search input::placeholder {
  color: rgba(255,255,255,0.3);
}

/* Search results */
.search-results {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  border: 0.5px solid rgba(255,255,255,0.06);
}

.search-result-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-result-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #fafafa;
}

.search-result-streak {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--accent, #d4ff3a);
}

.search-result-add {
  padding: 6px 16px;
  border-radius: 8px;
  border: 0;
  background: var(--accent, #d4ff3a);
  color: #0a0a0a;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.search-result-add:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Empty state */
.friends-empty {
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
  color: rgba(255,255,255,0.35);
  line-height: 1.5;
}
```

- [ ] **Commit**

```bash
git add styles.css
git commit -m "feat: friends screen styles"
```

---

### Task 5: views/friends.js — create the Friends screen

**Files:**
- Create: `views/friends.js`

- [ ] **Create the friends view**

```js
// ── Friends Screen ──

function mountFriends(container, { accent, settings, refresh, computeStreak, allLogs, syncStreak }) {
  container.innerHTML = ''
  const username = settings.username || ''

  if (!username) {
    renderUsernamePrompt(container, { accent, refresh })
    return
  }

  const streak = computeStreak(allLogs)
  const today = new Date().toISOString().slice(0, 10)
  const exercisedToday = allLogs.some(l => l.date === today && l.weight > 0)

  const view = document.createElement('div')
  view.className = 'friends-view'

  view.innerHTML = `
    <div class="friends-header">👥 Amigos</div>
    <div class="friends-my-streak">🔥 Tu racha: <strong>${streak}</strong> ${streak === 1 ? 'día' : 'días'} ${exercisedToday ? '· Hoy ✅' : ''}</div>
    <div class="friends-list" id="friends-list"></div>
    <div class="friend-search">
      <input type="text" id="friend-search-input" placeholder="🔍 Buscar usuario..." autocomplete="off">
    </div>
    <div class="search-results" id="search-results"></div>
  `

  container.appendChild(view)

  loadFriends(username, accent)

  document.getElementById('friend-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim()
    if (q.length < 1) {
      document.getElementById('search-results').innerHTML = ''
      return
    }
    searchUsers(q, username, accent)
  })
}

function renderUsernamePrompt(container, { accent, refresh }) {
  const prompt = document.createElement('div')
  prompt.className = 'username-prompt'
  prompt.id = 'username-prompt'

  prompt.innerHTML = `
    <h2>👋 Bienvenido a Amigos</h2>
    <p>Elige un nombre de usuario para compartir tu racha con amigos.</p>
    <input type="text" id="username-input" placeholder="tu_usuario" maxlength="20" autocomplete="off">
    <div class="error-msg" id="username-error" style="display:none"></div>
    <button class="btn-primary" id="username-btn" disabled>Listo</button>
  `

  container.appendChild(prompt)

  const input = document.getElementById('username-input')
  const btn = document.getElementById('username-btn')
  const errorEl = document.getElementById('username-error')

  input.addEventListener('input', () => {
    btn.disabled = input.value.trim().length < 2
    errorEl.style.display = 'none'
  })

  btn.addEventListener('click', async () => {
    const username = input.value.trim()
    if (username.length < 2) return
    btn.disabled = true
    btn.textContent = 'Registrando...'
    errorEl.style.display = 'none'

    try {
      if (!PUSH_SERVER_URL) {
        errorEl.textContent = 'PUSH_SERVER_URL no configurado'
        errorEl.style.display = 'block'
        btn.disabled = false
        btn.textContent = 'Listo'
        return
      }
      const res = await fetch(`${PUSH_SERVER_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) {
        errorEl.textContent = data.error || 'Error al registrar'
        errorEl.style.display = 'block'
        btn.disabled = false
        btn.textContent = 'Listo'
        return
      }
      const s = await Storage.getSettings()
      s.username = username
      await Storage.saveSettings(s)
      if (typeof refresh === 'function') refresh()
    } catch (e) {
      errorEl.textContent = 'Error de red: ' + e.message
      errorEl.style.display = 'block'
      btn.disabled = false
      btn.textContent = 'Listo'
    }
  })
}

async function loadFriends(username, accent) {
  const listEl = document.getElementById('friends-list')
  if (!listEl) return

  listEl.innerHTML = '<div class="friends-empty">Cargando amigos...</div>'

  try {
    if (!PUSH_SERVER_URL) {
      listEl.innerHTML = '<div class="friends-empty">Configura PUSH_SERVER_URL</div>'
      return
    }
    const res = await fetch(`${PUSH_SERVER_URL}/api/friends/list?username=${encodeURIComponent(username)}`)
    const data = await res.json()
    const friends = data.friends || []

    if (friends.length === 0) {
      listEl.innerHTML = '<div class="friends-empty">Aún no tienes amigos. Busca y agrega amigos arriba. 👆</div>'
      return
    }

    listEl.innerHTML = ''
    for (const f of friends) {
      const card = document.createElement('div')
      card.className = 'friend-card'
      const initial = f.username.charAt(0).toUpperCase()
      const today = new Date().toISOString().slice(0, 10)
      const status = f.exercisedToday ? 'Hoy ✅' : (f.lastUpdate ? 'Inactivo' : '—')
      card.innerHTML = `
        <div class="friend-avatar">${initial}</div>
        <div class="friend-info">
          <div class="friend-name">${f.username}</div>
          <div class="friend-status">${status}</div>
        </div>
        <div class="friend-streak">${f.streak}<span class="unit">${f.streak === 1 ? 'día' : 'días'}</span></div>
      `
      listEl.appendChild(card)
    }
  } catch (e) {
    listEl.innerHTML = '<div class="friends-empty">Error al cargar amigos. Verifica tu conexión.</div>'
  }
}

async function searchUsers(q, currentUsername, accent) {
  const resultsEl = document.getElementById('search-results')
  if (!resultsEl) return

  resultsEl.innerHTML = '<div class="friends-empty">Buscando...</div>'

  try {
    if (!PUSH_SERVER_URL) return
    const res = await fetch(`${PUSH_SERVER_URL}/api/friends/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    const results = (data.results || []).filter(r => r.username !== currentUsername)

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="friends-empty">No se encontraron usuarios</div>'
      return
    }

    resultsEl.innerHTML = ''
    for (const r of results) {
      const item = document.createElement('div')
      item.className = 'search-result-item'
      item.innerHTML = `
        <div class="search-result-info">
          <span class="search-result-name">${r.username}</span>
          <span class="search-result-streak">${r.streak} ${r.streak === 1 ? 'día' : 'días'}</span>
        </div>
        <button class="search-result-add" data-friend="${r.username}">Agregar</button>
      `
      const btn = item.querySelector('.search-result-add')
      btn.addEventListener('click', async () => {
        btn.disabled = true
        btn.textContent = '...'
        try {
          const res = await fetch(`${PUSH_SERVER_URL}/api/friends/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername, friendUsername: r.username }),
          })
          if (res.ok) {
            btn.textContent = '✓ Agregado'
            document.getElementById('friend-search-input').value = ''
            resultsEl.innerHTML = ''
            loadFriends(currentUsername, accent)
          } else {
            const data = await res.json()
            btn.textContent = data.error || 'Error'
            setTimeout(() => { btn.disabled = false; btn.textContent = 'Agregar' }, 2000)
          }
        } catch {
          btn.textContent = 'Error'
          setTimeout(() => { btn.disabled = false; btn.textContent = 'Agregar' }, 2000)
        }
      })
      resultsEl.appendChild(item)
    }
  } catch {
    resultsEl.innerHTML = '<div class="friends-empty">Error al buscar</div>'
  }
}
```

- [ ] **Commit**

```bash
git add views/friends.js
git commit -m "feat: create friends screen with username prompt, search, add, and streak list"
```

---

### Task 6: app.js — 5th tab route, streak computation, sync

**Files:**
- Modify: `app.js`

- [ ] **Add computeStreak, prevDay helpers, and syncStreak function**

Add after `getTodayDayIndex()` (after line 265):

```js
function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function computeStreak(logs) {
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse()
  if (dates.length === 0) return 0
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let expected = today
  for (const date of dates) {
    if (date === expected) { streak++; expected = prevDay(expected) }
    else break
  }
  return streak
}

async function syncStreak() {
  const settings = await Storage.getSettings()
  const username = settings.username
  if (!username || !PUSH_SERVER_URL) return
  const logs = await Storage.getAllLogs()
  const streak = computeStreak(logs)
  const today = new Date().toISOString().slice(0, 10)
  const exercisedToday = logs.some(l => l.date === today && l.weight > 0)
  try {
    await fetch(`${PUSH_SERVER_URL}/api/user/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, streak, exercisedToday }),
    })
  } catch (e) {
    console.warn('syncStreak failed:', e)
  }
}
```

- [ ] **Load exerciseLogs into _state in loadState()**

In `loadState()` (line 115), add `Storage.getAllLogs()` call after loading exercises:

```js
async function loadState() {
  _state.settings = await Storage.getSettings()
  _state.programs = await Storage.getPrograms()
  _state.exercises = await Storage.getExercises()
  _state.exerciseLogs = await Storage.getAllLogs()  // ← ADD THIS
  _state.activeProgram = _state.settings.activeProgramId
    ? _state.programs.find((p) => p.id === _state.settings.activeProgramId)
    : _state.programs[0] || null
  handleRoute()
}
```

Also add in `refresh()` (after line 394):

```js
  _state.exerciseLogs = await Storage.getAllLogs()
```

- [ ] **Add '#friends' route case in renderScreen()**

Add before `default` case in the switch statement (before line 248):

```js
    case 'friends':
      mountFriends(_screenContainer, {
        accent,
        settings: _state.settings,
        onRefresh: refresh,
        computeStreak,
        allLogs: _state.exerciseLogs,
        syncStreak,
      })
      break
```

- [ ] **Add syncStreak call after exercise log**

In `openDetailSheet()`, in the `onLog` callback (line 376), after the log is saved:

Wait, looking at the existing onLog callback more carefully:

```js
onLog: async (exerciseId, weight, sets, reps) => {
  const savedUnits = _state.settings?.units || 'kg'
  const log = await Storage.logWeight(exerciseId, weight, savedUnits, sets, reps)
  return log ? { id: log, exerciseId, date: getToday(), weight, units: savedUnits, sets, reps } : null
},
```

The ExerciseDetail's onLog fires on weight log. But I don't want to block on syncStreak there (it's a fire-and-forget). And I also need to handle the case where data is saved but syncStreak hasn't been called yet.

Actually, let me think about this differently. `syncStreak()` should be called:
1. After a weight is logged (in the exercise detail sheet)
2. On app init (to catch missed syncs)
3. When mounting the friends screen (to ensure fresh data)

For option 1, the cleanest way is to call it from within `openDetailSheet`'s `onLog` callback as a fire-and-forget after the log is saved. But `onLog` just returns the log entry — it doesn't do anything else. The refresh happens when the sheet closes.

Let me add it after the refresh in the `onClose` callback. When the detail sheet closes:

```js
onClose: () => {
  _state.sheetOpen = false
  window.location.hash = _state.route
  refresh()
  syncStreak()  // fire-and-forget
},
```

Actually, a better approach: add it right in the onLog callback since that's the exact moment we know they exercised. The onLog fires when the user clicks "Registrar".

Let me modify `onLog`:

```js
onLog: async (exerciseId, weight, sets, reps) => {
  const savedUnits = _state.settings?.units || 'kg'
  const log = await Storage.logWeight(exerciseId, weight, savedUnits, sets, reps)
  // Fire-and-forget: sync streak to Worker
  syncStreak()
  return log ? { id: log, exerciseId, date: getToday(), weight, units: savedUnits, sets, reps } : null
},
```

This way, every time they log weight, it fires syncStreak in the background.

Also call it on init (in the `init()` function, after loading state and rendering shell):

Actually, I think the best place is after `renderShell()` + `handleRoute()` in init. But init already calls `loadState()` which calls `handleRoute()`. And `handleRoute()` calls `renderScreen()`. So after `renderShell()` and the event listeners... hmm.

Let me add it after the visibilitychange/focus handlers (before the closing `}` of init):

```js
  // Sync streak on init (catch missed pings)
  syncStreak()
```

And also call it when mounting the friends screen for freshness:

In the `mountFriends` call, I already pass `syncStreak` as a prop. Let me call it before rendering:

Actually no, the `mountFriends` function is a UI rendering function. Let me just call `syncStreak()` in the app.js route handler before mounting the friends view.

Wait, `syncStreak()` is async and doesn't block. Let me just ensure it's called on init (to catch any missed pings from offline exercise sessions).

- [ ] **Wire syncStreak into openDetailSheet's onLog**

In `openDetailSheet` (line 376), add `syncStreak()` call after `Storage.logWeight`:

```js
        onLog: async (exerciseId, weight, sets, reps) => {
          const savedUnits = _state.settings?.units || 'kg'
          const log = await Storage.logWeight(exerciseId, weight, savedUnits, sets, reps)
          syncStreak()
          return log ? { id: log, exerciseId, date: getToday(), weight, units: savedUnits, sets, reps } : null
        },
```

- [ ] **Call syncStreak on app init**

After the focus event listener (after line 112, before closing `}` of `init()`):

```js
  // Sync streak to Worker on init (catch missed pings)
  syncStreak()
```

- [ ] **Commit**

```bash
git add app.js
git commit -m "feat: add computeStreak, syncStreak, friends route, and sync on log"
```

---

### Task 7: index.html — add friends.js script tag

**Files:**
- Modify: `index.html`

- [ ] **Add script tag for friends.js**

After `views/you.js` (line 36), add:

```html
  <script src="views/friends.js"></script>
```

- [ ] **Commit**

```bash
git add index.html
git commit -m "chore: load friends.js"
```

---

### Task 8: tests/flow.spec.js — update mock + add friends scenarios

**Files:**
- Modify: `tests/flow.spec.js`

- [ ] **Update blanket Worker mock to route by URL path**

Replace the existing blanket mock (lines 149-161):

```js
  // Before:
  await page.route('**/*.workers.dev/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: '¡Excelente sesión, TestUser! Trabajaste con buena intensidad en press banca. Sigue así y no olvides descansar bien.',
        verdict: 'positive',
        _topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })

  // After:
  await page.route('**/*.workers.dev/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/api/user/register')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/user/sync')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/friends/search')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ username: 'Ana', streak: 12, exercisedToday: true }] }) })
    }
    if (url.includes('/api/friends/add')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/friends/list')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [{ username: 'Ana', streak: 12, exercisedToday: true, lastUpdate: new Date().toISOString() }] }) })
    }
    // Default: coach AI response (existing)
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: '¡Excelente sesión, TestUser! Trabajaste con buena intensidad en press banca. Sigue así y no olvides descansar bien.',
        verdict: 'positive',
        _topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })
```

- [ ] **Add friends test scenarios after Step 9 (after line 348)**

Add before the closing `})` of the test:

```js
  // ── Step 10: Friends — Navigate to Amigos Tab ──
  await page.evaluate(() => { location.hash = '#friends' })
  await page.waitForTimeout(500)

  // First visit shows username prompt
  await expect(page.locator('#username-prompt')).toBeVisible()
  await expect(page.locator('#username-prompt')).toContainText('Bienvenido')

  // ── Step 11: Set Username ──
  const usernameInput = page.locator('#username-input')
  await expect(usernameInput).toBeVisible()
  await usernameInput.fill('TestUser')

  const listoBtn = page.locator('#username-btn')
  await expect(listoBtn).toBeEnabled()
  await listoBtn.click()
  await page.waitForTimeout(1000)

  // Prompt disappears, main view shows
  await expect(page.locator('#username-prompt')).not.toBeVisible()
  await expect(page.locator('.friends-my-streak')).toContainText('racha')

  // ── Step 12: Search for Friend ──
  const searchInput = page.locator('#friend-search-input')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('Ana')
  await page.waitForTimeout(500)

  // Search result shows mock friend
  const searchResult = page.locator('.search-result-item')
  await expect(searchResult).toBeVisible()
  await expect(searchResult).toContainText('Ana')

  // ── Step 13: Add Friend ──
  const addBtn = page.locator('.search-result-add')
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  await page.waitForTimeout(500)

  // Verify friend appears in list
  await expect(page.locator('#friends-list')).toContainText('Ana')

  // ── Step 14: Verify Friend Streak Display ──
  const friendCard = page.locator('.friend-card')
  await expect(friendCard).toBeVisible()
  await expect(friendCard).toContainText('12')
  await expect(friendCard).toContainText('Hoy')
```

Also update the test title to reflect the new scenarios:

```js
// Before (line 133):
test('full user flow: profile → warmup → week switch → training → stretch → coach → history', async ({ page }) => {

// After:
test('full user flow: profile → warmup → week switch → training → stretch → coach → history → friends', async ({ page }) => {
```

- [ ] **Commit**

```bash
git add tests/flow.spec.js
git commit -m "test: add friends scenarios to flow.spec.js"
```

---

### Task 9: Version bump, full test run, commit, push

**Files:**
- Modify: `app.js` (APP_VERSION)
- Modify: `sw.js` (CACHE)

- [ ] **Update APP_VERSION in app.js and CACHE in sw.js**

In `app.js` line 4, update the version:

```js
const APP_VERSION = 'v1.82 · 2026-06-17 · Amigos: 5th tab with username, friend search/add, streak sharing'
```

In `sw.js`, update `CACHE` to match minor version (v1.82 → CACHE v82).

- [ ] **Run tests**

```bash
npm test
```
Expected: All 5 tests pass (4 notification tests + 1 flow test with new friends scenarios).

- [ ] **If tests fail, fix and re-run**

- [ ] **Commit and push**

```bash
git add -A
git commit -m "v1.82 · Amigos: 5th tab with username, friend search/add, streak sharing"
git push
```
