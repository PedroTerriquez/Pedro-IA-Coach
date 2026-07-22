<script lang="ts">
  import { buildAIDictionary } from '$lib/brain/dictionary'
  import { buildImportPrompt, buildProgramCoachPrompt } from '$lib/brain/prompts'
  import { buildUserProfile } from '$lib/ai'
  import { PUSH_SERVER_URL } from '$lib/config'
  import { APP_VERSION } from '$lib/pwa'
  import { subscribePush } from '$lib/push'
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import * as Storage from '$lib/storage'
  import { generateId, getAll, put } from '$lib/db'
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Icon from '$lib/components/Icon.svelte'

  import SegmentedControl from '$lib/components/SegmentedControl.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import StatBlock from '$lib/components/StatBlock.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import ProfileCard from '$lib/components/ProfileCard.svelte'
  import QuickSettingsCard from '$lib/components/QuickSettingsCard.svelte'
  import ProgramCard from '$lib/components/ProgramCard.svelte'
  import CoachIACard from '$lib/components/CoachIACard.svelte'
  import ExerciseListItem from '$lib/components/ExerciseListItem.svelte'
  import MaintenanceCard from '$lib/components/MaintenanceCard.svelte'
  import NewExerciseForm from '$lib/components/NewExerciseForm.svelte'
  import ProgramCreateForm from '$lib/components/ProgramCreateForm.svelte'
  import Button from '$lib/components/Button.svelte'
  import TextArea from '$lib/components/TextArea.svelte'
  import DataImportSection from '$lib/components/DataImportSection.svelte'
  import DataExportSection from '$lib/components/DataExportSection.svelte'
  import type { Exercise, ExerciseLog, Program, Settings } from '$lib/types'

  let activeTab = $state<'perfil' | 'programas' | 'ejercicios' | 'datos'>('perfil')
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let programs = $state<Program[]>([])
  let loaded = $state(false)
  let userName = $state('Pedro')
  let height = $state('')
  let weight = $state('')
  let sex = $state('')
  let age = $state('')
  let goal = $state('')
  let experience = $state('')
  let occupation = $state('')

  // Exercise tab state
  let exerciseSearch = $state('')
  let showNewExercise = $state(false)
  let newExerciseName = $state('')
  let newExerciseMuscle = $state('')
  let expandedExerciseId = $state<string | null>(null)
  let editingExerciseId = $state<string | null>(null)
  let editName = $state('')
  let editMuscle = $state('')
  let editImgUrl = $state('')
  let editTips = $state('')
  let editAlts = $state<{ name: string; reason: string }[]>([])

  // Program tab state
  let newProgramName = $state('')
  let coachInput = $state('')
  let coachStatus = $state('')
  let coachResponseVisible = $state(false)
  let coachResponseText = $state('')
  let coachProvider = $state('')

  // Datos tab state
  let aiInput = $state('')
  let aiStatus = $state('')
  let importingAI = $state(false)
  let jsonImportStatus = $state('')
  let jsonExportStatus = $state('')
  let dictMigrateStatus = $state('')
  let dictSkippedNames = $state<string[]>([])
  let showSkippedOverlay = $state(false)
  let exercisesImportStatus = $state('')
  let exercisesExportStatus = $state('')

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  let stats = $derived.by(() => {
    if (!loaded || allLogs.length === 0) return { streak: 0, totalWorkouts: 0, weeks: 0, distinctExercises: 0 }
    const dates = [...new Set(allLogs.map(l => l.date))].sort()
    const distinctIds = new Set(allLogs.map(l => l.exerciseId))
    let streakCount = 0
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    let checkDate = new Date(today)
    for (let i = dates.length - 1; i >= 0; i--) {
      const expected = checkDate.toISOString().slice(0, 10)
      if (dates[i] === expected) {
        streakCount++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dates[i] < expected) {
        if (i === dates.length - 1 && dates[i] === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
    }
    const firstDate = new Date(dates[0])
    const weeksDiff = Math.max(1, Math.floor((today.getTime() - firstDate.getTime()) / (7 * 86400000)))
    return { streak: streakCount, totalWorkouts: dates.length, weeks: weeksDiff, distinctExercises: distinctIds.size }
  })

  let filteredExercises = $derived(
    exercises.filter(ex =>
      !exerciseSearch ||
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      (ex.muscle || '').toLowerCase().includes(exerciseSearch.toLowerCase())
    )
  )

  function setTab(tab: typeof activeTab) {
    activeTab = tab
  }

  function toLocalDateStr(date: Date): string {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  function getToday(): string { return toLocalDateStr(new Date()) }

  async function loadAll() {
    const [exs, logs, progs] = await Promise.all([
      Storage.getExercises(),
      Storage.getAllLogs(),
      Storage.getPrograms()
    ])
    exercises = exs.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    allLogs = logs
    programs = progs
    const s = await Storage.getSettings()
    userName = s.userName || 'Pedro'
    height = s.height || ''
    weight = s.weight || ''
    sex = s.sex || ''
    age = s.age || ''
    goal = s.goal || ''
    experience = s.experience || ''
    occupation = s.occupation || ''
    loaded = true
  }

  onMount(() => { loadAll() })

  function refresh() { loadAll() }

  // ── Perfil tab ──

  async function saveProfileField(field: string, value: string) {
    const s = await Storage.getSettings()
    ;(s as any)[field] = value
    await Storage.saveSettings(s)
    settings.update({ [field]: value } as any)
  }

  async function toggleUnits() {
    const newUnits = units === 'kg' ? 'lb' : 'kg'
    await settings.update({ units: newUnits })
  }

  async function onAccentChange(val: string) {
    await settings.update({ accentColor: val })
    document.documentElement.style.setProperty('--accent', val)
  }

  async function toggleWatch() {
    await settings.update({ hasWatch: !$settings.hasWatch })
  }

  async function onNotifClick() {
    if (Notification.permission === 'granted') {
      toast.show('Notificaciones ya activadas')
      return
    }
    if (Notification.permission === 'denied') {
      toast.show('Permiso denegado. Actívalo en Ajustes del sistema.', true)
      return
    }
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      toast.show('Notificaciones activadas')
      if (typeof subscribePush === 'function') await subscribePush()
    } else {
      toast.show('Notificaciones denegadas', true)
    }
  }

  async function toggleLang() {
    const s = await Storage.getSettings()
    const newLang = s.language === 'en' ? 'es' : 'en'
    await settings.update({ language: newLang })
  }

  // ── Programas tab ──

  async function createNewProgram() {
    const name = newProgramName.trim() || 'Nuevo programa'
    const program: Program = {
      id: await generateId(),
      name,
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'VOLUMEN',
        days: [
          { name: 'Día 1', subtitle: '', duration: 60, exercises: [] },
          { name: 'Día 2', subtitle: '', duration: 60, exercises: [] },
          { name: 'Día 3', subtitle: '', duration: 60, exercises: [] }
        ]
      }]
    }
    await Storage.saveProgram(program)
    newProgramName = ''
    toast.show('Programa creado')
    refresh()
  }

  async function activateProgram(id: string) {
    await settings.update({ activeProgramId: id })
    toast.show('Programa activado')
    refresh()
  }

  async function duplicateProgram(p: Program) {
    const dup: Program = {
      id: await generateId(),
      name: p.name + ' (copia)',
      weeks: JSON.parse(JSON.stringify(p.weeks))
    }
    await Storage.saveProgram(dup)
    toast.show('Programa duplicado')
    refresh()
  }

  async function deleteProgram(p: Program) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return
    await Storage.deleteProgram(p.id)
    const s = await Storage.getSettings()
    if (s.activeProgramId === p.id) {
      await settings.update({ activeProgramId: null })
    }
    toast.show('Programa eliminado')
    refresh()
  }

  async function submitCoach() {
    const text = coachInput.trim()
    if (!text) { coachStatus = '⚠️ Escribe tu pregunta o petición'; return }
    const activeProgram = programs.find(p => p.id === $settings.activeProgramId)
    if (!activeProgram) { coachStatus = '⚠️ No hay un programa activo'; return }
    coachStatus = '⏳ Consultando al coach…'
    coachResponseVisible = false
    try {
      const s = await Storage.getSettings()
      const language = s.language === 'en' ? 'en' : 'es'
      const res = await fetch(`${PUSH_SERVER_URL}/api/ai/program-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          program: activeProgram,
          settings: $settings,
          language,
          userProfile: buildUserProfile(s),
          systemPrompt: buildProgramCoachPrompt(language),
          dictionary: buildAIDictionary()
        })
      })
      const data = await res.json()
      if (data.program) {
        const prog: Program = {
          id: await generateId(),
          name: data.program_name || data.program.name || 'Programa Coach',
          weeks: data.program.weeks || []
        }
        if (prog.weeks.length > 0) {
          for (const week of prog.weeks) {
            for (const day of week.days) {
              for (const ex of day.exercises) {
                const resolved = await Storage.findOrCreateExerciseByName(
                  (ex as any)._exerciseName || ex.exerciseId, (ex as any).muscle || '', { noFuzzy: true }
                )
                ex.exerciseId = resolved.id
              }
            }
          }
          await Storage.saveProgram(prog)
          await settings.update({ activeProgramId: prog.id })
          coachStatus = `✅ Nuevo programa "${prog.name}" creado y activado`
          refresh()
        } else {
          coachResponseText = 'El programa generado no tiene semanas válidas. Intenta de nuevo.'
          coachResponseVisible = true
          coachStatus = ''
        }
      } else {
        coachResponseText = data.message || 'Listo.'
        coachProvider = data._provider || 'llama'
        coachResponseVisible = true
        coachStatus = ''
      }
    } catch (err: any) {
      coachStatus = `❌ ${err.message}`
    }
    coachInput = ''
  }

  // ── Ejercicios tab ──

  function resetNewExercise() {
    showNewExercise = false
    newExerciseName = ''
    newExerciseMuscle = ''
  }

  async function saveNewExercise() {
    const name = newExerciseName.trim()
    if (!name) return
    const ex: Exercise = {
      id: await generateId(), name, muscle: newExerciseMuscle.trim(),
      imgUrl: '', gifUrl: '', tips: [], alternatives: []
    }
    await Storage.saveExercise(ex)
    resetNewExercise()
    toast.show('Ejercicio creado')
    refresh()
  }

  function beginEdit(ex: Exercise) {
    editingExerciseId = ex.id
    editName = ex.name
    editMuscle = ex.muscle
    editImgUrl = ex.imgUrl || ''
    editTips = (ex.tips || []).join('\n')
    editAlts = (ex.alternatives || []).map(a => ({ ...a }))
  }

  function cancelEdit() {
    editingExerciseId = null
  }

  async function saveEdit(ex: Exercise) {
    const updated: Exercise = {
      ...ex,
      name: editName.trim() || ex.name,
      muscle: editMuscle.trim(),
      imgUrl: editImgUrl.trim(),
      tips: editTips.split('\n').map(l => l.trim()).filter(Boolean),
      alternatives: editAlts.filter(a => a.name.trim())
    }
    await Storage.saveExercise(updated)
    editingExerciseId = null
    toast.show('Ejercicio actualizado')
    refresh()
  }

  function addAlt() {
    editAlts = [...editAlts, { name: '', reason: '' }]
  }

  function removeAlt(i: number) {
    editAlts = editAlts.filter((_, idx) => idx !== i)
  }

  async function deleteExerciseConfirm(ex: Exercise) {
    if (!confirm(`¿Eliminar "${ex.name}"? Esto eliminará todos los registros.`)) return
    await Storage.deleteExercise(ex.id)
    toast.show('Ejercicio eliminado')
    refresh()
  }

  function toggleExpanded(id: string) {
    expandedExerciseId = expandedExerciseId === id ? null : id
  }

  // ── Datos tab ──

  async function submitAIImport() {
    const text = aiInput.trim()
    if (!text) { aiStatus = '⚠️ Pega tu rutina primero'; return }
    importingAI = true
    aiStatus = '⏳ Procesando…'
    try {
      const s = await Storage.getSettings()
      const language = s.language === 'en' ? 'en' : 'es'
      const res = await fetch(`${PUSH_SERVER_URL}/api/ai/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          systemPrompt: buildImportPrompt(language),
          language,
          userProfile: buildUserProfile(s),
          dictionary: buildAIDictionary()
        })
      })
      const data = await res.json()
      if (!data.weeks || data.weeks.length === 0) throw new Error('La IA no pudo generar un programa válido')
      for (const week of data.weeks) {
        for (const day of week.days) {
          for (const ex of day.exercises) {
            const resolved = await Storage.findOrCreateExerciseByName(
              ex.name || ex.exerciseId, ex.muscle || '', { noFuzzy: true }
            )
            ex.exerciseId = resolved.id
          }
        }
      }
      const program: Program = {
        id: await generateId(),
        name: data.program_name || 'Importado con IA',
        weeks: data.weeks
      }
      await Storage.saveProgram(program)
      await settings.update({ activeProgramId: program.id })
      aiStatus = `✅ Importado "${program.name}" con ${program.weeks.length} semana(s)`
      aiInput = ''
      refresh()
    } catch (err: any) {
      aiStatus = `❌ ${err.message}`
    } finally {
      importingAI = false
    }
  }

  async function onExercisesImport(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : data.exercises || []
      let count = 0
      for (const item of list) {
        if (item.name) {
          if (!item.id) item.id = await generateId()
          await put('exercises', item)
          count++
        }
      }
      exercisesImportStatus = `✅ ${count} ejercicios importados`
      refresh()
    } catch (err: any) {
      exercisesImportStatus = `❌ ${err.message}`
    }
    input.value = ''
  }

  async function onLogsImport(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const result = await Storage.importLogsAndSettings(text)
      const parts: string[] = []
      if (result.exercises) parts.push(`${result.exercises} ejercicios`)
      if (result.programs) parts.push(`${result.programs} programas`)
      if (result.logs) parts.push(`${result.logs} logs`)
      jsonImportStatus = `✅ Importados ${parts.join(', ')}`
      refresh()
    } catch (err: any) {
      jsonImportStatus = `❌ ${err.message}`
    }
    input.value = ''
  }

  async function onExercisesExport() {
    try {
      const all = await getAll<Exercise>('exercises')
      const json = JSON.stringify(all, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ejercicios-${getToday()}.json`
      a.click()
      URL.revokeObjectURL(url)
      exercisesExportStatus = `✅ ${all.length} ejercicios exportados`
    } catch (err: any) {
      exercisesExportStatus = `❌ ${err.message}`
    }
  }

  async function onLogsExport() {
    try {
      const json = await Storage.exportLogsAndSettings()
      const parsed = JSON.parse(json)
      const parts: string[] = []
      if (parsed.exercises?.length) parts.push(`${parsed.exercises.length} ejercicios`)
      if (parsed.programs?.length) parts.push(`${parsed.programs.length} programas`)
      if (parsed.exerciseLogs?.length) parts.push(`${parsed.exerciseLogs.length} logs`)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-backup-${getToday()}.json`
      a.click()
      URL.revokeObjectURL(url)
      jsonExportStatus = `✅ Exportado (${parts.join(', ')})`
    } catch (err: any) {
      jsonExportStatus = `❌ ${err.message}`
    }
  }

  async function runDictMigration(force: boolean) {
    dictMigrateStatus = '⏳ Aplicando…'
    try {
      const result = await Storage.migrateExercisesToDictionary({ force })
      if (result.dictMissing) {
        dictMigrateStatus = '❌ Diccionario no cargado'
      } else if (result.alreadyDone) {
        dictMigrateStatus = '⚠️ Ya aplicado — usa Forzar para re-ejecutar'
      } else {
        dictMigrateStatus = `✅ Actualizados ${result.migrated} · fusionados ${result.merged} · sin match ${result.skipped}`
        dictSkippedNames = result.skippedNames || []
        if (dictSkippedNames.length) dictMigrateStatus += `. ${dictSkippedNames.length} sin match en diccionario.`
      }
      refresh()
    } catch (err: any) {
      dictMigrateStatus = `❌ ${err.message}`
    }
  }

  function getTotalExercises(program: Program): number {
    return program.weeks.reduce((s, w) => s + w.days.reduce((sd, d) => sd + d.exercises.length, 0), 0)
  }

  function getLastLogWeight(exerciseId: string): string {
    const logs = allLogs.filter(l => l.exerciseId === exerciseId)
    if (logs.length === 0) return ''
    const last = logs[logs.length - 1]
    return `${last.weight}${last.units || units}`
  }

  const APP_VERSION_STR = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v1.70'
</script>

<div class="page">
  <div class="page-header">
    <div class="page-header-eyebrow">Perfil</div>
    <div class="page-header-title">
      <span id="user-name" class="username-field" contenteditable role="textbox" aria-multiline="false" tabindex="0" style="caret-color:{accent}"
        onblur={async (e) => { const v = (e.target as HTMLElement).textContent?.trim() || 'Pedro'; userName = v; await saveProfileField('userName', v) }}
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
      >{userName}</span>
      <button id="user-edit-btn" class="edit-btn" aria-label="Editar nombre"
        onclick={() => { const el = document.getElementById('user-name'); if (el) { el.focus(); const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range) } }}>
        <Icon name="pencil" size={22} color="rgba(255,255,255,0.3)" />
      </button>
    </div>
  </div>

  <div class="section-pad">
    <SegmentedControl
      options={[
        { label: 'Perfil', value: 'perfil' },
        { label: 'Programas', value: 'programas' },
        { label: 'Ejercicios', value: 'ejercicios' },
        { label: 'Datos', value: 'datos' }
      ]}
      bind:value={activeTab}
    />
  </div>

  <div class="tab-content">
    {#if activeTab === 'perfil'}
      <div class="section-label-wrap"><SectionLabel {accent}>Mis datos</SectionLabel></div>
      <ProfileCard
        {height} {weight} {sex} {age} {goal} {experience} {occupation}
        {accent}
        onsave={saveProfileField}
      />

      <div class="section-label-wrap"><SectionLabel {accent}>Ajustes rápidos</SectionLabel></div>
      <QuickSettingsCard
        {units} {accent}
        hasWatch={$settings.hasWatch}
        notifPermission={typeof Notification !== 'undefined' ? Notification.permission : 'default'}
        language={$settings.language || 'es'}
        ontoggleunits={toggleUnits}
        onaccentchange={onAccentChange}
        ontogglewatch={toggleWatch}
        onnotifclick={onNotifClick}
        togglelang={toggleLang}
      />

      {#if loaded}
        <div class="section-label-wrap"><SectionLabel {accent}>Estadísticas</SectionLabel></div>
        <div class="card stats-card">
          <StatBlock value={stats.streak} label="Racha" size="md" />
          <StatBlock value={stats.totalWorkouts} label="Entrenos" size="md" />
          <StatBlock value={stats.weeks} label="Semanas" size="md" />
          <StatBlock value={stats.distinctExercises} label="Ejercicios" size="md" />
        </div>
      {/if}

      <div class="footer-bar">
        <div class="version-text">{APP_VERSION_STR}</div>
        <Button variant="ghost" onclick={refresh}>↻</Button>
      </div>

    {:else if activeTab === 'programas'}
      <div class="section-pad-sm">
        <ProgramCreateForm
          bind:value={newProgramName}
          oncreate={createNewProgram}
        />
      </div>

      {#if programs.length === 0}
        <EmptyState message="No hay programas todavía. Crea o importa uno." />
      {:else}
        <div class="program-list">
          {#each programs as p (p.id)}
            <ProgramCard
              program={p}
              isActive={$settings.activeProgramId === p.id}
              {accent}
              totalExercises={getTotalExercises(p)}
              onactivate={activateProgram}
              onduplicate={duplicateProgram}
              ondelete={deleteProgram}
            />
          {/each}
        </div>
      {/if}

      <CoachIACard
        {accent}
        {coachInput}
        {coachStatus}
        {coachResponseVisible}
        {coachResponseText}
        {coachProvider}
        oninput={(val) => coachInput = val}
        onsubmit={submitCoach}
      />

    {:else if activeTab === 'ejercicios'}
      <div class="ex-header">
        <div id="ex-count" class="ex-count">{exercises.length} ejercicios</div>
        <Button variant="primary" {accent} onclick={() => showNewExercise = !showNewExercise}>+ Nuevo</Button>
      </div>

      {#if showNewExercise}
        <NewExerciseForm
          bind:name={newExerciseName}
          bind:muscle={newExerciseMuscle}
          onsave={saveNewExercise}
          oncancel={resetNewExercise}
        />
      {/if}

      <div class="exercise-search-wrap"><SearchInput value={exerciseSearch} placeholder="Buscar ejercicio…" oninput={(val) => exerciseSearch = val} /></div>

      {#if loaded && exercises.length === 0}
        <EmptyState message="No hay ejercicios todavía. Crea tu primero." />
      {:else if filteredExercises.length === 0}
        <EmptyState message="Ningún ejercicio coincide con la búsqueda." />
      {:else}
        <div class="exercise-list-wrap">
          {#each filteredExercises as ex (ex.id)}
            <ExerciseListItem
              exercise={ex}
              expanded={expandedExerciseId === ex.id}
              editing={editingExerciseId === ex.id}
              {editName} {editMuscle} {editImgUrl} {editTips} {editAlts}
              ontoggle={toggleExpanded}
              onbeginedit={() => beginEdit(ex)}
              oncanceledit={cancelEdit}
              onsaveedit={() => saveEdit(ex)}
              ondelete={deleteExerciseConfirm}
              onaddalt={addAlt}
              onremovealt={removeAlt}
              oneditnameinput={(val) => editName = val}
              oneditmuscleinput={(val) => editMuscle = val}
              oneditimgurlinput={(val) => editImgUrl = val}
              onedittipsinput={(val) => editTips = val}
              oneditaltschange={(alts) => editAlts = alts}
            />
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'datos'}
      <div class="section-label-wrap"><SectionLabel {accent}>Importar con IA</SectionLabel></div>
      <div class="card section-card">
        <div class="card-content">
          <div class="card-title">Pega tu rutina en texto</div>
          <div class="card-subtitle">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
          <div class="ai-textarea-wrap">
            <TextArea value={aiInput} rows={8} placeholder="Ejemplo:&#10;Lunes - Pecho y Triceps&#10;Press banca 4x8-10&#10;Press inclinado 3x10&#10;Aperturas 3x12&#10;Fondos 3x10&#10;Patada triceps 3x12" oninput={(val) => aiInput = val} />
          </div>
          <div id="ai-status" class="status-text">{aiStatus}</div>
        </div>
        <Button variant="primary" {accent} fullWidth onclick={submitAIImport} disabled={importingAI}>{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</Button>
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Importar</SectionLabel></div>
      <div class="card section-card">
        <DataImportSection
          {accent}
          {exercisesImportStatus}
          {jsonImportStatus}
          onexercisesimport={onExercisesImport}
          onlogsimport={onLogsImport}
        />
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Exportar</SectionLabel></div>
      <div class="card section-card">
        <DataExportSection
          {accent}
          {exercisesExportStatus}
          {jsonExportStatus}
          onexercisesexport={onExercisesExport}
          onlogsexport={onLogsExport}
        />
      </div>

      <div class="section-label-wrap"><SectionLabel {accent}>Mantenimiento</SectionLabel></div>
      <MaintenanceCard
        {accent}
        migrateStatus={dictMigrateStatus}
        skippedNames={dictSkippedNames}
        onmigrate={() => runDictMigration(false)}
        onforce={() => runDictMigration(true)}
        onshowskipped={() => showSkippedOverlay = true}
      />

      <div class="footer-bar footer-bar-bot">
        <div class="version-text">{APP_VERSION_STR}</div>
        <Button variant="ghost" onclick={refresh}>↻</Button>
      </div>
    {/if}
  </div>
</div>

<CenterDialog open={showSkippedOverlay} onclose={() => showSkippedOverlay = false}>
  <div class="dialog-header">
    <div class="dialog-title">Sin coincidencia en diccionario</div>
    <button id="skipped-close-btn" class="dialog-close" onclick={() => showSkippedOverlay = false}>✕</button>
  </div>
  <div class="stack">
    {#each dictSkippedNames as name}
      <div class="skipped-item">{name}</div>
    {/each}
  </div>
</CenterDialog>

<style>
  .tab-content { margin-top: 20px; }
  .section-label-wrap { margin-bottom: 10px; }
  .section-card { margin: 0 20px; }
  .card-content { padding: 14px 16px; }
  .page-header-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .username-field { outline: none; border: 0; display: inline-block; min-width: 50px; }
  .edit-btn { background: none; border: 0; cursor: pointer; flex-shrink: 0; margin-top: 6px; padding: 0; }
  .section-pad { margin: 0 20px; }
  .section-pad-sm { padding: 0 20px; margin-bottom: 12px; }
  .stats-card { margin: 0 20px; padding: 16px 14px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
  .footer-bar { display: flex; align-items: center; justify-content: space-between; margin: 16px 20px 0; }
  .footer-bar-bot { margin: 16px 20px 40px; }
  .version-text { font-size: 10px; color: rgba(255,255,255,0.3); font-family: var(--font-mono); }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .program-list { padding: 0 20px; display: flex; flex-direction: column; gap: 8px; }
  .ai-textarea-wrap { margin-top: 10px; }
  .ex-header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px 12px; }
  .ex-count { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 500; }
  .exercise-list-wrap { display: flex; flex-direction: column; gap: 8px; padding: 0 20px 20px; }
  .exercise-search-wrap { margin: 0 20px 10px; }
  .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .dialog-title { font-family: var(--font-sans); font-size: 16px; font-weight: 600; color: var(--text); }
  .dialog-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 18px; padding: 4px; }
  .skipped-item { padding: 10px 12px; background: rgba(255,255,255,0.04); border-radius: 10px; font-size: 13px; color: var(--text); font-family: var(--font-sans); }
</style>
