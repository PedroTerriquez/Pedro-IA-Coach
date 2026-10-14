<script lang="ts">
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { online } from '$lib/stores/network'
  import * as Storage from '$lib/storage'
  import { generateId } from '$lib/db'
  import { subscribePush, sendPushNotification, notifyWatch } from '$lib/push'
  import { filledCount, profileSubtitle, saveProfileField, type ProfileField } from '$lib/profile'
  import { notificationState, type NotifState } from '$lib/settings-options'
  import type { Exercise, ExerciseLog, Program, Settings } from '$lib/types'
  import YouHub from '$lib/components/YouHub.svelte'
  import YouFirstTime from '$lib/components/YouFirstTime.svelte'
  import ProfileData from '$lib/components/ProfileData.svelte'
  import ProfileGuide from '$lib/components/ProfileGuide.svelte'
  import ProgramsScreen from '$lib/components/ProgramsScreen.svelte'
  import ProgramCreator from '$lib/components/ProgramCreator.svelte'
  import ExercisesScreen from '$lib/components/ExercisesScreen.svelte'
  import SettingsScreen from '$lib/components/SettingsScreen.svelte'
  import BackupScreen from '$lib/components/BackupScreen.svelte'
  import UnmatchedScreen from '$lib/components/UnmatchedScreen.svelte'

  // Tú is a summary with doors: each row opens a subscreen ("‹ Tú" goes back).
  // Navigation lives in this route's state, not in new URLs.
  type View = 'hub' | 'datos' | 'programas' | 'ejercicios' | 'ajustes' | 'copia' | 'sin-coincidencia'

  let view = $state<View>('hub')
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let programs = $state<Program[]>([])
  let loaded = $state(false)
  let guideOpen = $state(false)
  let unmatchedNames = $state<string[]>([])
  let notifState = $state<NotifState>('default')
  let creator: ProgramCreator | null = $state(null)

  let s = $derived($settings as Settings)
  let activeProgram = $derived(programs.find(p => p.id === s.activeProgramId) || null)
  let firstTime = $derived(loaded && programs.length === 0)
  let userName = $derived(s.userName || 'Pedro')

  async function loadAll() {
    const [exs, logs, progs] = await Promise.all([Storage.getExercises(), Storage.getAllLogs(), Storage.getPrograms()])
    exercises = exs.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    allLogs = logs
    programs = progs
    loaded = true
  }

  // The AI flows and a restore write settings straight to storage: reload the store too
  async function refresh() {
    await settings.load()
    await loadAll()
  }

  onMount(() => {
    notifState = notificationState()
    refresh()
  })

  function go(v: View) {
    view = v
    window.scrollTo(0, 0)
  }

  function back() {
    go('hub')
  }

  // ── Mis datos ──

  async function onProfileSave(field: ProfileField, value: string) {
    await saveProfileField(field.key, value)
  }

  // ── Programas ──

  async function activateProgram(p: Program) {
    await settings.update({ activeProgramId: p.id, currentWeekIdx: 0 })
    toast.show('Programa activado')
  }

  async function duplicateProgram(p: Program) {
    await Storage.saveProgram({ id: await generateId(), name: `${p.name} (copia)`, weeks: JSON.parse(JSON.stringify(p.weeks)), createdAt: new Date().toISOString() })
    toast.show('Programa duplicado')
    loadAll()
  }

  async function deleteProgram(p: Program) {
    await Storage.deleteProgram(p.id)
    if (s.activeProgramId === p.id) await settings.update({ activeProgramId: null })
    toast.show('Programa eliminado')
    loadAll()
  }

  // ── Ajustes ──

  async function updateSettings(patch: Partial<Settings>) {
    await settings.update(patch)
  }

  async function setAccent(color: string) {
    await settings.update({ accentColor: color })
    document.documentElement.style.setProperty('--accent', color)
  }

  async function activateNotifications() {
    if (notificationState() === 'unsupported') return
    const result = await Notification.requestPermission()
    notifState = notificationState()
    if (result === 'granted') {
      toast.show('Notificaciones activadas')
      await subscribePush()
    } else {
      toast.show('Notificaciones desactivadas', true)
    }
  }

  async function sendTestNotification() {
    const title = 'Training with Pedro'
    const body = 'Así te avisa cuando termina el descanso.'
    const sent = await sendPushNotification(title, body, 'test-notification').catch(() => false)
    if (!sent) await notifyWatch(title, body, 'test-notification')
    toast.show('Notificación de prueba enviada')
  }

  // ── Copia de seguridad ──

  function showUnmatched(names: string[]) {
    unmatchedNames = names
    go('sin-coincidencia')
  }
</script>

<div class="screen" id="you">
  {#if !loaded}
    <!-- Pendiente: skeletons (Tú · Nuevo 06) -->
  {:else if view === 'datos'}
    <ProfileData settings={s} onsave={onProfileSave} onback={back} />
  {:else if view === 'programas'}
    <ProgramsScreen
      {programs}
      activeId={s.activeProgramId}
      online={$online}
      onback={back}
      oncreate={() => creator?.openCreate()}
      onimprove={() => activeProgram && creator?.openImprove(activeProgram)}
      onactivate={activateProgram}
      onedit={(p) => creator?.openEditor(p)}
      onduplicate={duplicateProgram}
      ondelete={deleteProgram}
    />
  {:else if view === 'ejercicios'}
    <ExercisesScreen {exercises} logs={allLogs} onback={back} onchanged={loadAll} />
  {:else if view === 'ajustes'}
    <SettingsScreen
      settings={s}
      {notifState}
      onupdate={updateSettings}
      onaccent={setAccent}
      onactivatenotifs={activateNotifications}
      ontestnotif={sendTestNotification}
      onback={back}
    />
  {:else if view === 'copia'}
    <BackupScreen exerciseCount={exercises.length} onchanged={refresh} onunmatched={showUnmatched} onback={back} />
  {:else if view === 'sin-coincidencia'}
    <UnmatchedScreen names={unmatchedNames} {exercises} onchanged={loadAll} onback={() => go('copia')} />
  {:else if firstTime}
    <YouFirstTime
      profileFilled={filledCount(s)}
      exerciseCount={exercises.length}
      onguide={() => guideOpen = true}
      oncreate={() => creator?.openCreate()}
      onnavigate={go}
    />
  {:else}
    <YouHub
      {userName}
      subtitle={profileSubtitle(s)}
      {activeProgram}
      programCount={programs.length}
      profileFilled={filledCount(s)}
      exerciseCount={exercises.length}
      onnavigate={go}
    />
  {/if}
</div>

<ProfileGuide bind:open={guideOpen} settings={s} onsave={onProfileSave} />
<ProgramCreator
  bind:this={creator}
  {programs}
  {userName}
  online={$online}
  onchanged={refresh}
  onshowprograms={() => go('programas')}
/>
