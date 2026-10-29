<script lang="ts">
  // 44 px square with the weekday in mono caps over the day of the month.
  let { weekday, date, fill = 1 }: {
    /** «Lun» */
    weekday: string
    date: number
    /** Background: fill-1, fill-2, or none (rest days) */
    fill?: 1 | 2 | 'none'
  } = $props()
</script>

<span class="badge" class:f2={fill === 2} class:none={fill === 'none'} data-component="DayBadge"><span>{weekday}</span><b>{date}</b></span>

<style>
  .badge {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--cv-fill-1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: var(--font-mono);
  }
  .f2 { background: var(--cv-fill-2); }
  .none { background: transparent; }
  .badge span { font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .badge b { font-size: 15px; font-weight: 500; line-height: 1; }
</style>
