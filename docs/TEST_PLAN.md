# Regression test strategy

## How to run

```sh
npm test                       # unit, integration and 120 traceability cases
npm run test:contracts         # JS syntax, import paths and folder layout
npm run test:browser           # Python 3 + playwright + Chromium installed
```

Browser setup: `python -m pip install playwright && python -m playwright install chromium`. On managed Linux, `python -m playwright install --with-deps chromium` may require sudo.

## Case matrix and evidence

`tests/requirements.json` assigns **one independent TC identifier to each of 129 requirements**. The Node traceability test reports those 125 contracts separately and verifies each requirement has an implementation evidence file/token. Those tests establish **wiring/coverage**, not full functional correctness. Additional domain/CLI behavior tests exercise the high-risk workflows. Chromium tests exercise menus, mode-based parts, split dialogs, selection controls, AI command panel and startup without JS errors.

| Suite | Tests | What it measures | Gate |
|---|---|---|---|
| Node domain/image | ~29 | Modes, views, parts, transforms, crop, color, animation, masks, PNG/GIF | Mandatory |
| Node CLI integration | 2 | JSON round-trip, render, manifest, undo/redo, dry run | Mandatory |
| Requirement traceability | 127 | 119 named acceptance contracts plus uniqueness checks | Mandatory |
| Browser Chromium | 60 | UI startup, menu and control behaviors, scripted commands | Mandatory |
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

## UI modularity acceptance (TC-103 to TC-111)

Browser checks exercise tabs, keyboard navigation, active tool properties, duplicate action aliases, sprite extraction context, advanced import/clip disclosure and small viewport usability. The original DOM IDs and all 102 prior requirements remain, with the same JSON schema, engine APIs, and command handlers. Static unit tests independently verify unique DOM IDs, workspace allocation, property mappings and the continued existence of major feature controls.

## API and CLI parity (TC-112 to TC-119)

The static control catalog is compared to every unique button/input/select/textarea ID in index.html. The browser checks control discovery, typed get/set, menu invocation, scripted rectangle/brush/gradient and DOM behavior. Node/CLI tests validate paint layers, original-asset erasing, clone stamp, color picker, selections, gradient, imported PNG textures, shapes, bitmap text, typed settings and JSON/export round-trip. Each UI entry states its headless mapping or browserOnly limitation; contract coverage does not assert pixel-identical output. A complete production-art visual test and native Windows PowerShell remain outstanding.

Structured browser runCommands uses the same command names for listCapabilities, getControlValue, setControlValue, invokeControl and paint as the CLI, with the documented difference that browser result formatting is human-readable text and CLI results are JSON.

Dynamic property contract coverage checks the mutable Inspector/custom part/import queue fields and their corresponding headless command paths. This is schema evidence; visual and behavior tests remain separately reported.

## Image editing discoverability (TC-122–125)

The Edit image toolbar action is the unique navigation entry for editing a selected image. Selection automatically opens the right Edit image workspace; if none is selected, the left Layers workspace opens to guide selection. The existing Inspector control DOM nodes are reparented (not cloned) into Image & layer, Transform & mirror, Color & tint, Source crop and Auto-fit & defaults groups. Browser tests verify that the original mirror and color handlers still mutate the selected layer, crop/auto-fit are expandable, and access is retained at narrow viewport sizes.

## Inspector selection visibility regression (TC-126–TC-129)

Chromium tests import a genuine raster asset and layer, then verify visible transform/color settings following layer-list selection, direct on-canvas picking, the Edit image toolbar action, and multi-layer selection. Tests explicitly collapse the Inspector and switch away before selection, assert the Inspector workspace reopens, and edit a transform field to confirm actual persisted project data. The toolbar action remains owned by image-edit-panel.js; UI-shell provides one shared reveal method rather than adding a duplicate listener.

## Full UI discoverability regression (TC-130–TC-132)

TC-130 explores the HTML editor in Chromium across **every left/right workspace, all visible menus, all paint modes, import options, animation clips, Inspector modules, real single and multiple layer selection, sprite extraction modes (alpha/grid/rectangle/polygon/Bézier/wand), background cleanup, crop, AI/help dialogs, missing external file recovery, and selectable input options**. It fails if any static control never becomes visible outside the explicitly documented hidden legacy aliases, file inputs or paint-tool selector. Canonical replacement controls must themselves become visible. TC-131 verifies Inspector editing of layers with categories preserved from an earlier asset structure after switching to custom mode. TC-132 exercises primary options on a 390px narrow mobile viewport. Additional unit contracts require a one-to-one mapping of all hidden aliases to visible canonical actions and all hidden file pickers to triggers. Human visual/device coverage is reported separately.

## Menu consolidation and Paint sidebar (TC-133–TC-135)

TC-133 verifies Import and Tools have become one visible **Edit** menu with all original action IDs and exercises image splitting, standalone background removal and AI actions. TC-134 opens File → Import image and Edit → Import PNG/JSON via browser file chooser to confirm they use the same original input and preserve the import workflow. TC-135 verifies Paint no longer occupies a top navigation menu, its right sidebar tab exposes **all 16 paint modes plus Clear selection**, every action has an inline accessible decorative SVG, selecting each mode updates the real Paint API and highlighted button state, and clearing an existing selection works. The previous whole-interface reachability test TC-130 remains mandatory, updating all menu routes to the new locations. Node contracts assert all menu commands, icon path mappings, unique IDs, workspace sections and API control catalog remain intact.


## Hierarchical rigging and skeletal animation (TC-136–TC-142)

Node domain tests verify parent-child joint rotations, cycle/duplicate rejection, attachment anchor offsets, non-destructive layer transforms, pose templates, keyframe interpolation and serialized JSON. The command-engine integration test exercises `createRig`, `setPose`, `setMotion`, `samplePose` and `listPosedLayers`. The standalone runtime test verifies that an attached sprite follows a parent joint. Chromium TC-140 opens the actual rig dialog, creates the football skeleton, verifies bone handles, applies the Jump preset and moves a joint. Normal existing UI regression tests must remain green.

**Manual art acceptance still required:** Using actual cutout PNGs for all eight camera views, validate hip/knee/ankle and shoulder/elbow/hand pivot locations, pivot offsets, draw order and joint rotation ranges; play and export idle/run/jump/celebrate at production resolution; inspect frames for gaps, detached limbs, clipping and foot sliding. Physics constraints and 3D view-consistent retargeting are not yet supported.
