# Stone Designer — project notes for Claude

## What this is
A web tool for checking natural stone cladding panels against BS 8298-2:2020 (traditional
handset external cladding) and BS 8298-4:2020 (stone cladding on rainscreen support systems):
panel thickness by flexure, fixing breakout, loadbearing fixing dead load, length of returns,
restraint dowel size and thermal movement at joints, plus a marketing site. The report output
is modelled on the example report `docs/reference/GFS template-Stone Calc.docx`.

## Layout (pnpm workspace, Node 22)
- `packages/engine` — pure TypeScript calculation engine. No UI, no I/O.
  - `src/data/*.ts` — every number taken from a reference document, each `{ value, source }`
    (document, clause/table, page). Unknown values are `TODO_VALUE`.
  - `src/resolve.ts` validates inputs and resolves defaults; `src/checks.ts` builds the
    combinations and checks; `src/index.ts` exports `runChecks()` and `panelField()`.
- `apps/app` — Vite + React + react-three-fiber checker (inputs left, 3D stone centre,
  verification right, PDF report).
- `apps/site` — static multi-page landing site (Netlify Forms contact form).
- `validation/` — hand-computed reference cases compared with the engine to 1 in 10^5.
- `docs/calc-spec.md` — the release-1 calculation spec. The engine implements this and
  nothing else. Change the spec first.
- `docs/open-questions.md` — every value or rule the documents leave open (OQ-xx).
- `docs/reference/` — the standards. The PDFs are licensed copies and are git-ignored; only
  the README listing them is committed.

## Rules
- Never invent engineering values. If the documents do not give it, use `TODO_VALUE` and
  add an entry to `docs/open-questions.md`. Template values are labelled as examples.
- Where documents disagree or leave a choice to the engineer, make it a user parameter with
  the default the standard states, and raise an advisory when the user departs from it.
- Units inside the engine: N, mm, N/mm² (MPa). kN/m², kN/m³ and kN are converted at the edge.
- `pnpm test` and `pnpm typecheck` must be green before each commit.
- Do not copy other websites. Keep the non-affiliation disclaimer for BSI and the fixing
  manufacturers. Results must be checked by a qualified engineer.

## Commands
- `pnpm install`
- `pnpm test` — all workspace tests
- `pnpm typecheck` — tsc across the workspace
- `pnpm --filter @stone/validation validate` — print the validation table
- `pnpm --filter @stone/app dev` (http://localhost:5173), `pnpm --filter @stone/site dev` (5174)
