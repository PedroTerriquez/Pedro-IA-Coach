<script module lang="ts">
  // Compartidos · Nuevo · 13: 24 box, stroke 2 (some icons tuned), round caps,
  // colour inherited. `fill` icons are drawn solid instead of stroked.
  type IconDef = { d: string; w?: number; fill?: boolean }

  const ICONS: Record<string, IconDef> = {
    check: { d: '<path d="M5 12.5l4.5 4.5L19 7"/>', w: 2.4 },
    x: { d: '<path d="M6 6l12 12M18 6L6 18"/>' },
    arrow: { d: '<path d="M5 12h14M13 6l6 6-6 6"/>', w: 2.2 },
    back: { d: '<path d="M15 5l-7 7 7 7"/>', w: 2.2 },
    skip: { d: '<path d="M6 5l7 7-7 7M18 5v14"/>', w: 2.2 },
    chev: { d: '<path d="M9 5l7 7-7 7"/>' },
    down: { d: '<path d="M6 9l6 6 6-6"/>' },
    up: { d: '<path d="M6 15l6-6 6 6"/>' },
    swap: { d: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>', w: 1.9 },
    watch: { d: '<rect x="6" y="6" width="12" height="12" rx="3.5"/><path d="M9 6V3h6v3M9 18v3h6v-3"/>', w: 1.8 },
    lock: { d: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>', w: 1.8 },
    plus: { d: '<path d="M12 5v14M5 12h14"/>', w: 2.2 },
    minus: { d: '<path d="M5 12h14"/>', w: 2.2 },
    search: { d: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' },
    more: { d: '<circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/>', fill: true },
    grip: { d: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>', w: 3 },
    trash: { d: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>', w: 1.9 },
    spark: { d: '<path d="M12 2.5l2.1 6.2a2 2 0 001.2 1.2l6.2 2.1-6.2 2.1a2 2 0 00-1.2 1.2L12 21.5l-2.1-6.2a2 2 0 00-1.2-1.2L2.5 12l6.2-2.1a2 2 0 001.2-1.2z"/>', fill: true },
    send: { d: '<path d="M12 19V5M6 11l6-6 6 6"/>', w: 2.3 },
    pen: { d: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>', w: 1.9 },
    save: { d: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>', w: 2.1 },
    // Detalle v2 / Hoy v2
    timer: { d: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>' },
    play: { d: '<path d="M8 5.5v13l10.5-6.5z"/>', w: 1.9 },
    expand: { d: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>' },
    book: { d: '<path d="M5 4.5h9a3 3 0 013 3V20H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h9"/>', w: 1.8 },
    // Plan v2: Reprogramar, «Me salté un día», «Quiero mover días»
    move: { d: '<path d="M14 5l3 3-3 3M16.5 8H8a3 3 0 00-3 3M8 17l-3-3 3-3M5.5 14H14a3 3 0 003-3"/>', w: 1.8 },
    shift: { d: '<path d="M4 12h12M12 7l5 5-5 5M20 5v14"/>' },
    reorder: { d: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>' },
    // Kept from the old set for the views that still use them
    pencil: { d: '<path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>' },
    restart: { d: '<path d="M13 8a5 5 0 11-1.5-3.6M13 2v3h-3"/>' },
    coach: { d: '<path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z"/><circle cx="9" cy="8.2" r="0.95" fill="currentColor" stroke="none"/><circle cx="6" cy="8.2" r="0.95" fill="currentColor" stroke="none"/><circle cx="12" cy="8.2" r="0.95" fill="currentColor" stroke="none"/>' },
  }
</script>

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

  let def = $derived(ICONS[name] || ICONS.pencil)
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={def.fill ? color : 'none'}
  stroke={def.fill ? 'none' : color}
  stroke-width={def.w || 2}
  stroke-linecap="round"
  stroke-linejoin="round"
  style="color:{color};flex-shrink:0"
  aria-hidden="true"
  data-component="Icon"
>{@html def.d}</svg>
