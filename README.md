# SuperMagic Asset Studio v5.3.2

**Created by Saeed**  
**saeedmsalehi1990@gmail.com**  
Licensed under the **MIT License** (see `LICENSE`).

SuperMagic Asset Studio is an offline HTML + JavaScript editor for building 8-direction football-game sprite assets from layered PNG parts.

## Main improvements

- Two JSON storage modes:
  - **Bundled**: images are embedded as data URLs inside the JSON.
  - **External**: JSON stores only references, while PNG files stay separate.
- Simpler UI:
  - Sidebar and inspector sections are collapsible.
  - The editor opens with only the most important sections expanded.
  - Added a real top menu bar: **File / Import / View / Animation / Tools / Help**.
- Mode-aware part menus:
- Custom modular structure editor in the UI:
  - Start custom mode from **Full body**, **Body + head**, **Standard modular**, or the **current custom** structure.
  - Add, rename, regroup, reorder, or delete custom parts directly in the UI.
  - Export the custom parts definition as a reusable `SuperMagicParts` JSON file.
  - **Full body** only shows `fullBody` and accessories.
  - **Body + head** shows only body/head-related parts.
  - **Standard modular** shows the built-in modular categories.
  - **Custom modular** shows imported/custom-defined categories.
- Extended color controls:
  - Brightness, contrast, saturation, hue, sepia.
  - Independent **Red / Green / Blue** percentages.
- External-image resolver:
  - When a JSON file uses external images, click **Resolve external images** and select the matching PNGs.
- Automation API:
  - The editor exposes `window.SuperMagicAssetStudioAPI` for browser automation and AI-driven editing.
- Built-in AI command panel:
  - Open it from **Tools → AI command panel**.
  - Paste structured JSON commands to inspect or modify the current project.

## Core capabilities

- 8 directions:
  1. Front
  2. 3/4 front left
  3. Left
  4. 3/4 back left
  5. Back
  6. 3/4 back right
  7. Right
  8. 3/4 front right
- 360° view stepping with arrow buttons.
- Multiple animations and frames.
- Linked/reused timeline clips across animations.
- Layer ordering saved in JSON.
- Visual crop tools and numeric crop controls.
- Grid, rulers, undo/redo.
- Reference overlays from other views/frames.
- Per-layer transforms, visibility, mirroring, and color tuning.
- Transparent PNG, sprite-sheet PNG, GIF, and turntable GIF export.

## Character structure modes

### 1) Full body + head together
Use one complete image per view/frame.

### 2) Body + separate head
Use body and head as separate layers.

### 3) Standard modular JSON
Use built-in part categories such as torso, arms, legs, face, hair, shirt, shorts, socks, boots, and accessories.

### 4) Customized modular JSON
Import or define a custom part schema. Only those parts will appear in the part menus.

## JSON storage modes

### Bundled JSON
Best when you want:
- one-file backup,
- easy sharing,
- easy AI review,
- self-contained assets.

### External JSON
Best when you want:
- lighter JSON files,
- separate PNG asset management,
- your game pipeline to keep images outside the JSON.

When loading an external JSON project, the editor may show unresolved assets. Use **Resolve external images** and select the referenced PNG files.

## Included files

- `index.html` — main editor.
- `runtime.js` — runtime helper for games.
- `runtime-demo.html` — runtime example.
- `standard-parts.json` — built-in modular schema example.
- `custom-parts-example.json` — minimal custom schema example.
- `example-bundle-v3.json` — example bundle/manifest import file.
- `API.md` — automation API reference.
- `JSON_FORMAT.md` — JSON project format and schemas.

## Running the editor

Open `index.html` directly in a browser.

No server is required.

## AI / automation usage

The editor exposes a global browser object:

```js
window.SuperMagicAssetStudioAPI
```

This lets scripts or AI browser agents create, inspect, modify, and review projects. See `API.md`.


## Top menu bar

The new top menu bar keeps the main window cleaner while still exposing the core actions:

- **File** — new, load, save, and export actions
- **Import** — PNG/JSON import, parts schema import, and external-image resolution
- **View** — view rotation, zoom, guides, grid, rulers, and crop handles
- **Animation** — add/remove animations and frames, playback, and clip reuse
- **Tools** — undo/redo, auto-fit, and the AI command panel
- **Help** — quick help and documentation entry points

## AI command panel

Open **Tools → AI command panel** to paste structured JSON commands.

Example:

```json
{
  "commands": [
    {"op": "setProjectName", "name": "Alex Runtime Pack"},
    {"op": "setMode", "mode": "bodyHead"},
    {"op": "setImageStorage", "mode": "external"},
    {"op": "summary"},
    {"op": "review"}
  ]
}
```

## Top menu bar (v5)

Use **File / Import / View / Animation / Tools / Help** at the top. File holds save/load/export options; Import has image, bundle, part-schema and external-image resolution; View handles the eight directions, grid and rulers; Animation handles frames and reused clips; Tools offers undo/redo and the AI command panel.

## AI command panel (v5)

Select **Tools → AI command panel**, paste a JSON command batch, then click **Run commands**. Commands can create projects, animations, frames, asset references and layers; edit matching layer transforms/crops/colors; and report summaries and warnings. There is no external AI model: this is a deterministic JSON command executor. See `API.md` and `ai-commands-example.json`.

## RGB color tools (v5)

Choose any layer to adjust independent red, green and blue multipliers, or use a full 24-bit **RGB tint color picker** with tint-strength control. Both editor and runtime use the saved color values.


## Custom modular structures

In **Custom modular** mode, the structure no longer has to be defined only in JSON.

Use the **Project** panel to:
- choose a base structure,
- apply or merge that base into the current custom setup,
- add or update a part in the form,
- edit part IDs, names, groups, and default flags in the table,
- reorder parts with the arrow buttons,
- export the result as a reusable parts-definition JSON.

This allows both simple setups like `body + head + shirt + shorts` and large setups that extend the standard modular structure with extra parts.


## PowerShell / CLI API for AI agents

Run the editor project **without a browser** using Node.js 20+ via the PowerShell wrapper:

```powershell
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 -Project ./my-player.json -CommandFile ./cli-example-commands.json
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 -Project ./my-player.json -Operation review
```

Commands can create/edit custom parts, change colors and geometry, build animations, reorder layers, run validation, undo/redo, and export PNG/GIF/sprite-sheet/360° turntable assets. PowerShell and direct Node callers receive structured JSON results. **No npm dependencies** are needed. See `CLI_API.md` and `cli-command-schema.json`.

## Credits and license

Created by **Saeed** — **saeedmsalehi1990@gmail.com**.

Released under the **MIT License**; see `LICENSE`.


## v5.3: eight-view assembly improvements

- 360° view controls are directly beneath the canvas; camera selection still lives in the left panel.
- Hold **Ctrl** (or Command on macOS) and click layers in the layer list or canvas to select multiple sprites. Drag a selected part to move the whole selection, or drag the group's corners to resize together. The inspector also provides precise group deltas and scale multipliers.
- The inspector describes scale and rotation relative to the original image: scaleX=1/scaleY=1 means one canvas pixel per original PNG pixel; rotationDeg=0 means the original PNG orientation. Cropping does not redefine scale.
- Use **Auto-resize matching parts** in the inspector to copy scale factors or matching displayed width/height across eight views and/or animations. Reused animation clips inherit source frame edits automatically.
- `autoResizeMatching` is also exposed to browser API, structured commands, and headless CLI.
- `alex_modular_zip_demo_bundled.json` is a demonstrator assembled from the user-supplied 47-sprite ZIP, with 8 directional previews. Source sprites are extracted/upscaled cutouts and may not be complete production-ready modular artwork. Some missing angles use mirrored sources; Run frames are standing placeholders.