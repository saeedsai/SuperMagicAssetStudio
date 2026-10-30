# Agent instructions — SuperMagic Asset Studio

**Project owner / creator:** Saeed · saeedmsalehi1990@gmail.com  
**Mission:** Maintain a backward-compatible, production-ready 8-direction 2.5D football sprite editor, CLI, JSON format and runtime.

These instructions apply to GitHub Copilot, Codex, Claude, ChatGPT Work and other autonomous coding agents working in this repository. Read `docs/REQUIREMENTS.md` before writing code.

## Branch and release policy

1. Work on `dev` (or a feature branch targeting `dev`). **Never push unverified changes directly to `main`.**
2. Use small commits, clear messages and avoid unrelated changes. No force pushes.
3. Run `npm test` and `npm run test:contracts`. Run `npm run test:browser` or wait for CI's Chromium job. Do not promote to main while any required check is red.
4. Open a PR from `dev` to `main` after CI passes; review file changes and merge via the PR. The Render static site deploys `main` automatically.
5. After merge, verify production URL and CI result. Report unresolved items explicitly.

## Architecture boundaries

- `index.html`: stable static-site entry point, semantic UI markup only.
- `src/editor/styles.css`: UI styling. Use CSS classes, not embedded styles for new components.
- `src/editor/app.js`: legacy browser editor controller. Keep edits small; extract isolated behavior into modules rather than expanding this file.
- `src/editor/sprite-geometry.js`: pure view-independent shapes and curve geometry; no project state, no network calls.
- `src/cli/agent-engine.mjs`: schema-aware commands and project data model.
- `src/cli/agent-raster.mjs`, `src/cli/agent-image-tools.mjs`: PNG/GIF rendering, crop, masks, splitting and background operations.
- `src/cli/agent-cli.mjs`: headless JSON CLI adapter with structured error/results.
- `src/runtime/runtime.js`: compatibility path for game rendering.
- `examples/`: small, reusable input files, not generated screenshots or personal assets.
- `tests/`: behavioral unit/integration and browser tests plus feature traceability.
- `docs/`: API, architecture, requirements and production guides.

The browser editor still contains a large controller. Future refactors must preserve startup order, DOM IDs, `SuperMagicAssetStudioAPI`, `FootballSpriteStudio` JSON, and CLI operation names.

## Source of truth and requirements

- `docs/REQUIREMENTS.md`: all accumulated product requirements; each `REQ-NNN` links to `TC-NNN` in `tests/requirements.json`.
- `docs/JSON_FORMAT.md`: persisted JSON schema and compatibility.
- `docs/API.md`, `docs/CLI_API.md`, `docs/IMAGE_TOOLS_API.md`: public interfaces.
- `docs/ASSET_CREATION_GUIDE.md`: artwork prompts and production constraints.
- `docs/TEST_PLAN.md`: test tiers and manual acceptance.
- `docs/ARCHITECTURE.md`: module ownership and data flow.

When implementing a feature:
1. Define acceptance criteria and update/add `REQ-NNN` and corresponding `TC-NNN`.
2. Implement the domain code first and add a failing unit/integration regression.
3. Expose the feature consistently through UI, browser API, CLI and JSON as applicable.
4. Add browser coverage for visual interaction and a CLI/API example when externally accessible.
5. Update documentation; run checks; report evidence and unsupported cases.

## Non-negotiable compatibility and quality constraints

- Preserve these camera IDs and order: front, threeQuarterFrontLeft, left, threeQuarterBackLeft, back, threeQuarterBackRight, right, threeQuarterFrontRight.
- All source-image `crop` and `transform` data use original PNG pixel coordinates, explicit `scaleX`/`scaleY`, `rotationDeg`, pivots and mirroring. Do not silently normalize scales.
- Maintain layer z-order, per-part visibility/lock, RGB/HEX color adjustments, default positions, animation/frame inheritance and linked clip behavior in serialized JSON.
- Both embedded-base64 and external-file image storage must work. Never delete source PNGs after split/crop; cutouts have transparent pixels outside masks.
- Keep existing asset modes: fullBody, bodyHead, standard, custom. Custom structures can start from any base and be exported.
- Do not introduce remote AI calls, analytics, credentials, or uploads without explicit product approval. Current "auto-fit" is deterministic image geometry, not semantic AI.
- Reject malformed image dimensions, invalid crop bounds, path traversal and uncontrolled allocation where inputs are untrusted. Avoid arbitrary eval of AI commands.
- No generated artwork/screenshots/temp JSON or archived ZIPs in repository root. Test artifacts stay in temporary CI folders or downloadable CI artifacts.
- Do not edit/license-strip the credit or MIT license. Do not claim tests or production deploy succeeded without checking results.

## Commands

```sh
node --version                   # Node >= 20
npm test                         # CLI, domain, geometry, contract tests
npm run test:contracts           # layout/traceability/syntax
npm run test:browser             # Python + Playwright required
node src/cli/agent-cli.mjs --list-ops
node src/cli/agent-cli.mjs --project /tmp/alex.json --op review
```

Use `SuperMagicAssetStudio.ps1` on Windows/PowerShell. It wraps the same Node CLI.

## Reporting format

Summarize changed modules, requirement IDs, exact tests executed and pass/fail counts, tested commit SHA, any CI/deploy URL, and outstanding limitations. Never mark browser visual quality verified after only source/static checks.