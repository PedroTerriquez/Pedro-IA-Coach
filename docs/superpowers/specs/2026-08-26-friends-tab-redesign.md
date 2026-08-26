# Friends Tab Redesign

## Overview

Redesign the `/friends` tab to be the primary social hub with profile management, leaderboard, search, and friend management. Move username management from `/you` to `/friends`. Unify the two username concepts into one.

## Goals

1. Single username for both identity and display
2. Profile section with editable username
3. Leaderboard ranked by streak
4. Ability to remove friends
5. Activity indicators (trained today)
6. Mobile-first, minimal dark UI
7. 100% functional with proper error handling

## Data Model Changes

### Settings Schema Update

**Before:**
- `settings.username` — friends/Worker identity
- `settings.userName` — display name in You tab

**After:**
- `settings.username` — single username (identity + display)
- `settings.userName` — removed (migration: copy to `settings.username` if exists)

### Worker API Changes

**New endpoint: `POST /api/friends/remove`**

Request: `{ username: string, friendUsername: string }`
Response: `{ status: 'ok' }` or `{ error: string }`

**Existing endpoints (unchanged):**
- `GET /api/friends/search?q=` — search users
- `GET /api/friends/list?username=` — list friends with streaks
- `POST /api/friends/add` — add friend
- `POST /api/user/register` — register username
- `POST /api/user/sync` — sync streak data

## Page Structure

```
┌─────────────────────────────┐
│  👥 Amigos                  │  ← page header
│                             │
│  ┌─────────────────────────┐│
│  │ 🔥 Racha: 3 semanas     ││  ← my streak highlight
│  │ 📅 Hoy: ✅              ││
│  └─────────────────────────┘│
│                             │
│  ── Mi Perfil ──────────── │  ← section label
│  ┌─────────────────────────┐│
│  │ [A] Pedro   ✏️          ││  ← avatar + username editable
│  │ @pedro · 3 sem 🔥       ││  ← handle + streak
│  └─────────────────────────┘│
│                             │
│  ── Ranking ────────────── │  ← leaderboard
│  1. 🔥 Pedro    5 sem  ✅  │
│  2.    Juan     3 sem  ✅  │
│  3.    Ana      1 sem  —   │
│                             │
│  ── Buscar ────────────── │  ← search
│  [🔍 Buscar usuario...  ]  │
│  ┌─────────────────────────┐│
│  │ [A] María   2 sem  +   ││  ← search result
│  └─────────────────────────┘│
│                             │
│  ── Pendientes ────────── │  ← pending requests
│  [ Carlos te agregó  ✓ ✗ ]│
└─────────────────────────────┘
```

## Component Design

### 1. UsernameEditor (NEW)

**Props:**
- `username: string` — current username
- `accent: string` — accent color
- `onsave: (newName: string) => Promise<void>` — save callback

**Behavior:**
- Shows avatar (first letter, 48px circle, accent background)
- Username displayed as text with pencil icon
- Tap pencil → contenteditable mode with caret at end
- Blur or Enter → save, validate (min 2 chars, max 20)
- If save fails → revert, show toast error
- Loading state while saving

### 2. FriendCard (REDESIGN)

**Props:**
- `username: string`
- `streak: number` — weeks
- `exercisedToday: boolean`
- `lastUpdate: string`
- `position: number` — leaderboard position
- `isMe: boolean` — is this the current user
- `onremove: (username: string) => void`

**Layout:**
```
[position] [avatar] [name + streak] [today badge] [remove button]
```

- Position: mono font, muted color (1st gets gold accent)
- Avatar: first letter, 40px circle
- Name: bold, 14px
- Streak: `X sem` in mono, accent color
- Today badge: green dot or "—" if not
- Remove: trash icon (only if not me), shows on tap

**States:**
- Default: shows all info
- Swiped/long-pressed: shows remove button
- Removing: loading spinner

### 3. Leaderboard (NEW)

**Props:**
- `friends: Friend[]` — sorted by streak desc
- `myStreak: number`
- `myUsername: string`
- `accent: string`
- `onremove: (username: string) => void`

**Behavior:**
- Shows "Mi" label next to current user's row
- Current user always visible even if lowest streak
- Empty state: "Aún no tienes amigos. Busca y agrega arriba."
- Sort: by streak descending, then by lastUpdate

### 4. SearchInput (IMPROVE)

**Changes:**
- Add magnifying glass icon inside input
- Add clear button (X) when has value
- Better focus styles (accent border)

### 5. SearchResults (IMPROVE)

**Changes:**
- Add avatar to each result row
- Show streak in mono font
- "+" button styled as circle with accent border

### 6. friends/+page.svelte (REWRITE)

**Sections:**
1. Page header: "👥 Amigos"
2. My streak banner (accent colored)
3. UsernameEditor (if registered) or registration prompt
4. Leaderboard section
5. Search section
6. Add friend button (floating or inline)

**State management:**
- `username` — from settings
- `friends` — from Worker API
- `myStreak` — computed from logs
- `searchQuery` — debounced
- `searchResults` — from Worker API
- `loading` — initial load
- `searching` — search in progress

### 7. you/+page.svelte (MODIFY)

**Remove:**
- The entire `<div class="page-header">` block with contenteditable `userName`
- The edit button (`#user-edit-btn`)

**Keep:**
- SegmentedControl for tabs
- All tab content (Perfil, Programas, Ejercicios, Datos)
- The `userName` state variable (for backward compat, but not displayed)

**New header:**
```svelte
<div class="page-header">
  <div class="page-header-eyebrow">Tú</div>
  <div class="page-header-title">Tú</div>
</div>
```

## Implementation Details

### Username Migration

In `friends/+page.svelte` `onMount`:
1. Load settings
2. If `settings.userName` exists but `settings.username` is empty:
   - Copy `settings.userName` to `settings.username`
   - Save settings
3. If both exist, use `settings.username`

### Delete Friend Flow

1. User taps trash icon on FriendCard
2. Show confirmation dialog: "¿Eliminar a [username] de tus amigos?"
3. On confirm: `POST /api/friends/remove` with `{ username, friendUsername }`
4. On success: remove from local state, show toast
5. On error: show toast error

### Error Handling

- Username save failure: revert to old value, show toast
- Search failure: show empty state, log error
- Add friend failure: show toast with server error message
- Remove friend failure: show toast with error
- Network offline: show "Sin conexión" state

### Animations

- FriendCard: `fadeUp` on mount (staggered)
- Leaderboard position change: smooth reorder
- Search results: `fadeIn` on appear
- Remove: `slideUp` out then remove from DOM

## Testing

- Username registration flow
- Username edit flow
- Search with debounce
- Add friend flow
- Remove friend flow
- Empty states (no friends, no search results)
- Error states (network, validation)
- Mobile viewport (390x844)
