<script lang="ts">
  let {
    done = 0,
    total = 1,
    accent = 'var(--accent)'
  }: {
    done?: number
    total?: number
    accent?: string
  } = $props()

  let pct = $derived(total > 0 ? (done / total) * 100 : 0)
</script>

<div class="progress-bar">
  <div class="track">
    <div class="fill" style="width:{pct}%;background:{accent}"></div>
  </div>
  <span class="label" style="color:{done > 0 ? accent : 'rgba(255,255,255,0.45)'}">{done}/{total}</span>
</div>

<style>
  .progress-bar {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.1);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s;
  }
  .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.4px;
  }
</style>
