# Full UI capability and visibility audit — v5.9.3

**Date:** 2026-10-31  
**Verified development CI:** https://github.com/saeedsai/SuperMagicAssetStudio/actions/runs/41195559915  
**Audit guide:** [UI_COVERAGE_AUDIT.md](UI_COVERAGE_AUDIT.md)

| Verification | Result |
|---|---|
| Static HTML inputs/actions cataloged and visibility-audited | **210/210** (contextual equivalents included) |
| Dynamic property descriptors retained | **53** (schema audit plus Inspector/import browser tests) |
| Real browser interaction states exercised | **63** |
| Hidden compatibility actions checked for visible replacements | **32/32** |
| Hidden file inputs checked for visible triggers | **7/7** |
| Hidden export relays with visible menu alternatives | **3/3** |
| Node/domain/CLI/UI contract tests | **PASS — 189/189** |
| Requirement traceability | **PASS — 134/134** (132 requirements + 2 uniqueness checks; included in Node test count) |
| Chromium UI tests | **PASS — 63/63** |
| Mandatory development CI gate | **PASS** |

**Confirmed fixes:** `menuRemoveBackground` now opens the integrated sprite extraction background-removal panel, while `menuStandaloneBackground` remains visibly reachable from Tools and opens the standalone dialog. Custom-mode structure changes no longer crash Inspector rendering for a layer category inherited from another structure; the original type is preserved as a selectable option. All documented duplicate buttons retain canonical interactive counterparts, and the contextual import queue/camera reference commands are tested through real input events.

**Limitations:** Browser DOM visibility and behavior coverage does not prove pixel-perfect layout on all physical screens, production-art visual correctness or native touch/pen/Windows workflows. Render deployment requires separate validation after main merge.

---

# Inspector property visibility hotfix — v5.9.2

**Date:** 2026-10-31  
**Verified source:** `ec1b8daea0e7b6956d6610a5aeb9b0cb17a5ff2b`  
**Development CI:** https://github.com/saeedsai/SuperMagicAssetStudio/actions/runs/41192667712

| Suite | Result |
|---|---|
| Node, CLI, integration, schema and unit tests | **180/180 pass** |
| Requirement traceability | **131/131 pass** (129 requirements plus 2 uniqueness assertions; part of Node tests) |
| Chromium browser regression | **60/60 pass** |
| Required regression gate | **PASS** |

**Root cause:** The right Inspector workspace could be hidden or its section left in the legacy collapsed state even after layer selection. The new Edit image workflow and legacy layer selection did not use a single guaranteed property-panel reveal path.

**Resolution:** Added `SuperMagicStudioUI.showLayerInspector()`; canvas selection, Layers-list selection, multi-selection, browser `selectLayers()`, and the Edit image toolbar action now activate the Inspector workspace and expand its controls. The existing toolbar handler remains owned only by `image-edit-panel.js` to avoid duplication.

**Regression tests TC-126–TC-129:** Select a real PNG layer through the Layers list and edit its scale; select the image directly on canvas; click Edit image after collapsing the Inspector; multi-select layers and verify editable group properties. Existing TC-001–TC-125 remain unchanged and passing.

**Out of scope:** Native Windows PowerShell/device tests and production-art visual golden tests remain unverified. GitHub Pages and Render production status must be checked separately after the release merge.

---

# Image editing discoverability — v5.9.1

**Date:** 2026-10-31  
**Verified code:** `f51599f05bc459ca53ce715b1355d640fe9d6003` (all functionality and tests), with subsequent robustness/test-only changes on `dev`.  
**Verified run:** https://github.com/saeedsai/SuperMagicAssetStudio/actions/runs/41192003108

| Automated suite | Result |
|---|---|
| Node unit/integration/contract | **PASS — 176/176** |
| Requirement traceability | **PASS — 127/127** (125 requirements + two uniqueness assertions) |
| Chromium UI | **PASS — 56/56** |
| Required release regression gate | **PASS** |

New usability regression scenarios TC-122 through TC-125 verify a visible Edit image entry, automatic navigation from image selection, accessible Transform & mirror and Color & tint controls, expandable crop/fit modules, functional flip and brightness controls, and narrow-screen editing. The original Inspector inputs and event listeners are reparented without cloning or loss; UI control catalog now contains 210 static entries plus 53 dynamic properties. All normal PNG/JSON/API/CLI operations are retained.

**Limitations:** Production artwork visual review, actual touch device testing and native Windows PowerShell remain unverified. A GitHub branch merge is not proof of an updated Render live deployment. Check main and Render independently.

---

# SuperMagic Asset Studio — API/CLI capability audit (v5.9)

**Date:** 2026-10-30  
**Verified source commit:** 4da7c5df15c2615b256638da258bc99eb7e73bb7  
**Verification run:** https://github.com/saeedsai/SuperMagicAssetStudio/actions/runs/41065627048

## Verified automated results

| Suite | Result | Evidence |
|---|---|---|
| Node unit/domain/CLI/contract tests | **PASS — 172/172** | npm test |
| Requirement traceability | **PASS — 123/123** | 121 requirements plus two uniqueness assertions (included in Node run) |
| Syntax, layout, module import checks | **PASS** | npm run test:contracts |
| Chromium UI browser | **PASS — 52/52** | npm run test:browser |
| Required CI regression gate | **PASS** | Both required GitHub Actions jobs succeeded |
| Windows native PowerShell | NOT RUN | Node command bridge tested, no real Windows runner |
| Human visual / production sprites | NOT RUN | Requires a canonical art pack and device coverage |
| Production Render deploy | NOT VERIFIED | Separate deployment check required |

## Inventory and implemention

- [src/shared/ui-capabilities.json](../src/shared/ui-capabilities.json) catalogs **209 static HTML controls** and **53 dynamic property descriptors** with IDs, input types, select options, numeric limits and browser/CLI availability. No static controls are removed.
- Browser SuperMagicAssetStudioAPI provides listCapabilities, listUIControls, getUIControl, setUIControl, setUISettings, getAllUISettings, getSavedUISettings, applyUIOptions and invokeUIAction.
- Existing structured browser runCommands now supports listCapabilities, getControlValue, setControlValue, invokeControl and paint. The new SuperMagicPaintAPI methods support programmatic selection, brush, eraser, fill, clone, shapes, texture import and text.
- CLI provides --list-controls, listCapabilities, getControlValue, setControlValue, invokeControl and paint (Node or PowerShell). Headless paint creates normal raster layers, exports PNG, handles selection masks and cloned image erasure, and supports primitive bitmap text.
- Editor-only option values are preserved in project.editor.uiOptions and restore on load. Model-backed settings update existing project fields.
- Browser-only dialogs, file pickers, canvas zoom/playback, and font-accurate text are labeled clearly rather than represented as equivalent CLI commands. Headless PNG renderer uses a 4MP paint limit and differs from browser Canvas antialiasing.
- [Browser API documentation](API.md), [CLI API](CLI_API.md), [image-tool API](IMAGE_TOOLS_API.md), [command schema](../examples/cli-command-schema.json), [requirements](REQUIREMENTS.md) and [test plan](TEST_PLAN.md) were updated.

## Test coverage and gaps

The 123 traceability checks validate evidence and uniqueness; **they are not 121 independent end-to-end UI tests**. The 52 browser cases and the Node domain/CLI/raster integration tests provide additional behavioral evidence. The automated checks cover a substantial subset of settings, selections, masks, drawing, clone, original eraser safety and PNG export. Native Windows PowerShell, production-art visual fidelity, system-font parity and touch/stylus UX still require manual or dedicated platform validation.

## Release policy

Changes were developed on dev. Promote via PR only after full latest-head CI. After merging, verify main CI, GitHub Pages and Render separately. Render previously reported an outdated live commit; do not mark the Render deployment up to date without a matching live SHA.
