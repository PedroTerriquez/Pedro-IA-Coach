---
name: design_prompt
description: Turn Pedro's design request into a complete Claude Design prompt. Analyzes how the app works today for that request (screens, flows, states, data, edge cases, the existing Claude Design cards), lists everything the change could affect, then writes the prompt on top of the base brief in docs/design-brief.md, in English, and copies it to the clipboard. Use when he asks for a prompt to request a design, a redesign, or "pídeselo a Claude Design".
argument-hint: <what he wants designed or changed, in his words>
---

You write design prompts for Claude Design for Coach Pedro AI. The prompt has to carry everything a
designer who has never seen the code needs: who uses the app and where (the base brief), how the
thing works TODAY, every flow and state the change touches, and exactly what to deliver. A vague
prompt gives a pretty design that breaks a flow; your job is to prevent that.

Input: `$ARGUMENTS`, Pedro's request in his own words (Spanish, often short).

## Step 1 — Restate the request

Rewrite `$ARGUMENTS` in one or two sentences: what screen or piece, what bothers him, what he wants
instead. If a key point is truly ambiguous (which screen? replace or add?), ask ONE question with
AskUserQuestion; otherwise go on with the most likely reading and say which one you took.

## Step 2 — Analyze how the app works today

Read the code, not your memory. AGENTS.md is in context; `docs/screens.md` maps routes to components.
For the screen(s) involved:

1. **Where it lives**: route, components (`src/routes/…`, `src/lib/components/…`), and which
   shared components it reuses (DetailSheet, LogDock / NextStepDock, DayPanel, ExerciseRow…).
2. **How you get there and where it leads**: every entry point (tabs, rows, docks, sheets,
   notifications, the rest timer) and every exit (what each button does, what opens next).
3. **States**: empty / first time, normal, done / registered, record, many items, long names,
   rest timer running or minimized over it, onboarding, Watch/notification return (offline and
   loading are noted for Pedro but never requested as designs).
   Find them in the component's `{#if}` branches and in `tests/big.spec.cjs` (each `step(...)`
   names a promised behavior; grep the screen's components and texts there).
4. **Data**: what it reads and writes (`src/lib/types.ts`, `storage.ts`, `set-log.ts`,
   `plan-week.ts`…), so the design doesn't show data the app doesn't have, or drop data it needs.
5. **Neighbors that must stay consistent**: the same data or pattern shown elsewhere (e.g. sets in
   the detail, the timer's «Confirma tus series» and Historial; days in Plan and Hoy).
6. **Existing cards**: which Claude Design cards show this today. The map is `source:` in
   `scripts/ds/groups.mjs`; card paths are `vistas/<view>/<card>`. Name them by their card title
   (e.g. «Detalle · Registrado», «Piezas de Detalle v2»). If the local cards look stale against the
   code, say so and offer to regenerate and upload them before Pedro asks for the design
   (docs/design-system.md has the steps).

## Step 3 — Show Pedro the analysis

Before writing the prompt, give him a short summary in Spanish:
- **Cómo funciona hoy**: the flow in 3–6 lines.
- **Lo que tu cambio puede afectar**: flows, states, other screens, data, tests; mark the risky
  ones (a behavior a test promises, data that would be lost, a shared component used elsewhere).
- **Decisiones abiertas**: only the ones the designer can't decide alone. Ask with
  AskUserQuestion if they change the prompt; otherwise state the default you'll write in.

## Step 4 — Write the prompt (short)

The full analysis is for Pedro; the prompt carries only what the designer can't see in the cards.
Aim for 25–30 lines in total. Start with the block from `docs/design-brief.md` (inside its code
fence), then add, in English, quoting UI copy in Spanish with «»:

```
Cards: «…», «…» (reference: «…»).

Problem: <1–2 lines, Pedro's complaint made concrete>

Want:
- <3–5 outcomes, not pixels; visual choices are the designer's>

Don't break:
- <only what the cards don't show: where taps lead, data limits, shared components,
  behaviors the tests promise — 2–4 bullets>

Show: <main state + the states the change touches, one line>

Save: as a NEW proposal in group «Nuevo · <Vista>», files under vistas/nuevo-<vista>/.
Never edit, move or overwrite the existing cards — they are generated from the live app.
```

Rules: don't describe what the cards already show; no generic UX advice (the brief has it);
never ask for loading or offline screens; real names of screens, buttons and data; always end
with the `Save:` line. `<Vista>` = main view + the feature, so two proposals never share a group
(e.g. «Nuevo · Hoy actividades», path `vistas/nuevo-hoy-actividades/`); check the Claude Design
file list for an existing `vistas/nuevo-*` with the same name first.
Existing proposals already use this pattern (e.g. `vistas/nuevo-temporizador/`), listed in
`handMade` in `scripts/ds/manifest.mjs` so the card upload keeps them.

## Step 5 — Deliver

Copy the whole prompt to the clipboard with `pbcopy` (heredoc), then tell Pedro in Spanish, briefly:
it's in the clipboard, which cards to open in Claude Design
(https://claude.ai/design/p/b0cb0621-bd00-46bb-983d-f45eda792441), and the 2–4 key points the
prompt asks for. Don't paste the prompt into the chat unless he asks.

When the design comes back and Pedro asks to build it, that is normal implementation work: read
the new file in Claude Design (DesignSync `list_files` / `get_file`), implement, run the tests,
regenerate and upload the affected cards.
