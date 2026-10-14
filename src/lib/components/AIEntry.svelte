<script lang="ts">
  import Icon from './Icon.svelte'

  let { title, desc = '', ai = true, disabled = false, id = undefined, onclick }: {
    title: string
    desc?: string
    /** false = the same big option without the AI look (e.g. «Desde cero») */
    ai?: boolean
    disabled?: boolean
    id?: string
    onclick: () => void
  } = $props()
</script>

<button {id} type="button" class="opt" class:ai class:dis={disabled} {disabled} {onclick} data-component="AIEntry">
  {#if ai}<span class="ai-i"><Icon name="spark" size={18} /></span>{/if}
  <span class="txt"><b>{title}</b>{#if desc}<span class="d">{desc}</span>{/if}</span>
  <span class="chev"><Icon name="chev" size={16} /></span>
</button>

<style>
  .opt {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 76px;
    padding: 12px 14px 12px 18px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--cv-fill-2);
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
  }
  .opt.ai {
    grid-template-columns: 40px minmax(0, 1fr) auto;
    padding-left: 14px;
    background: linear-gradient(135deg, var(--cv-accent-wash), var(--cv-accent-wash-2) 60%);
    box-shadow: inset 0 0 0 1px var(--cv-accent-line);
  }
  .ai-i { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--cv-accent-tint); color: var(--accent); }
  .txt { min-width: 0; }
  b { display: block; font-size: 17px; letter-spacing: -0.2px; }
  .d { display: block; margin-top: 4px; font-size: 13px; line-height: 1.4; color: var(--text-tertiary); text-wrap: pretty; }
  .chev { display: grid; color: var(--text-muted); }
  .ai .chev { color: var(--accent); }
  .dis { opacity: 0.4; cursor: default; }
  .ai.dis { background: var(--cv-fill-2); box-shadow: none; }
  .ai.dis .ai-i { background: var(--cv-fill-2); color: var(--text-tertiary); }
  .ai.dis .chev { color: var(--text-muted); }
</style>
