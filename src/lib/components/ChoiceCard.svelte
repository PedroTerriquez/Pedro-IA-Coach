<script lang="ts">
  import Icon from './Icon.svelte'

  // A 68 px choice inside a sheet: icon, what it is, what it does, chevron.
  let { icon, title, desc = '', id = undefined, onclick }: {
    icon: string
    title: string
    desc?: string
    id?: string
    onclick: () => void
  } = $props()
</script>

<button {id} type="button" class="opt" data-component="ChoiceCard" {onclick}>
  <Icon name={icon} size={22} />
  <span class="min0"><b>{title}</b>{#if desc}<span class="d">{desc}</span>{/if}</span>
  <span class="chev"><Icon name="chev" size={16} /></span>
</button>

<style>
  .opt {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 68px;
    padding: 12px 18px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--cv-fill-5);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  .min0 { min-width: 0; }
  b { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .d { display: block; font-size: 13px; line-height: 1.4; color: var(--text-tertiary); margin-top: 3px; text-wrap: pretty; }
  .chev { display: grid; color: var(--text-muted); }
</style>
