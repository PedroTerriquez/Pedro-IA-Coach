import type { FriendData } from '$lib/league'

// Last friends list Amigos got from the Worker. Amigos shows it as-is while
// offline; Plan reads it for «quién entrenó hoy» without any network call.
const FRIENDS_CACHE_KEY = 'friends-cache'

export interface FriendsCache { friends: FriendData[]; savedAt: number }

export function readFriendsCache(): FriendsCache | null {
  try {
    const raw = localStorage.getItem(FRIENDS_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeFriendsCache(list: FriendData[]) {
  try {
    localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({ friends: list, savedAt: Date.now() }))
  } catch {}
}
