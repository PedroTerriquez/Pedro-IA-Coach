# Push Worker (`coach-pedro-ai`)

Cloudflare Worker that backs the PWA's **push notifications** and **AI features**.
It is the only server-side component; the app itself is a static PWA with two homes,
GitHub Pages (`/Pedro-IA-Coach`) and Cloudflare (`fitfriends`, root). `ALLOWED_ORIGINS` accepts both.

> Architecture & the iOS empty-push design: [`../docs/PUSH_NOTIFICATIONS_FINDINGS.md`](../docs/PUSH_NOTIFICATIONS_FINDINGS.md).

## What it does

- **Push subscriptions** — stores one Web Push subscription per device in KV
  (`sub_${deviceId}`).
- **Rest-timer notifications** — sends payload-less ("empty") pushes that wake the
  Service Worker; the SW renders the notification from a local cache. Delayed
  "Descanso terminado" pushes are scheduled through a **Cloudflare Queue**.
- **AI** — routes coach/import/program/exercise requests to Gemini (with a Llama 3.1
  fallback on Workers AI).

## Endpoints

| Route | Purpose |
|---|---|
| `POST /api/push/subscribe` | Save `{ subscription, deviceId }` to KV. |
| `POST /api/push/unsubscribe` | Delete a device's subscription. |
| `POST /api/push/start` | Send an **empty** push now → SW shows "Tap para iniciar descanso". |
| `POST /api/rest-timer/start` | Enqueue a delayed empty push (`delaySeconds = ceil((endTime-now)/1000)`, i.e. `rest − 10s`). |
| `POST /api/rest-timer/cancel` | Mark a queued timer cancelled (KV flag `cancel_${tag}`). |
| `POST /api/ai/coach` · `/import` · `/program-coach` · `/exercise-coach` | AI inference. |

The `queue` consumer drains `rest-timers`, skips cancelled tags, and sends the delayed
empty push via `sendEmptyPush()`.

### Accounts & cloud copy (D1, `src/accounts.js`)

| Route | Purpose |
|---|---|
| `POST /api/account/create` | `{username, email, password}` → `{token}`. 400 on bad input, 409 `{protected:true}` if the user already has an account. Creates `user_${username}` in KV if missing. |
| `POST /api/account/login` | `{username, password}` → `{token, email}`, or 401. |
| `POST /api/cloud/upload` | Bearer. `{upserts:[{store,id,data}], deletes:[{store,id}]}`, ≤ 500 items → `{uploadedAt}`. |
| `GET /api/cloud/download?after=<store:id>` | Bearer. Up to 1000 records ordered by `(store, id)` + `next` cursor (`null` at the end). |

`/api/user/check` also returns `protected`; `/api/user/register` answers 403 `{protected:true}` for
a user with an account; `/api/user/rename` of a user with an account needs that user's Bearer
(403 otherwise) and moves the account, sessions and cloud records too.

Passwords: PBKDF2-SHA-256, 100 000 iterations (`PBKDF2_ITERATIONS`), random salt per account.
Measured 2026-11-12: create/login ≈ 17–34 ms CPU, upload of 500 ≈ 8 ms, download ≈ 2 ms; no
"exceeded CPU" outcomes on the Free plan. If they appear, lower `PBKDF2_ITERATIONS` **before**
people have accounts (existing hashes stop matching).

**Delete an account** (forgotten password — the cloud records are kept, so the person can
protect the name again and upload):

```bash
npx wrangler d1 execute coach-pedro-db --remote --command "DELETE FROM sessions WHERE username='X'; DELETE FROM accounts WHERE username='X'"
```

Schema changes go in `migrations/` → `npx wrangler d1 migrations apply coach-pedro-db --remote`.

## Bindings (see `wrangler.toml`)

| Binding | Resource |
|---|---|
| `PUSH_KV` | KV namespace — subscriptions + cancel flags. |
| `REST_TIMER_QUEUE` | Queue `rest-timers` (producer + consumer). |
| `DB` | D1 `coach-pedro-db` — accounts, sessions, cloud records. |
| `AI` | Workers AI (Llama fallback). |

## Secrets / vars

Set once with `npx wrangler secret put <NAME>`:

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generate with `npx web-push generate-vapid-keys`.
  The **public** key also goes into the app's `push-config.js`.
- `GEMINI_API_KEY` — optional; without it AI falls back to Workers AI (Llama).
- `VAPID_EMAIL` — set as a plain var in `wrangler.toml` (`mailto:` contact for VAPID).

## Develop & deploy

```bash
cd push-worker
npm install
npm run dev      # wrangler dev (local)
npm run deploy   # wrangler deploy → https://coach-pedro-ai.pollothe.workers.dev
```

After deploying, the app at `push-config.js` must point `PUSH_SERVER_URL` at this Worker.

## Debugging delivery

```bash
cd push-worker
npx wrangler tail                 # live logs while you click on a real device
# watch for: [PUSH_RESULT] empty status: 201   ← Apple accepted the push
```

**Important:** Apple returning `201` only means it accepted the push for relay — it is
**not** proof the device displayed it. (Encrypted payloads can be accepted and then
silently dropped on-device; that's why we use empty pushes. See the findings doc.)
