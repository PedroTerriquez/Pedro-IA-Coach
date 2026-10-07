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

## Qué pasa al tocar "Iniciar" (actualizado 2026-10-06)

El descanso arranca **en el tap**, sin espera:

1. Se abre el reloj a pantalla completa y empieza a correr.
2. Se programa la notificación retardada ("Descanso terminado"), que llegará
   cuando se acabe el descanso de ese ejercicio.
3. **3 s después** (`START_PUSH_DELAY_MS`) sale la notificación de inicio
   ("Descanso en curso"). Esos 3 s son el tiempo para bloquear el celular: si
   lo bloqueaste llega al Apple Watch, si no llega al celular. No bloquean
   nada — el reloj ya va corriendo.
4. Tapear esa notificación abre la app en el reloj.

**Siguiente serie** hace exactamente lo mismo: reloj al instante, nueva
retardada y, a los 3 s, la de inicio.

Antes el botón se quedaba 3 s en "Preparando 3s…2s…1s" y el descanso empezaba
al terminar esa espera. Ya no existe.

Si saltas el descanso dentro de esos 3 s, la notificación de inicio no sale.
Si el celular congela la app y los 3 s se cumplen mucho después, tampoco: para
entonces ya estás viendo el reloj.

### Cómo sabe el celular qué notificación mostrar

Las dos notificaciones viajan **vacías** (ver
`docs/PUSH_NOTIFICATIONS_FINDINGS.md`), así que el Service Worker tiene que
decidir el texto. Al armar el descanso la app le deja anotado en la caché
`push-pending` **cuándo empezó** y **cuándo toca la retardada**
(`{exerciseData, startedAt, doneAt}`); cuando llega un push, `pushKind()` mira
el reloj: más cerca del inicio → "Descanso en curso"; más cerca del final →
"Descanso terminado".

Antes la nota decía `inicio` o `terminado` y la app la cambiaba a `terminado`
justo después de mandar la de inicio. Si esa notificación tardaba un instante
en llegar (lo normal con el celular recién bloqueado) ya leía `terminado` y
anunciaba "Descanso terminado" con el descanso empezando. Decidir por el reloj
elimina esa carrera: no importa cuál llegue primero ni cuánto tarde.

### La notificación de inicio ya no siempre dice lo mismo

Es la misma tarjeta (`tag: rest-start`) en dos momentos distintos, así que el
texto cambia según el caso (`showStartNotification(ex, running)`):

| Momento | Texto | Qué hace el tap |
|---|---|---|
| 3 s después de "Iniciar" | `Descanso en curso · Tap para ver ▸` | Solo abre la app en el descanso que ya corre |
| Re-mostrada al terminar un descanso | `Tap para iniciar descanso ▸` | Cuenta una serie y arranca el siguiente descanso |

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
el mismo camino que el botón Iniciar: cuenta una serie más, arma el nuevo
descanso al instante y a los 3 s manda la notificación. Así el Watch recibe su
tarjeta en cada serie, no solo en la primera.

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
  └─ [Iniciar]  → PANTALLA COMPLETA al instante (serie 1 de 4) + retardada programada
       ├─ a los 3 s → push de inicio "Descanso en curso" → (Watch si bloqueaste)
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
| `src/lib/rest-timer.ts` | `START_PUSH_DELAY_MS`, `startRestFromExercise`, `queueStartNotification`, `stagePushSpec`, `startNextSet`, `completeRest`, `isRestRunning`, fase `done` |
| `src/lib/components/RestTimerFullscreen.svelte` | Fases `resting`/`done`, `Siguiente serie`, `commitShownSet()` |
| `src/lib/components/ExerciseDetail.svelte` | Botón "Iniciar" |
| `src/routes/+layout.svelte` | Cablea `onnext`/`onclose` y reabre a pantalla completa al terminar |
| `src/service-worker.js` | `pushKind()` decide por el reloj; `showStartNotification(ex, running)` — dos textos, una tarjeta |
| `src/lib/set-log.ts` | Sin cambios: expande/colapsa y comprime las series iguales |

## Verificación

`tests/big.spec.cjs` → `Rest timer — ciclo de series`: lleva un descanso al
final, comprueba la pantalla de `Descanso terminado`, toca "Siguiente serie" y
verifica que la serie 2 arranca al instante, que la serie 1 se guardó heredando
los valores mostrados y que la notificación de inicio sale después.

`Rest timer — "Iniciar" arranca el descanso al instante`: un tap (o doble tap)
abre el reloj y programa la retardada de inmediato; la de inicio sale una sola
vez, 3 s después, y cuenta una sola serie.

`Rest timer — el push de inicio nunca dice "Descanso terminado"`: entrega un
push vacío al Service Worker real con el descanso recién armado (muestra "en
curso") y otra vez con el descanso por acabar (muestra "terminado").

`tests/big.spec.cjs` → `Rest timer notification flow`: el tap de la
notificación con un descanso corriendo **no** reinicia el reloj; sin descanso
corriendo, cuenta serie y arma uno nuevo.

## Relacionado

- `docs/superpowers/specs/2026-09-09-fullscreen-rest-timer-design.md` — la vista.
- `docs/PUSH_NOTIFICATIONS_FINDINGS.md` — por qué los push van vacíos.
