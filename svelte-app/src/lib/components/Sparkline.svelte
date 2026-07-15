<script lang="ts">
  let { data, width = 100, height = 30, color = '#d4ff3a' }: {
    data: { weight?: number; top?: number }[]
    width?: number
    height?: number
    color?: string
  } = $props()

  let svgContent = $derived.by(() => {
    if (!data || data.length < 2) return ''
    const vals = data.map((d) => d.weight !== undefined ? d.weight : d.top!)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1
    const pad = 3
    const w = width - pad * 2
    const h = height - pad * 2
    const pts = data.map((d, i) => {
      const v = d.weight !== undefined ? d.weight : d.top!
      const x = pad + (i / (data.length - 1)) * w
      const y = pad + h - ((v - min) / range) * h
      return [x, y]
    })
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
    const last = pts[pts.length - 1]
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="${color}"/>`
  })
</script>

<svg {width} {height} style="display:block">
  {@html svgContent}
</svg>
