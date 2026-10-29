# SuperMagic Asset Studio v5

SuperMagic Asset Studio is an offline HTML + JavaScript editor for building 8-direction football-game sprite assets from layered PNG parts.

## Main improvements in v5

- Two JSON storage modes:
  - **Bundled**: images are embedded as data URLs inside the JSON.
  - **External**: JSON stores only references, while PNG files stay separate.
- Simpler UI:
  - Sidebar and inspector sections are collapsible.
  - The editor opens with only the most important sections expanded.
  - Added a real top menu bar: **File / Import / View / Animation / Tools / Help**.
- Mode-aware part menus:
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