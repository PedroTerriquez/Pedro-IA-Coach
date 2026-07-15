<script context="module" lang="ts">
  declare function getUniqueWarmupMuscles(muscles: string[]): string[]
  declare const WARMUP_DATA: Record<string, any>
  declare const IMG_MAP: Record<string, string>
  declare const MUSCLE_DISPLAY: Record<string, string>
</script>

<script lang="ts">
  const WARMUP_GIF_MAP: Record<string, string> = {
    "Flexiones Dinámicas Excéntricas contra Pared": "pectorals/push-up-wall",
    "Dislocaciones de Pecho y Hombro con Banda": "pectorals/dynamic-chest-stretch-male",
    "Estiramiento de Pecho en Esquina de Pared": "pectorals/chest-and-front-of-shoulder-stretch",
    "Estiramiento Un Brazo Contra Pared": "lats/one-arm-against-wall",
    "Apertura de Pecho Pasiva en Espaldera": "pectorals/behind-head-chest-stretch",
    "Movilidad Escapular en Y-T-W": "delts/band-y-raise",
    "Giros Externos con Banda Dinámicos": "delts/cable-standing-shoulder-external-rotation",
    "Estiramiento del Deltoides Posterior Cruzado": "delts/rear-deltoid-stretch",
    "Estiramiento del Deltoides Anterior Sentado": "pectorals/chest-and-front-of-shoulder-stretch",
    "Tracción Escapular Colgado": "traps/scapular-pull-up",
    "Flexiones en Diamante sobre Pared": "pectorals/push-up-wall",
    "Extensiones de Codo al Aire Activas": "triceps/overhead-triceps-stretch",
    "Estiramiento de Tríceps por Detrás de la Cabeza": "triceps/overhead-triceps-stretch",
    "Elongación de Tríceps contra Pared": "triceps/triceps-stretch",
    "Estiramiento de Bíceps en Pared con Pulgar Abajo": "lats/one-arm-against-wall",
    "Gato-Camello Dinámico": "spine/spine-stretch",
    "Oruga Walkout Dinámica": "abs/inchworm",
    "Torsión Espinal en el Suelo Estática": "glutes/bent-knee-lying-twist-male",
    "Colgado Asistido Descompresivo": "traps/scapular-pull-up",
    "Postura del Niño con Enfoque Lumbar": "lats/kneeling-lat-stretch",
    "Plancha Alta con Toques de Hombro": "abs/shoulder-tap",
    "Escarabajo Muerto (Dead Bug) Básico": "abs/dead-bug",
    "Puentes de Glúteo Dinámicos con Pausa": "glutes/pelvic-tilt-into-bridge",
    "Figura 4 Acostado Boca Arriba": "glutes/assisted-lying-gluteus-and-piriformis-stretch",
    "Postura de la Paloma Pasiva en Suelo": "glutes/seated-piriformis-stretch",
    "Estiramiento de Cuádriceps Acostado Boca Abajo": "quads/assisted-prone-lying-quads-stretch",
    "Estiramiento de Cuádriceps Clásico de Pie": "quads/intermediate-hip-flexor-and-quad-stretch",
    "Buenos Días Dinámicos con Manos en Nuca": "hamstrings/barbell-good-morning",
    "Patadas Frankenstein Dinámicas": "glutes/frankenstein-squat",
    "Estiramiento de Isquiotibiales con Banda en Suelo": "hamstrings/hamstring-stretch",
    "Estiramiento Isquiotibial Unilateral en Banco": "hamstrings/leg-up-hamstring-stretch",
    "Elevaciones de Talón de Pie Continuas": "calves/bodyweight-standing-calf-raise",
    "Saltos Cortos sobre Metatarsos (Pogo Hops)": "calves/bodyweight-standing-calf-raise",
    "Estiramiento de Gemelo en Escalón Pasivo": "calves/calf-stretch-with-hands-against-wall",
    "Circulos de Muñecas con Puños Cerrados": "forearms/wrist-circles",
    "Estiramiento de Flexores de Muñeca de Rodillas": "forearms/side-wrist-pull-stretch",
    "Estiramiento de Extensores de Muñeca": "forearms/side-wrist-pull-stretch",
    "Estiramiento Lateral de Cuello Asistido": "levator-scapulae/neck-side-stretch",
    "Estiramiento de la Musculatura Cervical Posterior": "levator-scapulae/side-push-neck-stretch",
    "Tracción Cervical Angular por Inclinación de Torso": "levator-scapulae/neck-side-stretch",
  }

  const EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/'

  let { items, mode, accent, onComplete }: {
    items: any[]
    mode: 'warmup' | 'stretch'
    accent: string
    onComplete?: () => void
  } = $props()

  let idx = $state(0)
  let swiping = $state(false)
  let showGif = $state(true)

  let total = $derived(items.length)

  function resolveGifUrl(name: string): string {
    const path = WARMUP_GIF_MAP[name]
    return path ? EX_GIF_BASE + path + '.gif' : ''
  }

  let item = $derived(items[idx])

  let gifUrl = $derived(resolveGifUrl(item?.name || ''))

  let sections = $derived([
    { id: 'posInicial', label: 'Posición Inicial', value: item?.posInicial },
    { id: 'ejecucion', label: 'Ejecución', value: item?.ejecucion },
    { id: 'respiracion', label: 'Respiración', value: item?.respiracion },
    { id: 'duracion', label: 'Duración', value: item?.duracion },
  ])

  let hasSections = $derived(sections.some(s => s.value))

  let slideFrom = $state<'left' | 'right' | null>(null)
  let slideOut = $state(false)
  let slideDirection = $state<'left' | 'right'>('right')

  function goTo(newIdx: number, dir: 'left' | 'right') {
    if (swiping || newIdx < 0 || newIdx >= total) return
    swiping = true
    slideDirection = dir
    slideOut = true
    setTimeout(() => {
      idx = newIdx
      slideFrom = dir === 'right' ? 'right' : 'left'
      slideOut = false
      requestAnimationFrame(() => {
        setTimeout(() => {
          slideFrom = null
          swiping = false
        }, 400)
      })
    }, 150)
  }

  function next() {
    if (idx < total - 1) goTo(idx + 1, 'right')
  }

  function prev() {
    if (idx > 0) goTo(idx - 1, 'left')
  }

  function close() {
    if (onComplete) onComplete()
  }

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onTouchMove(e: TouchEvent) {
    if (swiping) return
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY
    const swEl = document.querySelector('[data-sw]') as HTMLElement
    if (!swEl) return
    if (Math.abs(dx) > Math.abs(dy) * 0.7) {
      swEl.style.transform = `translateX(${dx * 0.3}px)`
      swEl.style.opacity = `${1 - Math.abs(dx) * 0.002}`
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (swiping) return
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    const swEl = document.querySelector('[data-sw]') as HTMLElement
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.7) {
      if (swEl) {
        swEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
        swEl.style.transform = 'translateX(0)'
        swEl.style.opacity = '1'
      }
      return
    }
    if (dx < 0 && idx < total - 1) {
      swiping = true
      if (swEl) {
        swEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
        swEl.style.transform = 'translateX(-30%)'
        swEl.style.opacity = '0'
        setTimeout(() => { idx++; swiping = false; slideFrom = 'right'; requestAnimationFrame(() => { setTimeout(() => { slideFrom = null }, 400) }) }, 150)
      } else { idx++; swiping = false }
    } else if (dx > 0 && idx > 0) {
      swiping = true
      if (swEl) {
        swEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
        swEl.style.transform = 'translateX(30%)'
        swEl.style.opacity = '0'
        setTimeout(() => { idx--; swiping = false; slideFrom = 'left'; requestAnimationFrame(() => { setTimeout(() => { slideFrom = null }, 400) }) }, 150)
      } else { idx--; swiping = false }
    } else {
      if (swEl) {
        swEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
        swEl.style.transform = 'translateX(0)'
        swEl.style.opacity = '1'
      }
    }
  }

  function toggleGif() {
    showGif = !showGif
  }
</script>

{#if items && items.length > 0}
  <div style="position:fixed;inset:0;z-index:100;pointer-events:auto">
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);transition:background 0.25s" onclick={() => {}}></div>
    <button style="position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:0.5px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.55);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:200;padding:0;color:rgba(255,255,255,0.85)" onclick={close}>
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
    </button>
    <div style="position:absolute;left:0;right:0;bottom:0;background:#0e0e0e;border-radius:16px 16px 0 0;max-height:92%;overflow:hidden;box-shadow:0 -20px 40px rgba(0,0,0,0.5);border:0.5px solid rgba(255,255,255,0.08);display:flex;flex-direction:column">
      <div style="width:36px;height:5px;border-radius:3px;background:rgba(255,255,255,0.18);margin:10px auto 0;flex-shrink:0"></div>
      <div
        style="overflow:auto;flex:1"
        ontouchstart={onTouchStart}
        ontouchmove={onTouchMove}
        ontouchend={onTouchEnd}
      >
        <div style="padding:10px 14px 0;display:flex;gap:8px">
          <button style="flex:1;min-width:0;background:{idx === 0 ? 'rgba(255,255,255,0.02)' : '#141414'};border:0.5px solid rgba(255,255,255,0.06);border-radius:12px;padding:8px 12px;cursor:{idx === 0 ? 'default' : 'pointer'};color:inherit;text-align:left;display:flex;align-items:center;gap:9px;flex-direction:row;opacity:{idx === 0 ? 0.45 : 1}" disabled={idx === 0} onclick={prev}>
            <div style="width:26px;height:26px;border-radius:8px;background:{idx === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'};border:0.5px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style="flex-shrink:0"><path d="M10 5H1m0 0l4-4M1 5l4 4" stroke="{idx === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px">
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:{idx === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)'};font-weight:600;line-height:1">Anterior</div>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;color:#fafafa;letter-spacing:-0.1px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;width:100%">{items[idx - 1]?.name || 'Primero'}</div>
            </div>
          </button>
          <button
            style="flex-shrink:0;border:0;cursor:pointer;color:#0a0a0a;background:{accent};border-radius:12px;padding:8px 16px;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;letter-spacing:-0.1px;display:flex;align-items:center;gap:7px;touch-action:manipulation;box-shadow:0 4px 16px {accent}44"
            onclick={close}
          >
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4L13 1.5" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Hecho
          </button>
          <button style="flex:1;min-width:0;background:{idx >= total - 1 ? 'rgba(255,255,255,0.02)' : '#141414'};border:0.5px solid rgba(255,255,255,0.06);border-radius:12px;padding:8px 12px;cursor:{idx >= total - 1 ? 'default' : 'pointer'};color:inherit;text-align:right;display:flex;align-items:center;gap:9px;flex-direction:row-reverse;opacity:{idx >= total - 1 ? 0.45 : 1}" disabled={idx >= total - 1} onclick={next}>
            <div style="width:26px;height:26px;border-radius:8px;background:{idx >= total - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'};border:0.5px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style="flex-shrink:0"><path d="M1 5h9m0 0L6 1m4 4L6 9" stroke="{idx >= total - 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-end;gap:1px">
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:{idx >= total - 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)'};font-weight:600;line-height:1">Siguiente</div>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;color:#fafafa;letter-spacing:-0.1px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;width:100%">{items[idx + 1]?.name || 'Último'}</div>
            </div>
          </button>
        </div>

        <div style="padding:8px 14px 0;display:flex;align-items:center;gap:8px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.4px;color:rgba(255,255,255,0.45);font-weight:500">{idx + 1} / {total}</div>
          <div style="flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden">
            <div style="height:100%;border-radius:2px;background:{accent};width:{((idx + 1) / total) * 100}%"></div>
          </div>
        </div>

        <div
          data-sw=""
          style="transition:{slideFrom ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease' : (slideOut ? 'transform 0.15s ease, opacity 0.15s ease' : 'none')};transform:{slideFrom ? 'translateX(0)' : slideOut ? (slideDirection === 'right' ? 'translateX(-30%)' : 'translateX(30%)') : 'translateX(0)'};opacity:{slideFrom ? 1 : slideOut ? 0 : 1}"
        >
          <div style="padding:12px 14px 0">
            <div style="height:400px;border-radius:18px;overflow:hidden;position:relative;background:#161616;border:0.5px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;justify-content:space-between">
              <div style="position:absolute;inset:0">
                {#if item?.imgUrl}
                  <div style="position:absolute;inset:0;transition:opacity .35s;pointer-events:none;opacity:{showGif && gifUrl ? 0 : 1};background:#161616 url({item.imgUrl}) center/cover no-repeat"></div>
                {/if}
                {#if gifUrl}
                  <div style="position:absolute;inset:0;transition:opacity .35s;pointer-events:none;opacity:{showGif ? 1 : 0}">
                    <img src={gifUrl} alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none">
                  </div>
                {/if}
              </div>
              {#if gifUrl}
                <button
                  style="position:absolute;top:10px;right:10px;z-index:5;width:32px;height:32px;border-radius:50%;border:0.5px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:rgba(255,255,255,0.75)"
                  onclick={toggleGif}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
                </button>
              {/if}
              <div style="display:flex;align-items:flex-start;position:relative;z-index:1;padding:12px;gap:6px">
                <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:9999px;background:rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:0.5px solid rgba(255,255,255,0.1);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.2px;font-weight:500;color:rgba(255,255,255,0.85);text-transform:uppercase">{item?.tag || ''}</span>
                {#if item?.stallbar}
                  <span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:4px;background:#f59e0b;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:#0a0a0a;font-weight:600">STALLBAR</span>
                {/if}
              </div>
              <div style="padding:12px;position:relative;z-index:1">
                <div style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:#fafafa;letter-spacing:-0.5px;line-height:1.1;text-shadow:0 2px 8px rgba(0,0,0,0.5)">{item?.name}</div>
              </div>
            </div>
          </div>

          <div style="padding:14px 18px 0">
            {#if hasSections}
              {#each sections as s}
                {#if s.value}
                  <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 14px;margin-bottom:6px">
                    <div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:8px">
                      <div style="width:4px;height:4px;border-radius:50%;background:{accent}"></div>
                      {s.label}
                    </div>
                    <div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.82);font-family:'Space Grotesk',sans-serif;letter-spacing:-0.05px">{s.value}</div>
                  </div>
                {/if}
              {/each}
            {:else if item?.desc}
              <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 14px;margin-bottom:6px">
                <div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:8px">
                  <div style="width:4px;height:4px;border-radius:50%;background:{accent}"></div>
                  Cómo hacerlo
                </div>
                <div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.82);font-family:'Space Grotesk',sans-serif;letter-spacing:-0.05px">{item.desc}</div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
