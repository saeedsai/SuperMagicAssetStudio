# UI modularization reachability audit — v5.9.3

**Scope:** Static HTML controls, dynamic properties, contextual settings, menu actions, dialogs, file pickers, asset-structure modes, sprite extraction, paint tools, Inspector and responsive layouts.

## Inventory

| Inventory item | Count | Source |
|---|---:|---|
| Static buttons/inputs/selects/textareas | **210** | [Shared control catalog](../src/shared/ui-capabilities.json) |
| Dynamically rendered property descriptors | **53** | Catalog `dynamicProperties` |
| Menu and global action buttons | 50 | Catalog `menu` |
| Project and asset controls | 65 | Catalog `project-and-assets` |
| Paint, sprite split and background cleanup | 62 | Catalog `paint-and-image` |
| Animation controls | 10 | Catalog `animation` |
| Layer controls | 7 | Catalog `layer` |
| Camera and canvas controls | 16 | Catalog `canvas` |
| Dropdowns with option values | **25** | Native HTML select controls |
| Intentional hidden legacy aliases | **32** | [Reachability contract](../src/shared/ui-reachability.json) |
| Hidden export relays | **3** | Visible File → Export menu commands |
| Hidden native file input controls | **7** | Visible upload/replace controls |

The audit distinguishes **intentionally hidden** (a duplicate of another visible action or native file input) from **contextually visible** (a real control shown only after the relevant selection, tool or dialog is opened). There is no requirement to show every control simultaneously; the acceptance condition is that each capability has an understandable, executable UI path. The Paint tool selector `paintTool` is intentionally replaced by the Paint menu.

## Scenarios checked in Chromium

The UI explorer `TC-130` enumerates control visibility through the real document layout and checks every static non-aliased control, every declared dropdown choice, and canonical replacements for all intentionally hidden relays. It explores the following user workflows:

1. Left workspaces: Project, Assets, Animation, Layers, Camera; right workspaces: Edit image, Canvas and Shortcuts. Each collapsible section is expanded using its heading.
2. Main menu: File, Import, Tools, Paint, Help, and the View/Animation menus only if they contain commands not already present in the visible workspaces.
3. Asset structure and schema: standard, custom-part controls, import behavior, linked timeline clips, missing external image resolution.
4. Paint: every selection, brush, eraser, clone, fill, picker, text and shape mode; solid/gradient/texture fill, color, size, opacity, fonts, imported texture and clear-selection controls.
5. Image editing: a real PNG-backed layer with all five Image/Transform/Color/Crop/Fit modules, mirror/opacity/color/scale, multi-selection group properties.
6. Sprite processing: manual crop, auto split, alpha/grid detection, rectangle/freeform/Bézier/wand boundaries and sprite-preview background cleanup.
7. Standalone background removal (distinct from sprite preview cleanup), AI console, help, auto-resize and crop dialogs.
8. Actual file staging showing Import queue/Apply/Clear and all per-file view/part/animation/frame/mirror controls.
9. Camera reference right-click context actions and missing external image resolver buttons.
10. Responsive narrow-screen availability (390-pixel viewport) and legacy category selection after changing the modular asset structure.

## Regressions fixed

- **Background tools:** Previously the visible `menuRemoveBackground` opened the same standalone dialog as `menuStandaloneBackground`, leaving the separate sprite preview background-cleanup properties reachable only from scripts. The import command now opens the integrated sprite cleanup; the Tools command opens standalone cleanup. Both are discoverable.
- **Legacy part categories:** Existing layers whose type is no longer included in the newly selected custom structure could crash `renderInspector()`. The selected legacy category remains in its dropdown and its original type is used safely for the description.
- **Visibility contract:** All hidden legacy buttons have an explicitly cataloged visible replacement; native file pickers have visible triggers, including the dynamically generated Replace image button. Three export relay buttons live in a permanently hidden compatibility container and map to the visible File menu export commands.

## Automated evidence

Run `npm test`, `npm run test:contracts` and `npm run test:browser`. New unit contract is `tests/unit/ui-reachability.test.mjs`. End-to-end browser cases `TC-130` through `TC-132` cover whole-interface reachability, legacy layer type compatibility, and mobile access. These tests are part of the required GitHub Actions regression gate.

## Boundaries of the verification

Playwright validates runtime DOM visibility, option presence and a broad set of actual UI interactions. It does **not** guarantee pixel-perfect layouts on every screen size, full artistic quality of user-provided sprites, or manual native touch/pen/file-system workflows on every OS. Production Render deployment needs separate verification; GitHub main/Pages verification alone does not imply Render is updated.
