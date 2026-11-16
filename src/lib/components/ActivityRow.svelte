<script lang="ts">
  import Icon from './Icon.svelte'
  import SportIcon from './SportIcon.svelte'
  import { activityName, activitySub, num } from '$lib/activities'
  import type { Activity } from '$lib/types'

  // One activity of the day: «Correr · 32 min / 5.2 km · 6:09 /km». In Hoy it
  // opens the edit sheet (the only way to edit or delete); in Historial it is
  // read-only.
  let { activity, onedit = null }: { activity: Activity; onedit?: (() => void) | null } = $props()
</script>

{#snippet body()}
  <SportIcon sport={activity.sport} size={18} tile={32} />
  <span class="mn">
    <span class="t">{activityName(activity)} · <b>{num(activity.minutes)} min</b></span>
    <span class="s">{activitySub(activity)}</span>
  </span>
{/snippet}

{#if onedit}
  <button type="button" class="act" data-component="ActivityRow" data-sport={activity.sport} onclick={onedit}>
    {@render body()}
    <span class="c">Editar <Icon name="chev" size={16} /></span>
  </button>
{:else}
  <div class="act ro" data-component="ActivityRow" data-sport={activity.sport}>{@render body()}</div>
{/if}

<style>
  .act {
    width: 100%; min-height: 68px; padding: 10px 16px 10px 14px;
    display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 14px; align-items: center;
    border: 0; border-radius: 20px; background: var(--surface); box-shadow: inset 0 0 0 1.5px var(--act);
    color: var(--text); font-family: inherit; text-align: left; cursor: pointer;
  }
  .act.ro { grid-template-columns: 32px minmax(0, 1fr); cursor: default; }
  .mn { min-width: 0; display: block; }
  .t { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t b { font-family: var(--font-mono); font-weight: 500; letter-spacing: -0.04em; }
  .s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; white-space: nowrap; }
  @media (max-width: 340px) { .act { gap: 12px; padding: 10px 12px; } }
</style>
