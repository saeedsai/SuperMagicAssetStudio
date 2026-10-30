# Sprite Sheet Extraction API — v5.4

**Created by Saeed · saeedmsalehi1990@gmail.com**

This guide covers the three sprite-sheet tools available in the browser editor and headless PowerShell/Node CLI.

## Top menu

Use **Import → Manual crop & split**, **Import → Auto-split multiple sprites**, or **Import → Remove image background**. Choose a source PNG from existing project assets or upload a new PNG/JPEG/WebP image. Split rectangles are visible and editable on the preview canvas. Add the resulting cropped PNGs to the import queue, where you can choose a view, part, animation and frame for **each** sprite. You can also download the PNGs and a `FootballSpriteAssetBundle` manifest together as one ZIP.

## Browser API

`window.SuperMagicAssetStudioAPI` exposes these methods:

- `openImageTools(mode)` — show the editor; mode is `manual`, `auto` or `background`.
- `loadImageToolsFile(file)` — load a browser `File` for processing.
- `autoSplitImage(canvas, options)` — return ordered source-space rectangles for transparent sprite islands.
- `cropImageRegions(canvas, regions)` — return `Promise<File[]>` of PNG crops.
- `removeImageBackground(canvas, options)` — return `{canvas, removed}` for an edge-connected color-key removal.
- `getDetectedRegions()` — return the current UI detection result.

Example:

```js
const canvas = document.createElement('canvas');
canvas.width = 1536; canvas.height = 1024;
// Draw or decode source PNG into canvas first.
const api = window.SuperMagicAssetStudioAPI;
const rects = api.autoSplitImage(canvas, {
  alphaThreshold: 25, minArea: 1000, padding: 3
});
const croppedFiles = await api.cropImageRegions(canvas, rects);
// Use the import queue UI to set camera view/part/animation/frame.
```

The built-in AI JSON command panel also supports `splitImageAuto`, `splitImageManual` and `removeBackground` for an **existing project assetId** with an embedded image source. These commands enqueue the generated PNGs. Example:

```json
{"commands":[
  {"op":"splitImageAuto","assetId":"sheet_asset","minPixels":1000,"padding":3,
   "assignments":[{"view":"front","category":"head","animation":"stand","frame":"stand_1"}]},
  {"op":"splitImageManual","assetId":"sheet_asset","regions":[{"x":20,"y":10,"w":220,"h":290}]},
  {"op":"removeBackground","assetId":"green_screen","color":"#00ff00","tolerance":30,"connected":true}
]}
```

## PowerShell / Node CLI

Requires Node.js 20+. PowerShell is only a wrapper around `agent-cli.mjs`. Commands are read from JSON; the source image must be PNG in the CLI.

```powershell
pwsh -NoProfile -File ./SuperMagicAssetStudio.ps1 `
  -Project ./player.json -CommandFile ./split-command.json
```

### `splitImageAuto`

```json
{"op":"splitImageAuto", "source":"./sheet.png", "outputDir":"./sprites",
 "minPixels":1000, "alphaThreshold":25, "padding":3,
 "assignments":[{"view":"front","category":"head","animation":"stand","frame":"stand_1"}]}
```

- An alpha-connected-components algorithm finds visually separate islands, not semantic heads/body poses.
- For an opaque image, remove background first or set `method:"grid"`, `rows`, `columns`.
- The returned result contains output PNG paths, crop rectangles and a JSON manifest.
- `importToProject:true` additionally creates assets/layers in the project. When using the `external` storage mode, the CLI copies PNGs to a stable `assets/` directory when saving.

### `splitImageManual`

```json
{"op":"splitImageManual", "source":"./sheet.png", "outputDir":"./sprites",
 "regions":[{"x":61,"y":10,"w":400,"h":490},{"x":550,"y":5,"w":425,"h":495}],
 "assignments":[{"view":"front","category":"head"},{"view":"threeQuarterFrontRight","category":"head"}]}
```

Coordinates are **source PNG pixels**. `x,y` is the upper-left corner; `w,h` is the size. Rectangles must fit entirely inside the source image.

### `removeBackground`

```json
{"op":"removeBackground", "source":"./image.png", "outputDir":"./clean",
 "color":"#00ff00", "tolerance":38, "connected":true}
```

- `color`: target background RGB HEX.
- `tolerance`: Euclidean RGB distance from target color (0–130 recommended).
- `connected:true`: remove only matching pixels reachable from the image boundary. This usually protects similar-colored features enclosed by the subject.
- This is **not** AI matting or hair segmentation. Inspect alpha/fringe after processing.

## ZIP manifest format

```json
{"format":"FootballSpriteAssetBundle","version":1,"items":[
 {"file":"alex_head_01.png", "view":"front", "category":"head", "animation":"stand", "frame":"stand_1", "mirror":false,
  "cropSource":{"x":61,"y":10,"w":400,"h":493}}
]}
```

Upload the manifest JSON **together with** its PNG files to prefill the import queue. You can change assignments before final import.

## Limitations and best practices

- Auto splitting works best when the background is transparent and sprites **do not touch**.
- If multiple figures touch, one component may contain several figures; use manual boxes or a regular grid.
- Semi-transparent glows and loose particles may be excluded if disconnected and below `minPixels`.
- Background removal only targets a nearly uniform color; it does not remove arbitrary detailed backgrounds.
- Browser output is PNG even when the input was JPEG/WebP. Headless CLI input/output is PNG only.
- Split regions are proposed **only**; directions and animation frames cannot be inferred reliably from artwork without semantic analysis, so assign them manually.


## Freeform split regions

Manual splitting now supports `type: "poly"` regions with absolute `points`, allowing irregular silhouettes to be extracted without forcing a square or rectangular crop. Auto-detected rectangles can also be refined by adding manual freeform regions in the dialog before queueing or downloading the extracted PNGs.

Example region:

```json
{
  "type": "poly",
  "points": [
    {"x": 112, "y": 35},
    {"x": 186, "y": 31},
    {"x": 210, "y": 122},
    {"x": 101, "y": 145}
  ]
}
```


## v5.5 — Curves, editable anchor points, magic wand, standalone background removal

### Browser editor selection modes

Open **Import → Manual crop & split** or **Import → Auto-split multiple sprites**, then use **Boundary**:

- `rect` — drag a box
- `poly` — click three or more points, then Finish boundary
- `bezier` — click three or more points; produces a closed, smooth Catmull-Rom-to-cubic-Bézier boundary (`tension` ranges from `0` to `1`)
- `wand` — click on a visible pixel to flood-select a connected opaque sprite, or a region of similar color

The **Edit points** toggle exposes draggable anchors on the selected polygon or Bézier boundary. Double-click near a path edge to insert a point; **Delete point** removes the selected anchor (while retaining a minimum of three).

These shapes crop to their tight bounds and set pixels outside the boundary transparent; neighboring images in intersecting rectangular bounding boxes are protected. Curved regions use their sampled Bézier outline for bounds and clipping.

### New region formats

```json
{ "type":"bezier", "tension":0.75, "points":[
  {"x":20,"y":10},{"x":110,"y":10},{"x":120,"y":100},{"x":18,"y":130}
]}
```

```json
{ "type":"wand", "seed":{"x":183,"y":60}, "mode":"alpha", "tolerance":40 }
```

For `mode="alpha"`, the wand picks a 4-connected component with alpha above the threshold. For `mode="color"`, it flood-fills the selected similar-colored pixels within the chosen tolerance. Transparent backgrounds cannot be the starting point in opaque mode.

### Browser automation API

```js
const api = window.SuperMagicAssetStudioAPI;
const region = api.magicWandRegion(canvas, { x:183, y:60 }, { mode:'alpha', alphaThreshold:25 });
const outlines = api.getCurveOutline({ type:'bezier', tension:0.75, points:[...] });
const files = await api.cropImageRegions(canvas, [region, {type:'bezier', points:[...]}]);
api.openStandaloneBackground();
```

### Headless CLI / PowerShell

```json
{ "commands": [
  { "op":"splitImageManual", "source":"sheet.png", "outputDir":"./output",
    "regions":[ { "type":"bezier", "tension":0.8,
      "points":[{"x":10,"y":10},{"x":200,"y":15},{"x":180,"y":250},{"x":15,"y":220}] } ] },
  { "op":"splitImageWand", "source":"sheet.png", "seed":{"x":340,"y":160},
    "mode":"alpha", "outputDir":"./wand-output" },
  { "op":"removeBackground", "source":"opaque.png", "color":"#ffffff",
    "tolerance":38, "connected":true, "outputDir":"./transparent" }
]}
```

The `removeBackground` command runs independently and outputs one transparent PNG; no splitting step is required. PNG rendering and extraction are local and use Node.js 20+ with no npm dependencies.
## Main-canvas drawing and programmatic paint (v5.9)

Browser SuperMagicPaintAPI exposes getPaintSettings, setPaintSettings, performPaintOperation, getSelectionMask, setSelectionMask and importPaintTexture. These control the same selection, brush, fill, clone, eraser, text and shape features as the visible Paint menu. The Node/PowerShell CLI supports the paint operation for geometry, masks, brushes, original-safe erasing, PNG textures, basic bitmap text and six shapes. See [CLI API](CLI_API.md) for the complete property table and deliberate differences between browser font/antialiasing and headless output. The shared [UI control catalog](../src/shared/ui-capabilities.json) inventories the sprite split and background-cleanup option fields too.
