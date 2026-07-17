<script lang="ts">
  import type { Program } from '$lib/types'

  let {
    program,
    isActive = false,
    accent = '#d4ff3a',
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
    <button class="btn-action" style="background:{accent}22;color:{accent}" onclick={() => onactivate(program.id)}>Activar</button>
  {/if}
  <button class="btn-action btn-dup" onclick={() => onduplicate(program)}>Duplicar</button>
  <button class="btn-action btn-del" onclick={() => ondelete(program)}>Eliminar</button>
</div>

<style>
  .program-item { margin: 0 20px; padding: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .program-name { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; }
  .program-meta { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .btn-action { padding: 8px 14px; border-radius: 8px; border: 0; cursor: pointer; font-size: 13px; font-family: 'Space Grotesk', sans-serif; }
  .btn-dup { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); }
  .btn-del { background: rgba(255,107,107,0.12); color: #ff6b6b; }
  .row { display: flex; gap: 10px; align-items: center; }
  .flex-1 { flex: 1; min-width: 0; }
</style>
