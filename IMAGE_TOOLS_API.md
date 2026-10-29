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