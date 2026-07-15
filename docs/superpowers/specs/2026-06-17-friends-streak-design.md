# Amigos (Friends) — Streak Sharing

## Problem

The app is entirely local — no way to share progress with friends. Users want
to see each other's streaks (consecutive days exercising) as motivation and
accountability.

## Solution

Add a 5th "Amigos" tab where users:
1. Set a username (first-visit prompt, stored in settings)
2. See their own streak: "Tu racha: 15 días 🔥"
3. Search for friends by username → add them (no approval needed)
4. See each friend's name + streak + whether they exercised today (✅/❌)

Data sharing via the existing Cloudflare Worker — no login, no database.
App pings Worker with streak on each exercise; friend list fetches from Worker.

## Architecture

```
User exercises → computeStreak() from exerciseLogs
                      ↓
                POST /api/user/sync { username, streak, exercisedToday }
                      ↓
                Worker stores in KV: user:{username} → { streak, exercisedToday }

User opens Amigos → GET /api/friends/list?username=X
                      ↓
                Worker looks up friends{username} → user records for each friend
                      ↓
                Returns [{ username, streak, exercisedToday, lastUpdate }]
```

### KV Schema

- `user:{username}` → `{ streak, exercisedToday, lastExerciseDate, lastUpdate }`
- `friends:{username}` → `[{ friendUsername, addedAt }]`
- `usernames` → Set of all registered usernames (uniqueness check)

### Streak Computation (client-side)

```js
function computeStreak(logs) {
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse()
  let streak = 0
  let expected = today() // YYYY-MM-DD
  for (const date of dates) {
    if (date === expected) { streak++; expected = prevDay(expected) }
    else break
  }
  return streak
}
```

### Worker Endpoints

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/user/register` | POST | `{ username }` | `{ status: 'ok' }` or `{ error: 'already taken' }` |
| `/api/user/sync` | POST | `{ username, streak, exercisedToday }` | `{ status: 'ok' }` |
| `/api/friends/search` | GET | `?q=partial` | `{ results: [{ username, streak, exercisedToday }] }` |
| `/api/friends/add` | POST | `{ username, friendUsername }` | `{ status: 'ok' }` |
| `/api/friends/list` | GET | `?username=X` | `{ friends: [{ username, streak, exercisedToday, lastUpdate }] }` |

## UI Design

### New Tab: Amigos (5th tab)

Tab bar becomes: Hoy | Plan | Historial | Amigos | Tú

Tab icon: 👥

### First Visit — Username Prompt

```
┌──────────────────────────────┐
│   👥 Amigos                  │
│                              │
│   ┌──────────────────────┐   │
│   │  Elige tu nombre de  │   │
│   │  usuario             │   │
│   │                      │   │
│   │  ┌────────────────┐  │   │
│   │  │ tu_usuario     │  │   │
│   │  └────────────────┘  │   │
│   │                      │   │
│   │  [ Listo ]           │   │
│   └──────────────────────┘   │
└──────────────────────────────┘
```

### Main View (after username set)

```
┌──────────────────────────────┐
│   👥 Amigos                  │
│                              │
│   Tu racha: 15 días 🔥       │
│                              │
│   ┌──────────────────────┐   │
│   │  A  Ana · 12 días   │   │
│   │     Hoy ✅           │   │
│   ├──────────────────────┤   │
│   │  C  Carlos · 8 días  │   │
│   │     Ayer ✅           │   │
│   ├──────────────────────┤   │
│   │  L  Luis · 0 días   │   │
│   │     Inactivo ❌      │   │
│   └──────────────────────┘   │
│                              │
│   ┌──────────────────────┐   │
│   │  🔍 Buscar usuario   │   │
│   └──────────────────────┘   │
└──────────────────────────────┘
```

### Search Results

When user types, results appear below the search bar as a list of selectable items.
Tap "Agregar" → friend added to list.

## Files Modified / Created

| File | Action | Change |
|---|---|---|
| `views/friends.js` | CREATE | Friends screen: username prompt, friend list, search, add |
| `app.js` | MODIFY | Add '#friends' route, 5th tab in shell, import friends.js |
| `storage.js` | MODIFY | Add `username` to default settings |
| `styles.css` | MODIFY | Friends-specific styles |
| `push-worker/src/index.js` | MODIFY | 5 new endpoints for user/friends CRUD |

## Data Flow per Action

### First Visit → Set Username
1. User enters username → `POST /api/user/register { username }`
2. Worker checks `usernames` set in KV — if taken, return error
3. If available: store `user:{username}` initial record, add to `usernames` set
4. App saves `username` to settings in IndexedDB
5. Friends view re-renders with main view

### User Exercises (logs weight)
1. On log weight → `computeStreak(exerciseLogs)` → get current streak
2. `POST /api/user/sync { username, streak, exercisedToday: true }`
3. Worker updates `user:{username}` in KV
4. Also fires on app init (catch missed pings)

### User Opens Amigos Tab
1. Read `username` from settings
2. `GET /api/friends/list?username=X` → returns friends with streaks
3. Render friend list
4. Also display own streak (computed locally)

### Add Friend
1. User types partial name → `GET /api/friends/search?q=partial`
2. Results shown below search bar
3. Tap "Agregar" → `POST /api/friends/add { username, friendUsername }`
4. Worker adds to `friends:{username}` array
5. Refresh friend list

## Edge Cases

| Case | Handling |
|---|---|
| No network on exercise log | Streak ping silently fails — next open re-syncs |
| No network on Amigos open | Show cached friend list (from last successful fetch in memory) or empty state |
| Username taken | Show error inline below input |
| Friend edits exercise logs (streak changes) | Automatically reflected — next sync pushes new streak |
| User never exercises | Streak is 0, shown as "0 días" |
| Friend not found on search | Empty results text |
| Self-add | Ignored / not allowed |

## Test Scenarios (flow.spec.js)

### Mock Changes

The existing blanket `page.route('**/*.workers.dev/**')` must become smarter —
route by URL path to return appropriate mock responses for each endpoint:

```
await page.route('**/*.workers.dev/**', async (route) => {
  const url = route.request().url()
  if (url.includes('/api/user/register'))
    return route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
  if (url.includes('/api/user/sync'))
    return route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
  if (url.includes('/api/friends/search'))
    return route.fulfill({ status: 200, body: JSON.stringify({ results: [{ username: 'Ana', streak: 12, exercisedToday: true }] }) })
  if (url.includes('/api/friends/add'))
    return route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) })
  if (url.includes('/api/friends/list'))
    return route.fulfill({ status: 200, body: JSON.stringify({ friends: [{ username: 'Ana', streak: 12, exercisedToday: true, lastUpdate: new Date().toISOString() }] }) })
  // Default: coach AI response (existing)
  route.fulfill({ ... existing coach mock ... })
})
```

### Scenarios to Add

Insert after Step 9 (History Verification) or after Step 1 (Profile) —
Friends is independent of the workout flow. Recommend: after History (end of test).

**Step 10: Friends — Navigate to Amigos Tab**
- `location.hash = '#friends'`
- Wait for render
- Verify username prompt is visible (first visit)

**Step 11: Set Username**
- Type into username input
- Click "Listo" button
- Verify prompt disappears, main view shows own streak
- Verify `settings.username` was set (via `page.evaluate`)

**Step 12: Search for Friend**
- Type "Ana" in search input
- Wait for mock results
- Verify "Ana · 12 días" appears in results

**Step 13: Add Friend**
- Click "Agregar" on the search result
- Wait for POST to succeed
- Verify friend appears in friend list with name and streak

**Step 14: Verify Friend Streak Display**
- Check friend card shows "Ana", "12 días", and "Hoy ✅"
- Check own streak is shown at top

### Assertions

| Step | Selector | Assertion |
|---|---|---|
| 10 | `#friends-view` | Visible (screen rendered) |
| 10 | `#username-prompt` | Visible (first visit) |
| 11 | `#username-input` | Fill with "TestUser" |
| 11 | `#username-btn` | Click |
| 11 | `#username-prompt` | Not visible |
| 11 | `#my-streak` | Contains "racha" |
| 12 | `#friend-search-input` | Fill with "Ana" |
| 12 | `.search-result` | Contains "Ana · 12 días" |
| 13 | `.search-result .add-btn` | Click |
| 13 | `#friends-list` | Contains "Ana" |
| 14 | `#friends-list` | Contains "12 días" |
| 14 | `#friends-list` | Contains "Hoy" or ✅ |
