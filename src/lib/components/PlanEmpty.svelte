<script lang="ts">
  // Plan without a program: what will show up here, and the shape of the week
  // drawn as ghost rows. The way forward lives in the dock.
  const GHOST_ROWS = 3
</script>

<div class="empty" data-component="PlanEmpty">
  <div class="card">
    <h2>Aún no tienes un programa</h2>
    <p>Cuando lo armes, aquí verás tu semana: qué toca cada día y cuánto llevas.</p>
  </div>
  <div class="ghost" aria-hidden="true">
    {#each Array(GHOST_ROWS) as _}
      <div class="row"><i class="badge"></i><span class="lines"><i style="width:60%;height:14px"></i><i style="width:35%;height:10px"></i></span></div>
    {/each}
  </div>
</div>

<style>
  .empty { display: flex; flex-direction: column; gap: 20px; }
  .card { display: flex; flex-direction: column; gap: 12px; padding: 24px 20px; border-radius: var(--radius-2xl); border: 1px dashed rgba(255, 255, 255, 0.12); }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; }
  p { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .ghost { display: flex; flex-direction: column; gap: 8px; opacity: 0.5; }
  .row { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 14px; min-height: 68px; padding: 10px 16px 10px 12px; border-radius: var(--radius-xl); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  .lines { display: flex; flex-direction: column; gap: 8px; }
  i { display: block; border-radius: 10px; background: rgba(255, 255, 255, 0.06); }
  .badge { width: 44px; height: 44px; border-radius: var(--radius-md); }
</style>
