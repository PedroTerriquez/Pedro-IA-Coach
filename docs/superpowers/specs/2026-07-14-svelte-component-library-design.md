# SvelteKit Component Library — Consolidation & Token Migration

**Date:** 2026-07-14
**Status:** Approved
**Scope:** `svelte-app/src/lib/components/` + route adoption + token migration

## Problem

The SvelteKit app has 12 components but only 6 are used by routes. The same patterns (bottom sheet, exercise row, segmented control, section label, chip, input fields, stats grid, coach chat) are reimplemented inline across every route. ~3000 lines of inline `style=""` attributes use hardcoded design tokens (`#141414`, `#fafafa`, `rgba(255,255,255,0.06)`) instead of referencing `var(--token)` from `app.css`.

## Approach

**Component library first, then adopt (Approach C):**
1. Build/fix all shared components in `src/lib/components/`
2. Refactor routes to adopt them
3. Migrate hardcoded values to design tokens
4. Single commit, all tests passing

## Components

### New Components

#### `ExerciseRow.svelte`
Data row for exercise lists: `[thumbnail] [name + muscle] [sets × reps] [weight]`.

```svelte
<ExerciseRow {name} {muscle} {imgUrl} {sets} {reps} {weight} {units}
  {accent} {selectable} {selected} onclick={handleClick}>
  {#snippet actions()}<button>Edit</button>{/snippet}
</ExerciseRow>
```

**Props:**
- `name: string` — exercise display name
- `muscle: string` — muscle group label
- `imgUrl?: string` — exercise image URL
- `sets?: number` — number of sets
- `reps?: string` — reps display (e.g. "8-10")
- `weight?: number` — last logged weight
- `units?: string` — "kg" or "lb"
- `accent?: string` — accent color
- `selectable?: boolean` — show selection state
- `selected?: boolean` — currently selected
- `onclick?: () => void` — click handler
- `actions?: Snippet` — slot for custom action buttons

**Scoped CSS:** Uses `var(--surface)`, `var(--text)`, `var(--border)`, `var(--radius-*)`, `var(--font-sans)`, `var(--font-mono)`.

#### `SegmentedControl.svelte`
Tab-like control with 2+ options.

```svelte
<SegmentedControl {options} bind:value {accent} />
```

**Props:**
- `options: {label: string, value: string}[]` — tab options
- `value: string` (bindable) — currently selected value
- `accent?: string` — active tab color

**Scoped CSS:** Uses tokens.

#### `CoachChat.svelte`
Full chat interface extracted from ExerciseDetail (~400 lines).

```svelte
<CoachChat {exercise} {accent} onclose={handleClose} />
```

**Props:**
- `exercise: { name: string, muscle: string, alternatives: {name: string, reason: string}[] }`
- `accent?: string`
- `onclose?: () => void`

**Internal state:** messages array, typing indicator, quick chips, body-part picker.
**Scoped CSS:** Uses tokens.

### Modified Components

#### `Sheet.svelte`
Tighten API:
- `open` becomes bindable (`bind:open`)
- Add `header?: Snippet` prop for title area
- Keep existing: backdrop click to close, drag handle, close button, slide-up animation

#### `ExerciseDetail.svelte`
- Use `Sheet` instead of inline sheet structure
- Use `SegmentedControl` for Workout/History tabs
- Extract coach chat to `CoachChat.svelte`
- Use `StatBlock` for stat grid
- Migrate inline styles to scoped CSS with tokens

#### `Warmup.svelte`
- Use `Sheet` instead of inline sheet structure
- Full migration: all 294 lines of inline styles → scoped `<style>` block with `var(--token)` references

#### `Calendar.svelte`
- Use `ExerciseRow` for day detail exercise rows
- Migrate hardcoded values in scoped CSS to tokens

#### `today/+page.svelte`
- Use `ExerciseRow` for exercise list
- Use `SectionLabel` instead of inline section labels
- Use `StatBlock` for stats grid
- Use `Chip` for pills/badges

#### `plan/+page.svelte`
- Use `ExerciseRow` for exercise rows inside expanded days
- No segmented control needed (plan uses expand/collapse, not tabs)

#### `history/+page.svelte`
- Use `SegmentedControl` for Constancia/Ejercicios tabs
- Use `Chip` instead of custom `.chip` class

#### `you/+page.svelte`
- Use `SectionLabel` instead of `.section-label` class
- Use `ExerciseRow` for exercise list
- Use `Chip` for badges
- Add `.input-field` utility class to replace 15× repeated inline input style

### Component Disposition

- `ExercisePlaceholder.svelte` — **kept** (visual card with image, different from data-focused ExerciseRow)
- `CoachCard.svelte` — **removed** (unused by any route, replaced by `CoachChat.svelte`)

## CSS Strategy

### Design Tokens (from `app.css`)
All components reference these tokens:
- Colors: `--bg`, `--surface`, `--surface-hover`, `--surface-2`, `--text`, `--text-secondary`, `--text-tertiary`, `--accent`, `--border`, `--border-light`
- Radii: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
- Fonts: `--font-sans`, `--font-mono`

### Rules
1. New components: zero inline `style=""`, everything via scoped `<style>` + tokens
2. Existing components: migrate hardcoded values to tokens in existing scoped CSS
3. Routes: replace inline styles with component adoption + utility classes
4. Add to `app.css`: `.input-field`, `.card`, `.card-row` utility classes

### Utility Classes Added to `app.css`
```css
.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-light);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  box-sizing: border-box;
}
```

## Adoption Matrix

| Route | Components Adopted | What Gets Replaced |
|---|---|---|
| `ExerciseDetail.svelte` | `Sheet`, `SegmentedControl`, `CoachChat`, `StatBlock` | Inline sheet, inline seg control, ~400 lines coach, inline stat grid |
| `Warmup.svelte` | `Sheet` | Inline sheet, full inline styles → scoped CSS |
| `today/+page.svelte` | `ExerciseRow`, `SectionLabel`, `Chip`, `StatBlock` | Inline exercise rows, inline section labels, inline stat grids |
| `plan/+page.svelte` | `ExerciseRow` | Inline exercise rows |
| `history/+page.svelte` | `SegmentedControl`, `Chip` | Inline tabs, custom `.chip` class |
| `you/+page.svelte` | `SectionLabel`, `Chip`, `ExerciseRow`, `.input-field` | `.section-label` class, inline exercise rows, 15× input style |
| `Calendar.svelte` | `ExerciseRow` | Inline exercise detail rows |

## Included (approved scope expansion)

- Warmup.svelte full inline→CSS migration

## Out of Scope

- CoachCard.svelte — removed (unused)
- Rest-timer-banner CSS block — not a reuse concern
- Vanilla JS app (`components/`, `views/`) — not touched

## Testing

- All existing Playwright tests must pass after the refactor
- No new tests needed — this is a refactor, not new functionality
- Visual regression: same output, different implementation

## Commit Strategy

Single commit after all changes are complete and tests pass:
- Version bump to v1.92
- Descriptive message covering all changes
