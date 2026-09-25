# Design: El ciclo serie → descanso → serie

Fecha: 2026-09-24
Estado: Aprobado

## Objetivo

Que una sesión completa de un ejercicio se pueda seguir y registrar **sin
salir del flujo**: terminas una serie, tocas un botón, descansas, anotas lo que
levantaste, y ese mismo botón te lleva a la siguiente serie. El contador de
series sube solo y al final queda **todo** guardado.

Hasta ahora el descanso solo arrancaba si tapeabas la notificación. Si no
bloqueabas el celular (o la notificación no llegaba), no había descanso en la
app: ni reloj, ni registro, ni contador. Este diseño corta esa dependencia.

## Los 3 segundos antes de la notificación

Al tocar **Iniciar** no se manda la notificación de inmediato: se esperan
**3 s** (`START_PUSH_DELAY_MS`) para darte tiempo de bloquear el celular, que
es lo que hace que iOS refleje la notificación en el Apple Watch.

Esa espera antes era invisible: el botón se "deshabilitaba" durante un
microsegundo (nadie hacía `await`), así que parecía que el tap no había hecho
nada. Ahora:

- El botón queda **deshabilitado de verdad** todo el tramo — gris plano,
  borde punteado y un pulso lento — y cuenta el tiempo: `Preparando 3s`,
  `2s`, `1s`.
- `prepCountdown()` (en `rest-timer.ts`) es el que cuenta, y lo comparten los
  dos botones que arrancan un descanso: **Iniciar** y **Siguiente serie**.

## Qué pasa al terminar esos 3 segundos

El orden importa y no es negociable:

1. Se escribe la especificación `{kind:'start'}` en la caché `push-pending`
   (es lo que lee el Service Worker cuando llega el push vacío).
2. Pasan los 3 s.
3. Se manda el push de inicio.
4. **Recién entonces** se arma el descanso (`armRest`), que pisa esa
   especificación con `{kind:'done'}` y encola el push retardado.

Si se armara antes, el SW leería `done` al llegar el push de inicio y
mostraría "Descanso terminado" al comenzar el descanso.

El descanso arranca **siempre**, bloquees el celular o no, tapees la
notificación o no. El reloj a pantalla completa aparece solo.

### La notificación de inicio ya no siempre dice lo mismo

Es la misma tarjeta (`tag: rest-start`) en dos momentos distintos, así que el
texto cambia según el caso (`showStartNotification(ex, running)`):

| Momento | Texto | Qué hace el tap |
|---|---|---|
| Justo después de "Iniciar" (`kind:'start'`) | `Descanso en curso · Tap para ver ▸` | Solo abre la app en el descanso que ya corre |
| Re-mostrada al terminar un descanso (`kind:'done'`) | `Tap para iniciar descanso ▸` | Cuenta una serie y arranca el siguiente descanso |

La diferencia la decide `isRestRunning()`: si hay un descanso corriendo, el tap
**no** rearma nada (antes reiniciaba el reloj). Si no lo hay, el tap es la
forma "app cerrada" de decir *terminé la siguiente serie*, y por eso ahora
**también incrementa el contador de series** — antes el ciclo por notificación
se quedaba pegado en la misma serie.

## Cuando el descanso termina: la fase `done`

El reloj ya no desaparece. `RestTimerData.phase` pasa de `resting` a `done` y
la misma pantalla se queda, ahora con:

- El anillo completo y una palomita, con "Listo para la serie N+1".
- Los campos de **peso y reps de la serie que acabas de terminar**, intactos.
- **Siguiente serie · N+1** (botón principal, relleno).
- **Descansar más** (secundario) — reinicia el mismo descanso, sin contar serie.
- **Terminar** arriba a la derecha, que cierra el ciclo del ejercicio.

La fase vive en la caché `rest-timer`, no en memoria: si el descanso termina
con el celular bloqueado y vuelves a la app 4 minutos después, la pantalla te
sigue esperando con la serie sin cerrar. Pasados **15 minutos**
(`DONE_TTL_MS`) el registro caduca y la pantalla no vuelve a aparecer.

Si el descanso terminó estando minimizado (el banner), la pantalla completa se
vuelve a abrir sola: ahí es donde se registra y se continúa.

## "Siguiente serie" = "Iniciar" del mismo ejercicio

`startNextSet()` toma el ejercicio del descanso que acaba de terminar, le quita
lo que era de ese descanso (`endTime`, `phase`, `setIndex`) y corre exactamente
el mismo camino que el botón Iniciar: cuenta una serie más, espera los 3 s,
manda la notificación y arma el nuevo descanso. Así el Watch recibe su tarjeta
en cada serie, no solo en la primera.

## Registro sin escribir nada: la serie se hereda

Los campos de peso/reps ya venían sembrados con la serie anterior (o con
"última" del historial). Lo nuevo: **tocar "Siguiente serie" o "Terminar"
guarda lo que muestran los campos**, los hayas tocado o no.

- Si nunca tocas nada en todo el ejercicio, las 4 series quedan iguales y
  `collapseSets()` las comprime a **un solo registro** (`4 series · 10 reps ·
  60 kg`), no a cuatro.
- Si cambias una, el log pasa a `blocks` y solo esa serie difiere.
- Si no hay de dónde heredar (sin peso o sin reps), no se guarda nada: la
  pantalla nunca inventa un registro.

La regla vieja ("abrir el timer nunca inventa un registro") sigue en pie para
todo lo demás — `Saltar` y el cierre por caducidad solo escriben lo que ya
habías tocado.

## Recorrido completo

```
Serie 1 hecha
  └─ [Iniciar]  → botón "Preparando 3s…2s…1s" (deshabilitado)
       └─ push de inicio → (Watch)
            └─ descanso armado → PANTALLA COMPLETA (serie 1 de 4)
                 ├─ registras 60kg × 10   (o no tocas nada)
                 └─ se acaba el tiempo → push "Descanso terminado" + fase done
                      └─ [Siguiente serie · 2]
                           ├─ guarda la serie 1 con lo que muestre la pantalla
                           └─ vuelve al principio con serie 2
…
Última serie → [Terminar] → guarda y cierra el ciclo
```

## Archivos

| Archivo | Rol |
|---|---|
| `src/lib/rest-timer.ts` | `START_PUSH_DELAY_MS`, `prepCountdown`, `startRestFromExercise`, `startNextSet`, `completeRest`, `isRestRunning`, fase `done` |
| `src/lib/components/RestTimerFullscreen.svelte` | Fases `resting`/`done`, `Siguiente serie`, `commitShownSet()` |
| `src/lib/components/ExerciseDetail.svelte` | Botón "Iniciar" deshabilitado con cuenta regresiva |
| `src/routes/+layout.svelte` | Cablea `onnext`/`onclose` y reabre a pantalla completa al terminar |
| `src/service-worker.js` | `showStartNotification(ex, running)` — dos textos, una tarjeta |
| `src/lib/set-log.ts` | Sin cambios: expande/colapsa y comprime las series iguales |

## Verificación

`tests/big.spec.cjs` → `Rest timer — ciclo de series`: toca "Iniciar", ve el
botón deshabilitado con su cuenta, espera a que el descanso arranque solo (sin
tapear ninguna notificación), lo lleva al final, comprueba la pantalla de
`Descanso terminado`, toca "Siguiente serie" y verifica que la serie 1 se
guardó heredando los valores mostrados y que el contador va en la serie 2.

`tests/big.spec.cjs` → `Rest timer notification flow`: el tap de la
notificación con un descanso corriendo **no** reinicia el reloj; sin descanso
corriendo, cuenta serie y arma uno nuevo.

## Relacionado

- `docs/superpowers/specs/2026-09-09-fullscreen-rest-timer-design.md` — la vista.
- `docs/PUSH_NOTIFICATIONS_FINDINGS.md` — por qué los push van vacíos.
