# SuperMagic Asset Studio — verification report

**Refactor branch:** `dev` (pre-publish local run)
**Date:** 2026-10-30

## Results available now

| Test tier | Outcome | Evidence |
|---|---|---|
| Node domain + CLI behavior | **PASS: 22 / 22** | `npm test` |
| Requirement-level contracts | **PASS: 102 / 102** | `tests/unit/traceability.test.mjs` |
| Uniqueness checks | **PASS: 2 / 2** | REQ and TC identifiers unique |
| Module layout, references, syntax | **PASS** | `npm run test:contracts` |
| Chromium browser regression | **PASS on commit 322d506b; latest dev run pending** | GitHub Actions CI; check latest head before merge |
| Actual Windows PowerShell execution | **NOT EXECUTED** | PowerShell 7 not installed in local test container |
| Production artwork visual QA | **NOT EXECUTED** | Requires canonical reviewed art fixture |

**Important:** All 102 requirements have a unique contract test and traceability record. Contract evidence is a source check, **not 84 end-to-end behavioral verifications**. Behavioral domain/CLI tests and Chromium browser tests provide deeper coverage; future work should increase behavior test depth for each requirement.

## Changes

- Organized source into `src/editor`, `src/cli`, `src/runtime`; split HTML, CSS and reusable sprite geometry.
- Added `AGENTS.md` and updated README with preserved credits and MIT license.
- Added 102-item requirements register and a test case for each requirement, with CI traceability gate.
- Added 22 headless behavioral tests and 37 Chromium browser cases.
- Added `dev` → PR → `main` governance and GitHub Actions workflow.
- Removed historical screenshots and generated asset bundles from tracked source tree (kept examples small).

## Risk and remaining work

1. Wait for required GitHub Actions checks on the latest dev commit and fix any failing cases before merging to main.
2. Fully modularize the still-large browser `app.js` controller in follow-up PRs (currently split by architecture but still contains legacy tightly-coupled DOM logic).
3. Test Windows PowerShell on a Windows runner; CI currently validates its Node command engine, not native PowerShell.
4. Add canonical visual golden screenshots and production 8-view artwork for pixel-diff testing.
5. Review other historical user requests when new requirements arrive; update `docs/REQUIREMENTS.md` and add matching tests first.