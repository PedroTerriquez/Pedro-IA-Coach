# Implementer Agent — Commit Policy

When the `implementer` subagent finishes its work, it MUST:

1. Run `bash scripts/bump-version.sh` to bump `_VER_BASE` minor in `src/lib/pwa.ts` + update date. **This script runs `npm run check` + `npx playwright test` FIRST and aborts the bump if they fail** — fix any failures before proceeding.
2. **Update `_VER_DESC`** in `src/lib/pwa.ts` to describe the actual changes (concise, ~10 words)
3. Run `npm run build` — fix any failures
4. `git add` all changed files (only relevant ones, no untracked docs/artifacts)
5. `git commit` with a descriptive message including the version
6. `git push` — only after the tests that `bump-version.sh` gate ran have passed

## Verification Before Commit
Use `git status`, `git diff`, `git log --oneline -3` before committing to verify state.
Never commit untracked files outside the scope of the task (e.g. `docs/`, `training-with-pedro/`).

## Version Tracking (from `src/lib/pwa.ts`)
- `APP_VERSION = \`${_VER_BASE} · ${__BUILD_TIME__} · ${_VER_DESC}\``
- `__BUILD_TIME__` injected by `vite.config.ts` at build time
- **Bump minor version +1 with every commit** (`v2.15` → `v2.16`), not just the date
- **Update `_VER_DESC`** to a concise (~10 words) description of actual changes
- SW cache scoped by build hash via SvelteKit's `$service-worker` (`cache-${version}`) — updates automatically, no manual CACHE bump needed
- **`bump-version.sh` runs the tests ITSELF and ABORTS the bump if they fail.** It runs `npm run check` and `npx playwright test` BEFORE touching the version. Never bypass this gate (`BUMP_SKIP_TESTS=1` is only for quick diagnostics; never commit a bump with failing tests)
- Version shows in `src/routes/today/+page.svelte` (imports `APP_VERSION` from `$lib/pwa`)