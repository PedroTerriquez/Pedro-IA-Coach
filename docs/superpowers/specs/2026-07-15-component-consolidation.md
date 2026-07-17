# Component Consolidation — Spec

**Date:** 2026-07-15
**Status:** Draft
**Scope:** `svelte-app/src/lib/components/` + route adoption
**Depends on:** Component library wave (v1.91-v1.92)

## Problem

After the first consolidation wave, 6 components exist but are **never imported by any route**:

| Component | Used by routes? | Inline equivalent in routes |
|---|---|---|
| `EmptyState` | ❌ | 9 inline empty states |
| `LoadingSpinner` | ❌ | 5 inline loading states |
| `Button` | ❌ | ~20 inline buttons in you/+page.svelte |
| `ActionRow` | ❌ | — (no equivalent, unused) |
| `SegmentedControl` | ✅ history, ExerciseDetail | 1 inline tab control in you/+page.svelte |
| `Chip` | ✅ history, today | — |
| `ExerciseRow` | ✅ today, plan | — |

Additionally, the plan page has rich week cards (tag + name + subtitle + accent) implemented as inline `<button>` elements with no shared component.

## Approach

**Phase 1 — Build/Enhance (3 components):**
1. Create `WeekCard.svelte` — rich week selector card for plan page
2. Enhance `SegmentedControl.svelte` — add `id` prop + `data-testid` for test selectors
3. Enhance `LoadingSpinner.svelte` — add `wrapperStyle` prop for visual context (gradient backgrounds, spacing)

**Phase 2 — Adopt (6 route files):**
4. plan/+page.svelte → WeekCard + EmptyState
5. you/+page.svelte → SegmentedControl + EmptyState + Button (20 buttons)
6. history/+page.svelte → EmptyState (2 instances)
7. today/+page.svelte → LoadingSpinner + EmptyState
8. ExerciseDetail.svelte → EmptyState (1 instance)
9. friends/+page.svelte → LoadingSpinner (2 instances)

## Components

### New: `WeekCard.svelte`

Rich week selector for the plan page. Displays tag, name, subtitle with active state styling.

**Props:**
- `tag?: string` — uppercase mono label (e.g. "BUILD")
- `name: string` — week name (e.g. "Week A")
- `subtitle?: string` — description (e.g. "Volume")
- `active?: boolean` — selected state
- `accent?: string` — accent color (falls back to `var(--accent)`)
- `onclick?: () => void`

**Scoped CSS:** Uses `var(--surface-hover)`, `var(--border)`, `var(--radius-md)`, `var(--font-sans)`, `var(--font-mono)`, `var(--text)`, `var(--text-secondary)`, `var(--text-tertiary)`.

### Enhanced: `SegmentedControl.svelte`

Added props:
- `id?: string` — applied to container div for test selectors
- `data-testid` on each button: `{id}-{value}` pattern

### Enhanced: `LoadingSpinner.svelte`

Added prop:
- `wrapperStyle?: string` — inline style on the outer wrapper div (for gradient backgrounds, margins, padding)

## Files

### New Files
| File | Purpose |
|---|---|
| `src/lib/components/WeekCard.svelte` | Rich week selector card |

### Modified Files
| File | Changes |
|---|---|
| `src/lib/components/SegmentedControl.svelte` | Add `id` prop + `data-testid` |
| `src/lib/components/LoadingSpinner.svelte` | Add `wrapperStyle` prop |
| `src/routes/plan/+page.svelte` | Adopt WeekCard + EmptyState |
| `src/routes/you/+page.svelte` | Adopt SegmentedControl + EmptyState + Button |
| `src/routes/history/+page.svelte` | Adopt EmptyState (2 instances) |
| `src/routes/today/+page.svelte` | Adopt LoadingSpinner + EmptyState |
| `src/lib/components/ExerciseDetail.svelte` | Adopt EmptyState (1 instance) |
| `src/routes/friends/+page.svelte` | Adopt LoadingSpinner (2 instances) |

## Decisions

1. **Today welcome screen stays custom** — it's a rich onboarding experience (heading + privacy card + backup tip + CTA), not a simple empty state
2. **CoachChat typing dots stay custom** — 3 animated dots in a chat bubble, not a text-based loading state
3. **Coach loading in today adopts LoadingSpinner** with `wrapperStyle` for the gradient card context
4. **friends empty state stays inline** — has `id="friends-list"` used by tests, plus emoji content
5. **ActionRow remains unused** — no equivalent inline pattern found, leave as-is
6. **Button `size` prop not added** — the existing 4 variants cover all inline patterns; size variations handled via `style` prop

## Test Impact

- The flow test uses `#you-tab-ejercicios` which won't match SegmentedControl's internal buttons. Since the test pre-exists failure at line 55 (`#user-name`), this doesn't break anything new. `data-testid` attributes future-proof the selectors.
- No new tests needed — this is a pure refactoring with no behavior changes
