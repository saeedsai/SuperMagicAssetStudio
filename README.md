# SuperMagic Asset Studio

A standalone **offline-first eight-direction 2D / 2.5D football character and animation editor** written in plain HTML and JavaScript. No installation, build system, accounts, or CDN scripts are required.

## Start

1. Open `index.html` in Chrome/Edge/Firefox. For development, `python -m http.server 8000` is also convenient.
2. Load a saved project using **Load JSON**, or choose **Upload multiple PNG / JSON files** to stage images and a bundle.
3. For each image in the import inbox select **view, modular part, animation, frame**, and optional **Mirror**; then **Import assigned files**.
4. Drag layers on the canvas, use corner handles for resize, circular handle for rotation, or numerical inspector fields. Crop via the Crop dialog, adjust brightness, contrast, saturation, hue, sepia or color presets.
5. Use the **←** and **→** buttons to rotate around eight views; **▶ 360°** plays a continuous turntable. Under **Reuse existing view**, choose a source and copy all layers or just one modular category. Mirror horizontally to build the opposite angle without new art.
6. Toggle visibility per layer with its eye icon, or by **Head / Hair / Clothes / Arms / Legs / Accessories** group.
7. Create animation frames and new animations; preview or export GIF, PNG, sprite sheet or a turntable GIF. Save JSON and load it again to continue editing.

## Eight view IDs and order

| Position | Key | Facing |
|---|---|---|
| 0 | `front` | Front |
| 1 | `threeQuarterFrontLeft` | 3/4 front left |
| 2 | `left` | Left |
| 3 | `threeQuarterBackLeft` | 3/4 back left |
| 4 | `back` | Back |
| 5 | `threeQuarterBackRight` | 3/4 back right |
| 6 | `right` | Right |
| 7 | `threeQuarterFrontRight` | 3/4 front right |

Directions are separated by **45° increments**; discrete 2D sprites are not true 3D geometry. A mirrored sprite can be used as a starting point, but asymmetrical jerseys, badges and hair may need distinct artwork.

## JSON project structure

Saving creates a standalone project with embedded image data URLs. Main fields:

- `format: "FootballSpriteStudio"`, `schemaVersion: 2`, `viewOrder` and `canvas: {width, height}`.
- `animations: [{id,name,fps,frames:[{id,name}]}]`.
- `assets: { "asset-id": {name,mime,width,height,src:"data:image/png;base64,..."} }`.
- `scenes[viewId][animationId][frameId] = [layers...]`.
- Each layer contains `id`, `name`, `category`, `assetId`, `visible`, `locked`, `crop:{x,y,w,h}`, `transform:{x,y,scaleX,scaleY,rotationDeg,opacity,flipX,flipY,anchorX,anchorY}`, optional `color:{brightness,contrast,saturate,hue,sepia}`.
- `defaults[viewId][category]` stores reusable default transform settings.

Positions are **canvas pixels**; crop rectangle is **original source-image pixels**. `x`,`y` are layer anchor positions, and `scaleX`/`scaleY` apply to cropped image size. Layer array order is draw order, back-to-front. All settings are readable in the JSON and respected by `runtime.js`.

## Bulk JSON import format

Import `example-bundle.json` by itself to load its embedded sample body and head images, or import your own JSON manifest together with its referenced PNG files. Instead of image files, an item may include an embedded data URL in `src`.

```json
{
  "format": "FootballSpriteAssetBundle",
  "version": 1,
  "items": [
    {"file":"alex_front.png","view":"front","category":"fullBody","animation":"stand","frame":"stand_1","mirror":false,
     "transform":{"x":384,"y":470,"scaleX":0.5,"scaleY":0.5,"rotationDeg":0,"opacity":1,"flipX":false,"flipY":false,"anchorX":0.5,"anchorY":0.5},
     "crop":{"x":0,"y":0,"w":1024,"h":1536},
     "color":{"brightness":100,"contrast":100,"saturate":100,"hue":0,"sepia":0}}
  ]
}
```

The row assignments can be changed in the inbox before importing. JSON full projects instead use **Load JSON**. Legacy six-direction JSON projects are migrated by copying old 3/4 front/back views to the right-side diagonals, then mirroring them to the left-side diagonals.

## In-game use

```html
<script src="runtime.js"></script>
<canvas id="game" width="900" height="700"></canvas>
<script>
(async () => {
 const avatar = await FootballSpriteCharacter.fromURL('my-character.json');
 const ctx = document.getElementById('game').getContext('2d');
 const view = avatar.viewForAngle(135); // threeQuarterBackLeft
 avatar.draw(ctx,{view,animation:'run',frame:0,x:450,y:650,scale:0.7,origin:'feet',hiddenCategories:['accessory']});
})();
</script>
```

The runtime accepts user-selected views, animation frame IDs/indices, transform settings and color filters and can hide categories dynamically. `avatar.rotateView(view,1)` advances by one direction.

## Export / limitations

- **PNG:** current view and frame, transparent canvas.
- **GIF:** current view across all frames of an animation, RGB332 palette, max side 480px; alpha transparency reduced to on/off.
- **360° GIF:** eight views in viewOrder, fixed current animation and frame.
- **Sprite sheet:** frames of the current animation and view, transparent PNG.
- **JSON:** embedded image data, all layers, transforms, crop, mirror, colors, animation frames, and default placements.
- Automatic tweening is not included. Upload separate images for run1/run2 etc., or animate individual parts manually by editing their frames.
- HTML Canvas `filter` is used for visual color tuning and is supported by current mainstream browsers.

## Files

- `index.html`: the editor (standalone)
- `runtime.js`: game renderer
- `runtime-demo.html`: demo of runtime integration
- `example-bundle.json`: sample mapping with embedded PNGs; import it alone to test the app
- `alex-eight-view-starter.json`: sample project using the previously generated Alex art (in downloadable ZIP only; large embedded images)

## Version 3: modular assembly and editing

### Four assembly modes
Choose **Project → Asset structure**:

1. **Full body + head together**: one image per frame and view (`fullBody`).
2. **Body + separate head**: independently fitted `body` and `head` layers.
3. **Standard modular**: use the `standard-parts.json` categories for torso, limbs, hair, face, kit, boots, and accessories.
4. **Custom modular**: add individual categories in the editor or upload `custom-parts-example.json` in the **Import parts JSON** control. A parts file has `format: "SuperMagicParts"` and a `parts` array of objects containing `id`, `name` and optional `group`/`default` fields. Definition IDs are alphanumeric plus underscores and must be unique.

Modes are editing presets and **do not delete existing layers**. You may mix modes when a scene needs extra accessories. The mode and definitions are serialized in project JSON.

### Layer ordering and crop handles
Drag layers in the Layers list to reorder them, or use **Move up**, **Move down**, **To front**, **To back**. Array order in `scenes[view][animationId][frameId]` is the exact back-to-front z-order. **Crop handles** enables direct cropping on the main canvas: drag the eight handles (four corners and four edges); crop stores source pixel coordinates `{x,y,w,h}`. Toggle crop mode off to keep drag-to-resize and rotation handles. The original image is never destructively changed.

### References, rulers, and undo
Right-click a camera or animation frame and select **Use as 30% transparent reference**. The editor also offers selectors for any reference view / animation / frame and custom opacity. `editor.reference` stores this setting but reference overlays **are not exported**. **Grid**, **Rulers** and **Snap** are editing helpers stored under `editor`; they do not change exported PNGs. Use Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Ctrl/Cmd+Shift+Z) for undo and redo. Undo stores up to 60 recent changes. Native text-input undo remains available while editing a text field.

### Local geometry auto-fit
Select a part, ensure the scene includes a target (body, head, or torso), then click **Auto-fit to part** in the Inspector. The algorithm uses alpha-cropped image bounds, relative anatomical anchor estimates and visible target sizes. It is **not an AI body landmark detector** and will not reliably fit arbitrary poses; fine-tune the result manually. All resulting transforms are exported to JSON.

### Reusable animation timeline clips
Under **Reuse animation timeline**, select a different source animation, trim its frame range, choose a repeat count and select **Link clip to timeline**. This appends lightweight linked frames of the shape:

```json
{
  "id":"frame_x","name":"↪ Stand: Stand 1",
  "reuse":{"animation":"stand","frame":"stand_1"}
}
```

The editor and `runtime.js` recursively draw inherited source layers first, then any local override layers. Edits to the source animation automatically update linked frames. To edit inherited source layers independently in the linked frame, click **Make frame editable** to copy the inherited layers and remove its reference. Cycles in links are safely skipped. The source clip's FPS is not imported; the destination animation FPS is used for playback.

### Manifest import format
Select multiple PNG files plus `example-bundle-v3.json` in one import operation, then review each proposed assignment. Manifest `items` can specify `file`, `category`, `view`, `animation`, `frame`, `mirror`, `transform`, `crop`, `color`, `visible` and `order`. The source file paths must match the selected PNG filenames. Full project JSON is a separate self-contained file saved through **Save JSON**, with image assets embedded as data URLs.

### Runtime notes
`runtime.js` supports linked frames, color adjustments, crop, mirroring, per-frame layer order and all eight views. The project schema version is 3, but older eight-view and six-view projects are migrated when loaded in the editor. Transparent overlays and rulers are editor-only. Save project after moving a part to ensure the game sees the updated values.