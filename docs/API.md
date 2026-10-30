# SuperMagic Asset Studio Browser API

The editor exposes a browser-side automation API:

```js
window.SuperMagicAssetStudioAPI
```

This is intended for browser automation tools, AI agents, test scripts, and custom pipelines.

## Version

```js
SuperMagicAssetStudioAPI.version
```

Current value: `5.4.0`

## Methods

### `getProject()`
Returns the live project as a plain JavaScript object.

```js
const project = SuperMagicAssetStudioAPI.getProject();
```

### `exportProjectObject(options?)`
Returns a serializable project object.

```js
const bundled = SuperMagicAssetStudioAPI.exportProjectObject({
  assetStorage: 'bundled'
});

const external = SuperMagicAssetStudioAPI.exportProjectObject({
  assetStorage: 'external'
});
```

#### Options
- `assetStorage`: `'bundled' | 'external'`

### `getSummary()`
Returns a compact summary for review.

```js
const summary = SuperMagicAssetStudioAPI.getSummary();
```

#### Example response

```json
{
  "name": "Alex - Crown Royal",
  "mode": "bodyHead",
  "assetStorage": "bundled",
  "views": ["front", "threeQuarterFrontLeft", "left", "threeQuarterBackLeft", "back", "threeQuarterBackRight", "right", "threeQuarterFrontRight"],
  "animations": [
    {"id": "stand", "name": "Stand", "frames": 1, "fps": 6},
    {"id": "run", "name": "Run", "frames": 2, "fps": 8}
  ],
  "assets": 12,
  "unresolvedAssets": []
}
```

### `review()`
Returns a quick machine-readable health check.

```js
const report = SuperMagicAssetStudioAPI.review();
```

#### Example response

```json
{
  "warnings": ["2 asset(s) have no embedded image source"],
  "layerCounts": {
    "front": 12,
    "threeQuarterFrontLeft": 12,
    "left": 12,
    "threeQuarterBackLeft": 12,
    "back": 12,
    "threeQuarterBackRight": 12,
    "right": 12,
    "threeQuarterFrontRight": 12
  }
}
```

### `setMode(mode)`
Switches the character structure mode.

```js
SuperMagicAssetStudioAPI.setMode('standard');
```

#### Accepted values
- `fullBody`
- `bodyHead`
- `standard`
- `custom`

### `setImageStorage(mode)`
Changes the save mode.

```js
SuperMagicAssetStudioAPI.setImageStorage('external');
```

#### Accepted values
- `bundled`
- `external`

### `importProjectObject(obj)`
Loads an already-parsed project object into the editor.

```js
SuperMagicAssetStudioAPI.importProjectObject(projectObject);
```

### `resolveExternalImages(files)`
Resolves missing external image references using a list of browser `File` objects.

```js
const input = document.querySelector('#myFileInput');
await SuperMagicAssetStudioAPI.resolveExternalImages(input.files);
```

Matching is based on `asset.fileRef` or asset filename.

### `setView(viewId)`
Sets the active direction.

```js
SuperMagicAssetStudioAPI.setView('threeQuarterFrontRight');
```

### `setAnimation(animationId)`
Sets the active animation.

```js
SuperMagicAssetStudioAPI.setAnimation('run');
```

### `setFrame(frameId)`
Sets the active frame.

```js
SuperMagicAssetStudioAPI.setFrame('run_2');
```

### `saveJSON()`
Triggers a JSON download from the UI.

```js
SuperMagicAssetStudioAPI.saveJSON();
```

## AI workflow suggestions

### Create a new project
1. Open `index.html`.
2. Set structure mode with `setMode(...)`.
3. Import files via the UI or browser automation.
4. Adjust layers.
5. Read `getSummary()` and `review()`.
6. Export using `exportProjectObject(...)` or `saveJSON()`.

### Review an existing asset
1. Load the project in the editor.
2. Call `getSummary()`.
3. Call `review()`.
4. Inspect unresolved assets, per-view layer counts, and mode.

### Modify an existing asset
1. Use `getProject()` to inspect current structure.
2. Change mode/storage if needed.
3. Use UI or automation to change layers.
4. Export with `exportProjectObject()`.


### `getPartDefinitions()`
Returns the current custom parts-definition object in `SuperMagicParts` format.

```js
const parts = SuperMagicAssetStudioAPI.getPartDefinitions();
```

### `setPartDefinitions(spec)`
Replaces or initializes the custom modular structure.

```js
SuperMagicAssetStudioAPI.setPartDefinitions({
  base: 'standard',
  parts: [
    {id:'body', name:'Body', group:'Base'},
    {id:'head', name:'Head', group:'Head'},
    {id:'shirt', name:'Shirt', group:'Clothes'}
  ]
});
```

`spec.base` may be `fullBody`, `bodyHead`, `standard`, `current`, or `custom`.

### `exportPartDefinitions(mode?)`
Exports a part-definition object for a chosen structure mode.

```js
const standardParts = SuperMagicAssetStudioAPI.exportPartDefinitions('standard');
const customParts = SuperMagicAssetStudioAPI.exportPartDefinitions('custom');
```

### `runCommands(payload)` new relevant ops
The structured command runner now supports:
- `setPartsDefinition`
- `exportPartsDefinition`
- `addCustomPart`

Example:

```json
{
  "commands": [
    {"op":"setMode","mode":"custom"},
    {"op":"setPartsDefinition","base":"bodyHead","parts":[
      {"id":"body","name":"Body","group":"Base"},
      {"id":"head","name":"Head","group":"Head"},
      {"id":"shirt","name":"Shirt","group":"Clothes"},
      {"id":"shorts","name":"Shorts","group":"Clothes"}
    ]},
    {"op":"exportPartsDefinition","mode":"custom"}
  ]
}
```


## Headless PowerShell API

For command-line or agentic AI access without a browser, see **`CLI_API.md`** and the PowerShell script **`SuperMagicAssetStudio.ps1`**. It exposes project editing, animation and layer operations, CLI undo/redo, PNG/GIF exports, and JSON validation.


### `autoResizeMatching(options)` (v5.3)
Copies scale to matching layers across selected views and animation frames, preserving their positions and rotations. Requires an example layer selected in the editor.

```js
SuperMagicAssetStudioAPI.selectLayers(['torso_0_torso']);
SuperMagicAssetStudioAPI.autoResizeMatching({
  scope: 'all', // currentFrame | currentAnimation | currentView | all
  matchBy: 'category', // category | name | assetId
  method: 'sourceScale' // sourceScale | renderedHeight | renderedWidth
});
```

`sourceScale` copies original-image scaleX/scaleY factors, not crop-relative percentages.

### Multi-selection

`selectLayers(ids)` changes the active selection and `getSelectedLayerIds()` retrieves it. Use Ctrl-click in the layer list or canvas to multi-select. Resize/move operations are available through the editor UI.


## Image processing API (v5.4)

The browser editor now includes three image operations; these work offline and do not require an AI model.

```js
const api = window.SuperMagicAssetStudioAPI;
api.openImageTools('auto');              // 'manual' | 'auto' | 'background'
await api.loadImageToolsFile(file);       // a browser File object
const boxes = api.autoSplitImage(canvas, {alphaThreshold:25, minArea:1000, padding:3});
const files = await api.cropImageRegions(canvas, boxes);
const result = api.removeImageBackground(canvas, {color:'#00ff00', tolerance:38, connected:true});
const currentBoxes = api.getDetectedRegions();
```

`autoSplitImage` returns original-image pixel rectangles `{x,y,w,h}`. `cropImageRegions` returns PNG `File[]`; `removeImageBackground` returns `{canvas,removed}` and preserves the original canvas.

The structured AI command panel supports **`splitImageAuto`**, **`splitImageManual`**, and **`removeBackground`**. For these browser commands, supply an existing project `assetId` whose asset has embedded image data; generated PNGs enter the import queue. Optional `assignments:[{view,category,animation,frame,mirror}]` prefill the first items.

For headless file-based processing from PowerShell or Node, see `IMAGE_TOOLS_API.md` and `CLI_API.md`.


### Image region shapes

`cropImageRegions(canvas, regions)` accepts both rectangle and freeform polygon regions.

Rectangle:

```js
{type:"rect", x:20, y:30, w:140, h:220}
```

Freeform polygon:

```js
{type:"poly", points:[{x:10,y:10},{x:150,y:12},{x:165,y:120},{x:18,y:140}]}
```

Polygon regions are clipped to the shape and exported with transparent pixels outside the boundary.


## Advanced sprite extraction (v5.5)

`window.SuperMagicAssetStudioAPI` now also supports:

- `magicWandRegion(canvas, {x,y}, {mode:'alpha'|'color', tolerance, alphaThreshold})` — returns an irregular connected-pixel selection mask
- `getCurveOutline(region, steps=12)` — returns sampled points for a closed, smooth Bézier path
- `cropImageRegions(canvas, regions)` — accepts rectangles, polygons, Bézier regions and wand masks and returns transparent PNG file blobs
- `openStandaloneBackground()` — opens standalone background cleanup, without importing/splitting

See `IMAGE_TOOLS_API.md` for schema, limitations and CLI equivalent.

## Main-canvas painting API (v5.7)

All tools operate client-side. Painting is saved as an ordinary raster PNG asset and a separate movable layer in the current view / animation / frame. Existing JSON and game runtime semantics remain unchanged.

```js
const editor = window.SuperMagicAssetStudioAPI;
const paint = window.SuperMagicPaintAPI;
paint.setTool('brush'); // select, select-rect, select-freeform, select-wand, brush,
                        // eraser, clone, fill, picker, text, shape-rect,
                        // shape-poly, shape-oval, shape-circle, shape-line, shape-curve
paint.getTool();
paint.getSelectionCount();
paint.finishFreeform();
paint.clearSelection();

// Lower-level integration functions:
editor.getPaintContext(); // {view, animation, frame, width, height}
editor.createRasterPaintLayer(canvas.toDataURL('image/png'), 'Paint stroke');
await editor.eraseRasterWithMask(maskCanvas.toDataURL('image/png'), 'paint');
// use 'original' to erase the selected, unlocked source layer instead
```

Rectangle / freeform / magic-wand selection creates a pixel mask that restricts subsequent stroke and fill operations. The magic wand compares RGBA values with a configurable tolerance and uses four-way connectivity. The clone stamp source is chosen with Alt-click, and texture import is local (PNG/JPEG/WebP at most 6 MB). Erasing originals creates a fresh asset ID rather than mutating an image shared by other views.

Generated paint PNGs are embedded in **bundled** project JSON. With **external** project JSON, PNG assets must be saved alongside the JSON and restored through the existing external-image resolution workflow. Other tools only modify the current view and frame unless that frame is linked or the resulting layers are copied into other frames.

## Full UI and Paint API (v5.9)

The canonical machine-readable inventory is [src/shared/ui-capabilities.json](../src/shared/ui-capabilities.json). It enumerates **209 static editor buttons and fields** with stable IDs, kind, section, supported values where static, and CLI availability/operation mapping. Dynamically generated layer buttons are addressed by layer commands rather than this static catalog.

~~~js
const api = window.SuperMagicAssetStudioAPI;
api.listCapabilities();                   // {schemaVersion, controls:[]}
api.listUIControls();                     // live values, visibility and options
api.getUIControl('paintSize');
api.setUIControl('paintSize', 32);         // validated, dispatches native events
api.setUISettings({paintColor:'#ff8800',paintSize:24});
api.getAllUISettings();
api.getSavedUISettings();                 // persisted in project.editor.uiOptions
api.applyUIOptions();                     // restore settings after loading JSON
api.invokeUIAction('menuAI');             // existing DOM action, no cloned controls

const paint = window.SuperMagicPaintAPI;
paint.getPaintSettings();
paint.setPaintSettings({paintSize:20,paintBrushShape:'diamond'});
paint.getSelectionMask();                 // Uint8Array | null
paint.setSelectionMask(new Uint8Array(768*768)); // example: empty canvas mask
await paint.performPaintOperation({
  tool:'brush',points:[{x:40,y:60},{x:180,y:120}],
  properties:{paintSize:20,paintColor:'#ee7700'}
});
const mask = await paint.performPaintOperation({
  tool:'selection',selection:{type:'rect',x:10,y:20,w:160,h:100}
});
await paint.performPaintOperation({
  tool:'fill',properties:{paintFillMode:'gradient',paintGradientEnd:'#7744cc'}
});
await paint.importPaintTexture(file);     // browser File/Blob
~~~

Supported programmatic paint tools are brush, eraser, clone, fill, picker, selection, text, and shape-rect, shape-poly, shape-oval, shape-circle, shape-line and shape-curve. Selections can be rectangles, freeform polygons, Bézier outlines or connected RGBA wands. Painting creates standard movable raster layers; erasing can safely target original images or added artwork.

setUIControl operates on the original HTML element and invokes its existing input/change handlers. File-picker controls cannot be set by scripts; use file import APIs instead. Modal/file/clipboard invocations may require real user gestures in a browser. The capability catalog explicitly labels browser-only UI actions rather than claiming a nonexistent CLI counterpart. Saved values in editor.uiOptions round-trip via project JSON; main project properties retain their established paths and semantics.
