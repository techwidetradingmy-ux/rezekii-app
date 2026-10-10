@AGENTS.md

# Rezekii — working rules (set by the owner, 2026-10-10)

These override any default behaviour. Read `CONTEXT.md` (vocabulary), `docs/adr/` (decisions) and `../REZEKII_REBUILD_SPEC.md` (the plan) before starting work.

1. **Plan first, then wait.** Before any change — code, database, config, docs, memory or workflow — show the owner a short plan of exactly what will change and why, and wait for explicit approval. Answering a grilling question counts as approval for recording that answer.
2. **Docs and memory stay current, never changed silently.** `CONTEXT.md`, `docs/adr/`, the spec, `CLAUDE.md` and Claude's memory are kept up to date, but only after the owner approves the change.
3. **Change only what was approved.** Fix the specific issue the owner proposed; do not refactor, restyle, rename or "improve" any other part of the code in the same change.
4. **Every claimed feature must really work.** Before coding a phase, agree a written flow list (every flow + exact expected result, including failure cases) with the owner; it becomes the automated tests and the sign-off checklist. Nothing is shown or promised to users unless its flow is on the list and passing end to end (automated tests plus a real run on the test copy). Test results are reported honestly, including failures.
5. **Freeze proven versions.** Each proven phase is frozen as a version (v1 = posting, v2 = + link converter, …) as a Git tag that is never edited and can be redeployed instantly. A bug in a frozen version is fixed as a new patch version (v1 → v1.1), planned, approved, tested and frozen the same way.
6. **Lean and fast.** Load only the data a screen needs (pagination of 50, selected columns, server-side filtering, calendar loads only the visible week); no bulk loading, no unnecessary requests. Target: main content within ~2 s on Malaysian 4G phone data, actions respond within ~1 s.
