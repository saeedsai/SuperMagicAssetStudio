# Regression test strategy

## How to run

```sh
npm test                       # unit, integration and 102 traceability cases
npm run test:contracts         # JS syntax, import paths and folder layout
npm run test:browser           # Python 3 + playwright + Chromium installed
```

Browser setup: `python -m pip install playwright && python -m playwright install chromium`. On managed Linux, `python -m playwright install --with-deps chromium` may require sudo.

## Case matrix and evidence

`tests/requirements.json` assigns **one independent TC identifier to each of 102 requirements**. The Node traceability test reports those 102 contracts separately and verifies each requirement has an implementation evidence file/token. Those tests establish **wiring/coverage**, not full functional correctness. Additional domain/CLI behavior tests exercise the high-risk workflows. Chromium tests exercise menus, mode-based parts, split dialogs, selection controls, AI command panel and startup without JS errors.

| Suite | Tests | What it measures | Gate |
|---|---|---|---|
| Node domain/image | ~29 | Modes, views, parts, transforms, crop, color, animation, masks, PNG/GIF | Mandatory |
| Node CLI integration | 2 | JSON round-trip, render, manifest, undo/redo, dry run | Mandatory |
| Requirement traceability | 104 | 102 named acceptance contracts plus uniqueness checks | Mandatory |
| Browser Chromium | 37 | UI startup, menu and control behaviors, scripted commands | Mandatory |
| Human visual QA | Checklist | Artistic quality, overlap, anti-aliasing, anatomical handedness, animations | Release review, reported separately |

## Manual QA checklist

- Render all eight directions with real football artwork; inspect shadows, neck joint gaps, shoes, hair, uniform consistency.
- Verify sprite masks around thin strands and curves at high zoom.
- Compare cropped file against original PNG pixels and visually check adjacent sprite preservation.
- Open exported project in game runtime and confirm layering with real animation frames.
- Verify Windows PowerShell wrapper on actual Windows/PowerShell 7; Node suite tests CLI only when PowerShell unavailable.
- Verify touch/keyboard accessibility and responsive layout on phone-sized viewport.
- Load large multi-view JSON bundles and monitor responsiveness/memory.

## Common failures to fix before main

- Browser `pageerror`, script import mismatch or missing CSS.
- Invalid crop, asset reference loss, relative-path traversal or broken animation links.
- Unmapped requirement, regression test missing from CI, build artifact in root.
- Headless and browser PNG render incompatibilities.

## Reporting

Use `docs/TEST_REPORT_CURRENT.md` for the latest verified run. Distinguish locally executed tests from GitHub Actions status; a configured check is not a passing check until GitHub reports success. CI runs on `dev`, `main` and PRs into `main`. Main is released only after dev checks pass and a PR review/merge. Automatic Render deployment uses `main`.

## Paint and selection acceptance (TC-085 through TC-102)

Main-canvas rectangle, freeform polygon and flood selection all produce reusable selection masks. Brush tips, preset/imported textures, erase mode, clone, fill, two-color gradient, eyedropper, text, and six shape tools are covered by a named Chromium check for every requirement. Nine additional Node tests cover geometry, masked alpha and wand bounds. Save/undo and the Paint menu are exercised in Chromium. Actual visual texture fidelity, font rendering on non-Linux platforms, and mobile touch gestures require manual validation.
