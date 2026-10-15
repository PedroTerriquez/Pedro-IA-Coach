# ADR: Rest Timer & Delayed Notifications (Worker Queue)

## Decision
"⏰ Descanso terminado" is delivered primarily via the Cloudflare Worker Queue (`rest-timers`). The app-side `completeRest()` also calls `notifyWatch()` as a local fallback so the user always gets feedback.

## Rationale
iOS suspends all JS (setTimeout, fetch, postMessage) when backgrounded. Only a server-timed mechanism (Worker queue → Web Push) can deliver at the exact rest duration. Web Push can fail silently, so a local `notifyWatch()` fallback covers the foreground case.

## Rules
1. `completeRest()` shows toast + calls `notifyWatch()` (local fallback) + re-stores data in `rest-pending` cache. It **MUST NOT** call `sendPushNotification()` (Web Push).
2. The Worker queue is the **PRIMARY** mechanism (delivers even when the app is closed).
3. `scheduleRestTimer()` sends `pushEndTime = endTime - 10000` — the push arrives ~10s before rest ends.
4. `cancelRestTimer()` POSTs `/api/rest-timer/cancel` — Worker sets KV `cancel_{tag}` so the queue skips delivery.
5. A rest can start from **TWO** places, sharing everything except the start notification:
   - **"Iniciar" (ExerciseDetail) / "Siguiente serie"** → `startRestFromExercise()` starts the rest at once and sends the start notification 3s later. Counts a new set (`nextSetIndex`).
   - **"Reiniciar descanso" (full-screen timer)** → `restartRestTimer()` starts the rest immediately, with NO start notification. Does NOT count a new set.
   Both end up in `scheduleRestTimer()` → `armRest()`, so both queue the delayed push identically. Adding a third entry point means reusing `armRest()`, never duplicating the queue call.
6. `adjustRestTimer(delta)` (`−15 s` / `+30 s`) and `restartRestTimer()` re-queue under a FRESH tag after cancelling the in-flight one — the Worker drops the stale message via `active_{deviceId}`.

## Key Points
- Worker queue delivers at EXACTLY the scheduled delay — iOS cannot interfere
- Push arrives 10s before rest ends so "Descanso terminado" lands right at the end
- App-side `setTimeout` is ONLY for the UI countdown banner and toast — not the delivery mechanism
- If app is closed at expiry: only the push arrives (correct). If open: toast + push both arrive
- On `visibilitychange` to visible, `checkPendingRest()` recovers pending timers from Cache API
- `scheduleRestTimer()` calls BOTH the Worker queue AND starts `setTimeout` — removing either breaks the system
- The rest UI is full screen (`RestTimerFullscreen`); `RestTimerBanner` is its minimized state. Both are decorative — the push still drives delivery
- Whatever the timer displays (muscle, última, récord, `setIndex`) must live in `RestPendingData`: that payload is all that survives the notification round trip
- Set counter lives in `localStorage` (`rest-set-counts`), reset per day — see `docs/superpowers/specs/2026-09-09-fullscreen-rest-timer-design.md`