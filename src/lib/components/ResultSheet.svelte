<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ResultInfo } from '$lib/you-data'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import StatsGrid from './StatsGrid.svelte'
  import StatBlock from './StatBlock.svelte'
  import Lead from './Lead.svelte'

  // Result of an action (backup, import, dictionary…): icon, sentence, file and
  // the next step. The error variant offers a retry plus «Cerrar».
  let { open = $bindable(false), title, result, primaryLabel = 'Listo', retryLabel = 'Intentar otra vez', onprimary = undefined, onretry = undefined, onclose = () => {}, children }: {
    open: boolean
    title: string
    result: ResultInfo | null
    primaryLabel?: string
    retryLabel?: string
    onprimary?: () => void
    onretry?: () => void
    onclose?: () => void
    children?: Snippet
  } = $props()

  function close() {
    open = false
    onclose()
  }
</script>

<Sheet bind:open {title} onclose={close}>
  {#if result}
  <div class="result" data-component="ResultSheet" data-ok={result.ok}>
    <div class="rs">
      <div class="rs-i" class:bad={!result.ok}><Icon name={result.ok ? 'check' : 'x'} size={result.ok ? 24 : 22} /></div>
      <div class="q">{result.heading}</div>
      {#if result.text}<Lead>{result.text}</Lead>{/if}
    </div>
    {#if result.file}
      <div class="file"><b>{result.file.name}</b><span>{result.file.meta}</span></div>
    {/if}
    {#if result.stats?.length}
      <StatsGrid columns={result.stats.length === 2 ? 2 : 3}>
        {#each result.stats as s}<StatBlock variant="tile" size="md" value={s.value} label={s.label} />{/each}
      </StatsGrid>
    {/if}
    {#if result.rows?.length}
      <div class="grp">
        {#each result.rows as r}
          <div class="kv"><span><span class="l">{r.label}</span>{#if r.sub}<span class="s">{r.sub}</span>{/if}</span><span class="v">{r.value}</span></div>
        {/each}
      </div>
    {/if}
    {@render children?.()}
    {#if result.ok}
      <Button size="lg" variant="primary" onclick={() => (onprimary ? onprimary() : close())}>{primaryLabel}</Button>
    {:else}
      <div class="acts">
        {#if onretry}<Button size="lg" variant="primary" onclick={onretry}>{retryLabel}</Button>{/if}
        <Button size="lg" variant="text" style="align-self:center" onclick={close}>Cerrar</Button>
      </div>
    {/if}
  </div>
  {/if}
</Sheet>

<style>
  .result { display: flex; flex-direction: column; gap: 22px; }
  .rs { display: flex; flex-direction: column; gap: 10px; }
  .rs-i { width: 48px; height: 48px; margin-bottom: 4px; border-radius: 50%; display: grid; place-items: center; background: var(--cv-fill-on); color: var(--text); }
  .rs-i.bad { background: var(--cv-danger-bg); color: var(--cv-danger-text); }
  .q { font-size: 24px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; }
  .file { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 56px; padding: 0 16px; border-radius: var(--cv-radius-field); background: var(--cv-fill-1); }
  .file b { font-family: var(--font-mono); font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file span { font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); }
  .grp { display: flex; flex-direction: column; border-radius: var(--radius-xl); overflow: hidden; background: var(--cv-fill-1); }
  .kv { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 56px; padding: 8px 16px; }
  .kv + .kv { border-top: 0.5px solid var(--border-medium); }
  .l { display: block; font-size: 16px; font-weight: 500; }
  .s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
  .v { font-family: var(--font-mono); font-size: 15px; color: var(--text-secondary); }
  .acts { display: flex; flex-direction: column; gap: 4px; }
</style>
