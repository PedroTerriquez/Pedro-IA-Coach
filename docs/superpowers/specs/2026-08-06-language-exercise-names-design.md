# Design: Idioma — Solo Nombres de Ejercicios

Fecha: 2026-08-06
Estado: Aprobado

## Objetivo

El setting `language` (`es` / `en`) del perfil controla **únicamente** cómo se muestran
los nombres de los ejercicios. Cuando el usuario elige inglés, los nombres de ejercicios
se muestran en inglés; cuando elige español, en español.

El idioma **no** cambia nada más:
- La IA (importar con IA, generar programa, coach de programa, coach de ejercicio)
  siempre responde en español (mexicano).
- El resto de la UI permanece en español.

## Contexto

- Ya existe un setting `language` persistido (`settings.language`, espejo en
  `localStorage` bajo `exerciseLang`), con toggle en `QuickSettingsCard.svelte` →
  `you/+page.svelte: toggleLang()`.
- Ya existe `getExerciseDisplayName(exerciseOrName, lang?)` en
  `src/lib/data/exercise-dictionary.ts` que devuelve `entry.en` si `lang === 'en'`,
  si no `entry.es`, y con fallback al nombre guardado.
- `History` y `Calendar` ya pasan `$settings.language` a `getExerciseDisplayName`.
- **Gap:** el componente de detalle del ejercicio no pasa el idioma:
  - `ExerciseHero.svelte:49` llama `getExerciseDisplayName(exercise)` sin idioma
    → siempre español.
  - `CoachChat.svelte:95` muestra `exercise.name` crudo en la cabecera.
  - `ExerciseDetail.svelte:173` pasa `exercise.name` crudo al rest timer → las
    notificaciones "Descanso terminado" muestran el nombre en español siempre.
- La IA hoy sí cambia con el idioma: `ai.ts` usa `resolveLanguage(settings)` para
  `importWithAI`, `generateProgramWithAI` y `programCoach`. El Worker solo usa
  `body.systemPrompt`; ignora `body.language`, así que el cambio es 100% client-side.

## Cambios

### 1. `src/lib/components/ExerciseHero.svelte`
- Importar `settings` desde `$lib/stores/settings`.
- `const displayName = $derived(getExerciseDisplayName(exercise, $settings.language))`
- El hero name (línea 49) usa `displayName`.
- Las búsquedas Google/TikTok (líneas 58, 61) usan `displayName` para que el query
  coincida con el nombre mostrado.

### 2. `src/lib/components/CoachChat.svelte`
- La cabecera del chat (línea 95) muestra el nombre traducido
  (`getExerciseDisplayName(exercise.name, $settings.language)`).
- El mensaje a la IA (línea 62) conserva el nombre canónico guardado — la IA
  responde en español de todos modos.

### 3. `src/lib/components/ExerciseDetail.svelte`
- `handleIniciar` (línea 173): el `name` que recibe el rest timer usa el nombre
  traducido, para que la notificación "⏰ Descanso terminado" muestre el nombre en
  el idioma elegido.

### 4. `src/lib/ai.ts` — desacoplar la IA del idioma
- Eliminar la función `resolveLanguage(settings)`.
- En `importWithAI`, `generateProgramWithAI` y `programCoach`, el idioma pasa a ser
  siempre `'es'` (prompts siempre en español; el campo `language` del body queda en
  `'es'`).

## Fuera de alcance

- Traducir el resto de la UI (permanece en español).
- Traducir nombres de ejercicios que no están en `exercise-dictionary.ts` (se
  conserva el nombre guardado).
- Cambiar el idioma de las respuestas de la IA (siempre español).
- Cambios en `History`, `Calendar` (ya respetan el idioma).
