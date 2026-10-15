# Push Notifications (Web Push via Cloudflare Worker)

## Architecture
```
today.js → sendPushNotification()
                  ↓
           fetch(POST /api/push/start)
                  ↓
        Cloudflare Worker + KV store
                  ↓
        Web Push Protocol (encrypted payload)
                  ↓
        Service Worker `push` event
                  ↓
        showNotification() → iOS Notification Center → Apple Watch
```

## Files
| File | Role |
|---|---|
| `src/lib/push.ts` | `subscribePush()`, `unsubscribePush()`, `sendPushNotification()`, `notifyWatch()` (local fallback) |
| `src/lib/rest-timer.ts` | `scheduleRestTimer()`, `adjustRestTimer()`, `restartRestTimer()`, `completeRest()`, `cancelRestTimer()`, `checkPendingRest()` (Cache API + Worker queue) |
| `src/service-worker.js` | `push` event → `showNotification()`; `notificationclick` → opens app + `from-notification` flag |
| `push-worker/src/index.js` | Endpoints: `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/start`, `/api/rest-timer/start`, `/api/rest-timer/cancel`; `queue()` handler |
| `src/lib/config.ts` | `PUSH_SERVER_URL` + `VAPID_PUBLIC_KEY` (both public by design) |
| `push-worker/wrangler.toml` | KV `PUSH_KV`, Queue `rest-timers`, `[ai]` binding, VAPID vars |

## Config / Secrets
- `PUSH_SERVER_URL` and `VAPID_PUBLIC_KEY` are **public** (Web Push spec: public key is meant to be public). Stored in `src/lib/config.ts`.
- `VAPID_PRIVATE_KEY` is the **ONLY secret** — set via `npx wrangler secret put VAPID_PRIVATE_KEY`, never in repo.
- `wrangler.toml` needs KV namespace id (from `npx wrangler kv:namespace create PUSH_KV`) and queue `rest-timers` created (`npx wrangler queues create rest-timers`).
- Deploy worker: `cd push-worker && npm install && npx wrangler deploy`.

## Troubleshooting
| Symptom | Likely Cause | Fix |
|---|---|---|
| Push not arriving | VAPID keys mismatch | Public key in `src/lib/config.ts` must match `wrangler secret put VAPID_PUBLIC_KEY` |
| 404 on subscribe | Worker URL wrong | Check `PUSH_SERVER_URL`; `wrangler deploy` again |
| 403 on subscribe | KV not bound | Verify `kv_namespaces` ID in `wrangler.toml` |
| Subscription expired | Push service cleaned up endpoint | Worker auto-deletes expired subs (410) |
| Not working on Watch | iOS needs at least one push while backgrounded | Open app, trigger ⌚, close PWA, check Watch settings |

## Key Behaviors
- Single subscription (one device at a time)
- `subscribePush()` always calls `unsubscribe()` before `subscribe()` to replace expired endpoints
- Error recovery: 410 (expired) → Worker deletes sub, client refreshes subscription and retries; if all Web Push fails → `notifyWatch()` local notification