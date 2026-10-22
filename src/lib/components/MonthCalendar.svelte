<script lang="ts">
  import type { CalendarCell } from '$lib/history-view'
  import { WEEKDAY_LETTERS } from '$lib/program-utils'

  // Historial v2: only a trained day takes color. Rest, unlogged and past look
  // the same gray (no red for a missed day); the future is fainter. The tapped
  // day turns white and today carries a white ring.
  let { lead, cells, ghost = false, onselect }: {
    /** Blank cells before the 1st (the grid starts on Monday) */
    lead: number
    cells: CalendarCell[]
    /** No program: the month's shape, nothing to tap */
    ghost?: boolean
    onselect?: (date: Date) => void
  } = $props()
</script>

<div class="cal" class:ghost data-component="MonthCalendar" aria-hidden={ghost ? 'true' : undefined}>
  {#each WEEKDAY_LETTERS as l}<span class="dow">{l}</span>{/each}
  {#each Array(lead) as _}<span></span>{/each}
  {#each cells as c (c.day)}
    <button
      type="button"
      class="cell"
      class:sel={c.sel}
      class:now={c.now}
      data-state={c.state}
      disabled={ghost}
      aria-pressed={c.sel}
      onclick={() => onselect?.(c.date)}
    >{c.day}</button>
  {/each}
</div>

<style>
  .cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; justify-items: center; }
  .dow { height: 24px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; color: var(--text-muted); }
  .cell {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    padding: 0;
    background: none;
    font-family: var(--font-mono);
    font-size: 15px;
    color: var(--text-tertiary);
    cursor: pointer;
  }
  .cell[data-state='future'] { color: var(--text-muted); opacity: 0.6; }
  .cell[data-state='done'] { background: var(--accent); color: var(--bg); font-weight: 600; }
  .cell.now { box-shadow: inset 0 0 0 1.5px var(--text); color: var(--text); }
  .cell.sel { background: var(--text); color: var(--bg); font-weight: 600; opacity: 1; }
  .cell.now[data-state='done']:not(.sel) { color: var(--bg); box-shadow: 0 0 0 2px var(--bg), 0 0 0 3.5px var(--text); }
  .ghost { opacity: 0.35; }
  .ghost .cell { cursor: default; }
  .ghost .cell.now { box-shadow: none; color: var(--text-tertiary); }
</style>
