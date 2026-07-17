<script lang="ts">
  let {
    size = 14,
    color = 'currentColor'
  }: {
    size?: number
    color?: string
  } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 18 18" fill="none">
  <path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z"
    stroke={color} stroke-width="1.5" stroke-linejoin="round" fill="none"/>
  <circle cx="9" cy="8.2" r="0.95" fill={color}/>
  <circle cx="6" cy="8.2" r="0.95" fill={color}/>
  <circle cx="12" cy="8.2" r="0.95" fill={color}/>
</svg>
