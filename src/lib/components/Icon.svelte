<script lang="ts">
  let {
    name = 'pencil',
    size = 20,
    color = 'currentColor'
  }: {
    name?: string
    size?: number
    color?: string
  } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" data-component="Icon">
  {#if name === 'pencil'}
    <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  {:else if name === 'swap'}
    <path d="M11.5 2.5l3 3-3 3M14 5.5H5.5a3 3 0 00-3 3M5.5 14.5l-3-3 3-3M3 11.5h8.5a3 3 0 003-3"/>
  {:else if name === 'restart'}
    <path d="M13 8a5 5 0 11-1.5-3.6M13 2v3h-3"/>
  {:else if name === 'coach'}
    <path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z" fill="none"/>
    <circle cx="9" cy="8.2" r="0.95" fill={color} stroke="none"/>
    <circle cx="6" cy="8.2" r="0.95" fill={color} stroke="none"/>
    <circle cx="12" cy="8.2" r="0.95" fill={color} stroke="none"/>
  {/if}
</svg>
