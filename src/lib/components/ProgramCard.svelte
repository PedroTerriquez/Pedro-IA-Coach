<script lang="ts">
  import type { Program } from '$lib/types'
  import Button from './Button.svelte'

  let {
    program,
    isActive = false,
    accent = 'var(--accent)',
    totalExercises = 0,
    onactivate = () => {},
    onduplicate = () => {},
    ondelete = () => {}
  }: {
    program: Program
    isActive?: boolean
    accent?: string
    totalExercises?: number
    onactivate?: (id: string) => void
    onduplicate?: (p: Program) => void
    ondelete?: (p: Program) => void
  } = $props()
</script>

<div class="card program-item" data-program-id={program.id}>
  <div class="flex-1">
    <div class="row">
      <div class="program-name">{program.name}</div>
      {#if isActive}
        <span class="pill" style="background:{accent}22;color:{accent}">ACTIVO</span>
      {/if}
    </div>
    <div class="program-meta">{program.weeks.length} semana(s) · {totalExercises} ejercicios totales</div>
  </div>
  {#if !isActive}
    <Button variant="secondary" style="background:{accent}22;color:{accent}" onclick={() => onactivate(program.id)}>Activar</Button>
  {/if}
  <Button variant="secondary" onclick={() => onduplicate(program)}>Duplicar</Button>
  <Button variant="danger" onclick={() => ondelete(program)}>Eliminar</Button>
</div>

<style>
  .program-item { margin: 0 20px; padding: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .program-name { font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; }
  .program-meta { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .row { display: flex; gap: 10px; align-items: center; }
  .flex-1 { flex: 1; min-width: 0; }
</style>
