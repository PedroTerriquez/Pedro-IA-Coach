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
- The rest UI is full screen (`SeriesModeScreen`); `RestTimerBanner` is its minimized state. Both are decorative — the push still drives delivery
- Whatever the timer displays (muscle, última, récord, `setIndex`) must live in `RestPendingData`: that payload is all that survives the notification round trip
- Set counter lives in `localStorage` (`rest-set-counts`), reset per day — see `docs/superpowers/specs/2026-09-09-fullscreen-rest-timer-design.md`

## Flujo del modo serie (acordado 2026-10-28)
En el Detalle, «Registrar» guarda un solo peso para todas las series. El botón de descanso junto a él abre el modo serie: un peso y reps **por serie**.

1. **Descanso**: tocar el botón arranca el descanso de la serie N y deja registrarla. «Registrar» guarda la serie y pliega los campos; el descanso sigue corriendo (también en la última).
2. **Saltar** (`skipRest()`) solo manda el descanso a cero: cancela el push en cola, guarda la serie que se ve y la pantalla se queda en «Serie N guardada» → «Empezar serie N+1». Nunca cierra el timer.
3. **Última serie**: al llegar a cero se abre sola «Confirma tus series».
4. **Terminar** (aparece cuando el descanso de una serie que no es la última llega a cero) va directo a «Confirma tus series».
5. **Confirma tus series** muestra todas las series planeadas: las registradas tal cual y las que faltan rellenas con la última (marca «auto»); todas se pueden editar. Guardar cierra el timer y el Detalle pasa al siguiente ejercicio (`seriesConfirmed`). Cerrarla con la chevron sale sin guardar.
6. **Minimizar** (flecha ↓, en descanso o en «Serie N guardada»): mientras el descanso corre, el banner (sobre la TabBar, o en el lugar del dock dentro del Detalle) lo reabre al tocarlo. Ya en cero, el banner se va y vuelve el dock: su botón de descanso **reabre** el timer de ese ejercicio donde quedó, sin arrancar otro descanso ni contar otra serie.
