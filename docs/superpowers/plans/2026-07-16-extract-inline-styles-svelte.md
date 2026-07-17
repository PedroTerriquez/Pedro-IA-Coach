# Extract Inline Styles to Scoped CSS — Svelte App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all unnecessary inline `style="..."` attributes from the 3 worst-offending Svelte pages and move them into scoped `<style>` blocks with proper CSS classes.

**Architecture:** Each page gets a comprehensive `<style>` block. Repeated patterns (card rows, labels, buttons, inputs, sections) become reusable CSS classes. Dynamic accent colors use CSS custom properties (`--accent`) set on parent elements, so inline styles are only kept where absolutely necessary (truly dynamic values like computed widths or conditional colors that can't be expressed via CSS variables).

**Tech Stack:** Svelte 5, scoped `<style>` blocks, CSS custom properties

**Scope note:** `Calendar.svelte`, `ExerciseDetail.svelte`, and `CoachChat.svelte` already have comprehensive `<style>` blocks. Their ~20 inline styles each are primarily for dynamic accent color injection — these are acceptable and excluded from this plan. `friends/+page.svelte` styles are already in `app.css` (global) — working fine, no changes needed.

---

## Task 1: Extract inline styles from `you/+page.svelte`

**Files:**
- Modify: `svelte-app/src/routes/you/+page.svelte`

### Identified patterns to extract

| Pattern | Count | CSS class |
|---------|:-----:|-----------|
| `font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:#fafafa;font-weight:500` (card row labels) | ~14 | `.card-label` |
| `padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:transparent;color:rgba(255,255,255,0.55);font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600` (setting toggle buttons) | ~4 | `.toggle-btn` |
| `padding:8px 14px;border-radius:8px;border:0;cursor:pointer` (action buttons — activate, duplicate, etc.) | ~5 | `.action-btn` |
| `padding:7px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0` (import/export buttons) | ~4 | `.btn-accent` |
| `padding:10px;border-radius:10px;border:0;cursor:pointer;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700` (primary CTA buttons) | ~5 | `.btn-primary-cta` |
| `padding:10px;border-radius:10px;border:0;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600` (secondary buttons) | ~5 | `.btn-secondary` |
| `font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace` (version/footer text) | ~2 | `.version-text` |
| `padding:5px 10px;border-radius:6px;border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;background:transparent;color:rgba(255,255,255,0.4);font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500` (refresh button) | ~2 | `.refresh-btn` |
| `margin:0 20px` (page section wrappers) | ~6 | `.section-pad` |
| `font-size:12px;color:#fafafa;font-weight:600;font-family:'Space Grotesk',sans-serif` (card section titles) | ~4 | `.card-title` |
| `font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4` (card section subtitles) | ~3 | `.card-subtitle` |
| `padding:14px 16px` (card inner padding) | ~4 | `.card-inner` |
| `display:flex;gap:10px;align-items:center` (row layouts) | ~3 | `.row` |
| `flex:1;min-width:0` (flex item) | ~3 | `.flex-1` |
| `display:flex;align-items:center;justify-content:space-between;margin:16px 20px 0` (footer bar) | ~2 | `.footer-bar` |
| `padding:10px 14px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:14px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif` (text input) | ~1 | `.text-input` |
| `padding:14px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);overflow:hidden` (section card wrapper) | ~4 | `.section-card` |
| `padding:14px 16px` (inner card content) | ~4 | `.card-content` |
| `display:flex;gap:6px;align-items:center;margin-bottom:4px` (alternatives row) | ~1 | `.alt-row` |
| `padding:8px 10px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);background:#0a0a0a;color:#fafafa;font-size:13px;outline:none;box-sizing:border-box;font-family:'Space Grotesk',sans-serif` (small input) | ~2 | `.input-sm` |
| Exercise expand button: `width:100%;background:transparent;border:0;cursor:pointer;padding:14px;display:flex;align-items:center;gap:12px;color:inherit;text-align:left;font-family:inherit` | ~1 | `.exercise-toggle` |
| Exercise image: `width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#0a0a0a` | ~1 | `.exercise-img` |
| `font-size:12px;color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600` (various) | — | Use existing `.btn-secondary` |
| `display:flex;align-items:center;justify-content:space-between;margin-bottom:16px` (dialog header) | ~1 | `.dialog-header` |
| `padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#fafafa;font-family:'Space Grotesk',sans-serif` (skipped item) | ~1 | `.skipped-item` |

- [ ] **Step 1: Add all CSS classes to the `<style>` block**

Replace the empty `<style></style>` at the bottom of the file with a comprehensive style block containing all the classes listed above. Keep dynamic accent colors as inline styles (these MUST stay inline because they use the `{accent}` reactive value).

- [ ] **Step 2: Replace inline styles in the template with CSS classes**

Go through every line of the HTML template and replace the matching inline styles with their corresponding CSS class. Where an element has both a static pattern and a dynamic accent override, keep ONLY the dynamic part as inline style and apply the class for everything else.

Example transformation:
```svelte
<!-- Before -->
<button style="padding:6px 12px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.1);cursor:pointer;background:transparent;color:rgba(255,255,255,0.55);font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">Toggle</button>

<!-- After -->
<button class="toggle-btn">Toggle</button>
```

For dynamic accent buttons:
```svelte
<!-- Before -->
<button style="padding:8px 14px;border-radius:8px;border:0;cursor:pointer;background:{accent}22;color:{accent};font-size:13px">Activar</button>

<!-- After -->
<button class="action-btn" style="background:{accent}22;color:{accent}">Activar</button>
```

- [ ] **Step 3: Verify no visual regressions**

Run: `cd svelte-app && npm run dev`
Open the You screen in browser, check all 4 tabs (Perfil, Programas, Ejercicios, Datos). Compare with the original to ensure no visual changes.

- [ ] **Step 4: Commit**

```bash
git add svelte-app/src/routes/you/+page.svelte
git commit -m "refactor(you): extract 137 inline styles to scoped CSS classes"
```

---

## Task 2: Extract inline styles from `today/+page.svelte`

**Files:**
- Modify: `svelte-app/src/routes/today/+page.svelte`

### Identified patterns to extract

| Pattern | Count | CSS class |
|---------|:-----:|-----------|
| `font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:{accent};text-transform:uppercase;font-weight:600` (eyebrow labels) | ~4 | `.eyebrow` |
| `font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:0.98` or `line-height:1;margin-top:6px` (hero titles) | ~4 | `.hero-title` |
| `font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:700;color:#fafafa;letter-spacing:-1px;line-height:1.1` (rest day title) | ~1 | `.hero-title-sm` |
| `margin-top:5px;font-size:13px;color:rgba(255,255,255,0.5)` (subtitle under hero) | ~2 | `.hero-subtitle` |
| `display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:7px` (hero row) | ~2 | `.hero-row` |
| `display:flex;align-items:center;gap:10px;flex-shrink:0` (right side of hero) | ~2 | `.hero-actions` |
| `font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.3px` (card title) | ~3 | `.card-title` |
| `font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px` (card subtitle) | ~3 | `.card-subtitle` |
| `display:flex;align-items:center;gap:6px` (inline row) | ~3 | `.inline-row` |
| `padding:14px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);align-items:center;display:flex;gap:14px` (recovery tip card) | ~1 | `.recovery-card` |
| `font-size:26px` (recovery icon) | — | `.recovery-icon` |
| `flex:1` | ~5 | `.flex-1` |
| `display:flex;flex-direction:column;gap:10px;padding:0 20px` (tip list) | ~1 | `.tip-list` |
| `margin-top:auto;text-align:center;padding:24px 0 30px` (bottom spacer) | ~1 | `.bottom-spacer` |
| `font-size:12px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;letter-spacing:1px` (hint text) | ~1 | `.hint-text` |
| Training phase card wrapper: `flex-shrink:0;margin-top:16px;display:flex;flex-direction:column;border-radius:22px;cursor:pointer;padding:18px 18px 16px;background:#141414;border:0.5px solid {accent}66;box-shadow:0 8px 28px {accent}12` | ~1 | `.training-card` (keep accent inline) |
| `display:flex;align-items:center;justify-content:space-between;gap:8px` (flex between row) | ~3 | `.between-row` |
| `display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px` (status pill) | ~1 | `.status-pill` (keep accent inline) |
| `width:5px;height:5px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent};display:inline-block` (live dot) | ~1 | `.live-dot` (keep accent inline) |
| `margin-top:12px;display:flex;align-items:center;gap:7px` (progress row) | ~1 | `.progress-row` |
| `flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden` (progress track) | ~1 | `.progress-track` |
| `height:100%;border-radius:2px;background:{accent};transition:width 0.4s` (progress fill) | ~1 | `.progress-fill` (keep accent inline) |
| `width:100%;padding:13px;border-radius:12px;cursor:pointer;background:transparent;border:0.5px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;letter-spacing:-0.1px;display:flex;align-items:center;justify-content:center;gap:7px` (reset button) | ~1 | `.btn-reset` |
| `display:flex;align-items:center;gap:10px` (loading row) | ~1 | `.loading-row` |
| `font-size:13px;color:rgba(255,255,255,0.55)` (loading text) | ~1 | `.loading-text` |
| Coach result analysis: `margin-top:12px;font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.9);font-family:'Space Grotesk',sans-serif;letter-spacing:-0.1px` | ~1 | `.analysis-text` |
| Coach proximo_objetivo box: `margin-top:14px;padding:12px 14px;border-radius:14px;border:0.5px solid {accent}3a;background:{accent}0d` | ~1 | `.objective-box` (keep accent inline) |
| `font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;color:{accent};font-weight:600;margin-bottom:6px` (objective label) | ~1 | `.objective-label` (keep accent inline) |
| `font-size:16px;line-height:1.5;color:{accent};font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:-0.4px` (objective text) | ~1 | `.objective-text` (keep accent inline) |
| Recommendation chips: `display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:9999px;background:{accent}16;border:0.5px solid {accent}3a;font-family:'Space Grotesk',sans-serif;font-size:11.5px;font-weight:600;color:{accent}` | ~1 | `.rec-chip` (keep accent inline) |
| Effort button: `padding:14px;border-radius:14px;border:0.5px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;color:inherit;transition:all 0.15s;width:100%` | ~1 | `.effort-btn` |
| Effort emoji box: `width:40px;height:40px;border-radius:10px;background:{accent}1a;display:flex;align-items:center;justify-content:center;font-size:20px;border:0.5px solid {accent}33` | ~1 | `.effort-emoji` (keep accent inline) |
| `text-align:center;margin-bottom:20px` (dialog header) | ~1 | `.dialog-center` |
| `font-size:32px;margin-bottom:8px` (dialog emoji) | ~1 | `.dialog-emoji` |
| `font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.3px` (dialog title) | ~1 | `.dialog-title` |
| `font-size:13px;color:rgba(255,255,255,0.5);margin-top:6px` (dialog desc) | ~1 | `.dialog-desc` |
| `display:flex;flex-direction:column;gap:8px` (effort list) | ~1 | `.stack` |
| Streak overlay: `position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease` | ~1 | `.streak-overlay` |
| Streak count: `font-family:'Space Grotesk',sans-serif;font-size:96px;font-weight:700;color:#fafafa;letter-spacing:-4px;line-height:1;margin-top:4px` | ~1 | `.streak-count` |
| `font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:6px` (streak subtitle) | ~1 | `.streak-subtitle` |
| `font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;color:{accent};margin-top:14px` (streak鼓励) | ~1 | `.streak-encourage` (keep accent inline) |
| `font-size:80px;line-height:1;animation:flameBounce 0.6s ease infinite alternate` (streak flame) | ~1 | `.streak-flame` |
| `flex:1;display:flex;flex-direction:column;padding:58px 20px 0` (no-program wrapper) | ~1 | `.no-program-wrapper` |
| `padding:58px 20px 0` (page top padding) | ~3 | `.page-top` |
| `padding:20px;margin-top:8px` (rest card wrapper) | ~1 | `.rest-card-wrapper` |
| `margin-top:18px;margin-bottom:12px` (recovery header margin) | ~1 | `.recovery-header` |
| `flex-shrink:0;padding:0 4px 2px` (phase header) | ~2 | `.phase-header` |
| `margin-top:16px` on coach section | ~1 | `.mt-16` |
| `flex:1;min-height:0;overflow-y:auto;margin-top:16px` (scrollable coach area) | ~1 | `.coach-scroll` |
| `margin-top:16px;width:100%;padding:13px;border-radius:12px` reset button variants | — | Use `.btn-reset` |
| `display:flex;flex-direction:column;align-items:center` (streak inner) | ~1 | `.stack-center` |
| `width:64px;height:64px;position:relative;flex-shrink:0;background:transparent;border:0;padding:0` (timer wrapper) | ~1 | `.timer-wrapper` |
| `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center` (timer inner) | ~1 | `.timer-inner` |
| `font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;color:#fafafa;letter-spacing:-0.4px;line-height:1;font-variant-numeric:tabular-nums` (timer value) | ~1 | `.timer-value` |
| `font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-top:3px` (timer label) | ~1 | `.timer-label` |
| `display:none` (hidden div for streakModalShow) | ~1 | Remove entirely (unused) |

- [ ] **Step 1: Add all CSS classes to the `<style>` block**

Expand the existing `<style>` block (which only has `.exercise-list` and `.stats-grid`) with all the classes above.

- [ ] **Step 2: Replace inline styles in template with CSS classes**

Same approach as Task 1. Keep dynamic `{accent}` inline styles, extract everything else.

- [ ] **Step 3: Remove dead code**

Lines 809-811 contain a `{#if streakModalShow}<div style="display:none"></div>{/if}` block that does nothing. Remove it.

- [ ] **Step 4: Verify no visual regressions**

Run: `cd svelte-app && npm run dev`
Test all Today screen states: loading, no-program, rest day, warmup phase, training phase, coach result, effort modal, streak modal.

- [ ] **Step 5: Commit**

```bash
git add svelte-app/src/routes/today/+page.svelte
git commit -m "refactor(today): extract ~90 inline styles to scoped CSS classes"
```

---

## Task 3: Extract inline styles from `plan/+page.svelte`

**Files:**
- Modify: `svelte-app/src/routes/plan/+page.svelte`

### Identified patterns to extract

| Pattern | Count | CSS class |
|---------|:-----:|-----------|
| `padding:56px 20px 16px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px` (page header row) | ~1 | `.page-header-row` |
| `min-width:0` | ~2 | `.min-0` |
| `font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1.6px;color:rgba(255,255,255,0.45);text-transform:uppercase` (eyebrow) | ~1 | `.eyebrow` |
| `font-family:'Space Grotesk',sans-serif;font-size:38px;font-weight:700;color:#fafafa;letter-spacing:-1.5px;line-height:1;margin-top:4px` (page title) | ~1 | `.page-title` |
| `flex-shrink:0;padding:9px 15px;border-radius:9999px;cursor:pointer` (reprogram button — keep accent dynamic inline) | ~1 | `.btn-reprogram` |
| `padding:0 20px;margin-bottom:14px` (section wrapper) | ~3 | `.section-pad-sm` |
| `background:{accent}0d;border:0.5px solid {accent}33;border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:12px` (editing banner) | ~1 | `.edit-banner` (keep accent inline) |
| `width:34px;height:34px;border-radius:10px;flex-shrink:0;background:{accent}1c;color:{accent};display:flex;align-items:center;justify-content:center` (icon box) | ~1 | `.icon-box` (keep accent inline) |
| `flex:1;min-width:0` | ~3 | `.flex-1` |
| `font-family:'Space Grotesk',sans-serif;font-size:13.5px;font-weight:600;color:#fafafa;letter-spacing:-0.2px` (banner title) | ~2 | `.banner-title` |
| `font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;line-height:1.35` (banner subtitle) | ~2 | `.banner-subtitle` |
| `flex-shrink:0;padding:7px 11px;border-radius:9999px;border:0` (reset button — keep dynamic colors inline) | ~1 | `.btn-reset-sm` |
| `padding:0 20px;margin-bottom:16px` (shift section) | ~1 | `.section-pad-md` |
| `width:100%;text-align:left;cursor:pointer;background:#141414;border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:13px;color:inherit` (shift button) | ~1 | `.shift-btn` |
| `width:38px;height:38px;border-radius:11px;flex-shrink:0;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:18px;color:{accent}` (shift icon) | ~1 | `.shift-icon` (keep accent inline) |
| `font-family:'Space Grotesk',sans-serif;font-size:14.5px;font-weight:600;color:#fafafa;letter-spacing:-0.2px` (shift title) | ~1 | `.shift-title` |
| `font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:2px;line-height:1.35` (shift desc) | ~1 | `.shift-desc` |
| `flex-shrink:0;padding:8px 12px;border-radius:10px;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12.5px;font-weight:700;white-space:nowrap` (shift CTA) | ~1 | `.shift-cta` (keep accent inline) |
| `padding:0 20px;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600` (hint row) | ~1 | `.hint-row` |
| `width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0` (hint dot) | ~1 | `.hint-dot` (keep accent inline) |
| `padding:0 20px;display:flex;flex-direction:column;gap:10px` (day list) | ~2 | `.day-list` |
| `padding:0 20px;margin-bottom:14px` (changes banner wrapper) | ~1 | `.section-pad-xs` |
| `width:100%;text-align:left;cursor:pointer;background:{accent}0d;border:0.5px solid {accent}33;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px;color:inherit` (changes banner) | ~1 | `.changes-banner` (keep accent inline) |
| `width:7px;height:7px;border-radius:50%;background:{accent};box-shadow:0 0 7px {accent};flex-shrink:0` (active dot) | ~1 | `.active-dot` (keep accent inline) |
| `font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:#fafafa;letter-spacing:-0.2px` (changes title) | ~1 | `.changes-title` |
| `font-size:10.5px;color:rgba(255,255,255,0.5);margin-top:1px` (changes subtitle) | ~1 | `.changes-subtitle` |
| `font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:{accent};flex-shrink:0` (changes edit link) | ~1 | `.changes-edit` (keep accent inline) |
| `padding:0 20px;display:flex;gap:8px;margin-bottom:18px` (week tabs wrapper) | ~1 | `.week-tabs` |
| `flex:1;padding:12px 8px;border:0;cursor:pointer` (week tab — keep dynamic border/background inline) | ~1 | `.week-tab` |
| `font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.4px;text-transform:uppercase` (week tag — keep dynamic color inline) | ~1 | `.week-tag` |
| `font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;margin-top:2px;letter-spacing:-0.3px` (week name) | ~1 | `.week-name` |
| `font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px` (week subtitle) | ~1 | `.week-subtitle` |
| `padding:56px 20px;text-align:center;color:rgba(255,255,255,0.4);font-size:14px` (no program message) | ~1 | `.no-program-msg` |
| `padding:0 20px;display:flex;flex-direction:column;gap:10px` (days grid) | — | Use `.day-list` |

- [ ] **Step 1: Add all CSS classes to a new `<style>` block**

Add a `<style>` block at the end of the file with all the classes above.

- [ ] **Step 2: Replace inline styles in template with CSS classes**

- [ ] **Step 3: Verify no visual regressions**

Run: `cd svelte-app && npm run dev`
Test Plan screen: week tabs, day cards, expanded day, editing mode, shift button, changes banner.

- [ ] **Step 4: Commit**

```bash
git add svelte-app/src/routes/plan/+page.svelte
git commit -m "refactor(plan): extract ~36 inline styles to scoped CSS classes"
```

---

## Final Verification

- [ ] **Step 1: Run full app test**

```bash
cd svelte-app && npm run dev
```

Navigate through ALL screens (Today, Plan, History, You) and verify no visual regressions.

- [ ] **Step 2: Verify inline style count dropped**

Search for remaining `style=` in the modified files. Only dynamic accent-color inline styles should remain.

```bash
grep -c 'style=' svelte-app/src/routes/you/+page.svelte
grep -c 'style=' svelte-app/src/routes/today/+page.svelte
grep -c 'style=' svelte-app/src/routes/plan/+page.svelte
```

Expected: you ~20-30 (accent-only), today ~25-35 (accent-only), plan ~15-20 (accent-only).
