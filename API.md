# SuperMagic Asset Studio — automation API v5

This document describes the **local browser JavaScript API** and the **structured JSON command panel**. It is designed to let AI agents and automation tools create, modify, inspect, and review sprite projects. It does **not** contact an external AI model, and it does not interpret free-form natural-language commands: commands are validated, explicit JSON operations.

## Start

1. Open `index.html` in a modern browser.
2. Open **Tools → AI command panel** to paste commands, or use the browser console / automation tool.
3. Call `window.SuperMagicAssetStudioAPI` for programmatic access.

```js
const studio = window.SuperMagicAssetStudioAPI;
console.log(studio.version); // 5.0.0
console.log(studio.getSummary());
```

## Browser API methods

| Method | Purpose | Input |
| --- | --- | --- |
| `getProject()` | Deep-copy the current in-memory project | None |
| `exportProjectObject(options)` | Produce a JSON-serializable project, bundled or external | `{assetStorage:'bundled'|'external'}` |
| `importProjectObject(object)` | Replace the current project using a valid project object | `FootballSpriteStudio` object |
| `getSummary()` | Return project mode, views, frame counts and missing images | None |
| `review()` | Return warnings and layer counts by view | None |
| `setMode(mode)` | Select fullBody, bodyHead, standard or custom | Mode ID |
| `setImageStorage(mode)` | Select bundled or external image references | Storage ID |
| `setView(view)` | Select one of eight view IDs | View ID |
| `setAnimation(id)` | Select an existing animation | Animation ID |
| `setFrame(id)` | Select an existing frame | Frame ID |
| `resolveExternalImages(files)` | Supply matching local PNG/JPEG/WebP file objects to unresolved references | Browser `File[]` / `FileList` |
| `runCommands(payload)` | Execute a sequence of structured commands | JSON object with `commands` array |
| `saveJSON()` | Trigger local JSON download | None |

For the full machine-readable list of methods and payloads, see `supermagic-api-spec.json`. For the project model, see `JSON_FORMAT.md`.

## Direction IDs

Order is clockwise, every 45 degrees:

```
front
threeQuarterFrontLeft
left
threeQuarterBackLeft
back
threeQuarterBackRight
right
threeQuarterFrontRight
```

## AI command format

Paste a JSON object with `commands`, or an array of commands:

```json
{
  "commands": [
    {"op": "setMode", "mode": "bodyHead"},
    {"op": "setImageStorage", "mode": "external"},
    {"op": "setView", "view": "threeQuarterFrontRight"},
    {"op": "summary"},
    {"op": "review"}
  ]
}
```

Execute from JavaScript:

```js
const output = await window.SuperMagicAssetStudioAPI.runCommands({
  commands: [
    {op: 'setProjectName', name: 'Alex Sprites'},
    {op: 'summary'}
  ]
});
console.log(output);
```

The command panel can **create** projects, assets, layers, animations, and frames; **modify** placements, colors, visibility, and z-order; and **review** the result. Its mutations can be undone with Ctrl+Z, though a multi-command batch is one undo step.

### Project commands

```json
{"op":"createProject","name":"New Player","mode":"standard","assetStorage":"external"}
{"op":"setProjectName","name":"Alex"}
{"op":"setMode","mode":"fullBody"}
{"op":"setImageStorage","mode":"bundled"}
{"op":"setCanvas","width":768,"height":768}
```

### Navigation commands

```json
{"op":"setView","view":"front"}
{"op":"setAnimation","animation":"run"}
{"op":"setFrame","frame":"run_1"}
```

### Creating assets and layers

Use an existing file reference and pixel dimensions, or include a `data:image/...;base64,...` string in `src`. The JSON editor cannot arbitrarily read local files from a filename alone: external assets must be resolved via the upload control.

```json
{"op":"addAsset","id":"alex_head","name":"head_front.png","fileRef":"head_front.png","width":512,"height":512,"mime":"image/png"}
{"op":"addLayer","id":"head_layer_front","assetId":"alex_head","category":"head","name":"Alex Head","view":"front","animation":"stand","frame":"stand_1","transform":{"x":384,"y":200,"scaleX":0.6,"scaleY":0.6,"rotationDeg":0},"color":{"red":110,"green":100,"blue":95}}
```

The importer accepts matching PNG files afterward via **Import → Resolve external images**. Layer order is saved as the position in the scene's layer array (back-to-front).

### Editing layers

Target layers with a nonempty `match`. A match may contain `id`, `ids`, `name`, `nameContains`, `category`, `assetId`, or `visible`. For destructive commands, an empty match is rejected to prevent accidental changes to every layer.

```json
{"op":"selectLayer","match":{"id":"head_layer_front"}}
{"op":"setLayer","match":{"category":"head"},"scope":"currentFrame","changes":{"visible":true,"transform":{"x":386,"y":205,"rotationDeg":2,"scaleX":0.7,"scaleY":0.7},"crop":{"x":0,"y":0,"w":400,"h":450},"color":{"red":110,"green":95,"blue":88,"tintHex":"#a86d46","tintAmount":30}}}
{"op":"moveLayer","match":{"id":"head_layer_front"},"direction":"front"}
{"op":"deleteLayer","match":{"nameContains":"temporary"}}
```

Allowed `scope` values:
- `currentFrame` (default)
- `currentAnimationCurrentView`
- `allCurrentView`
- `all`

Layer change keys: `name`, `category`, `visible`, `locked`, `crop`, `transform`, `color`, `flipX`, `flipY`.

Layer directions: `front`, `back`, `up`, `down`. The array order is authoritative.

### Animation and part commands

```json
{"op":"createAnimation","id":"celebrate","name":"Celebrate","fps":10,"frames":["Celebrate 1","Celebrate 2"]}
{"op":"addFrame","animation":"run","id":"run_3","name":"Run 3"}
{"op":"addCustomPart","id":"custom_left_glove","name":"Left glove","group":"Accessories"}
```

### Reference overlay command

```json
{"op":"setReference","view":"front","animation":"stand","frame":"stand_1","alpha":0.3,"enabled":true}
```

### Inspection commands

```json
{"op":"summary"}
{"op":"review"}
```

`review()` currently reports missing embedded image sources and layer counts, but is **not** a computer-vision quality assurance model. For visual quality, an AI tool must also inspect the exported images or canvas.

## Complete creation example

See [`ai-commands-example.json`](ai-commands-example.json). It creates an empty external-asset project, registers body and head PNG filenames, adds layers, assigns transforms and RGB tints, creates an animation, and requests a review.

## JSON export

### Bundled

```js
const bundled = studio.exportProjectObject({assetStorage:'bundled'});
// each asset contains a data:image URL in assets[id].src
```

### External

```js
const external = studio.exportProjectObject({assetStorage:'external'});
// each asset has fileRef, no src
// keep the referenced PNG/JPEG/WebP files together with your JSON
```

`exportProjectObject` returns data; it does not download the referenced PNG files. Keep your original images (or copy them into your game asset folder).

## Game-runtime integration

The included `runtime.js` creates `window.FootballSpriteCharacter`:

```html
<script src="runtime.js"></script>
<script>
(async () => {
  const player = await FootballSpriteCharacter.fromURL('./my-player.json');
  // External assets resolve relative to the JSON file's URL.
  const canvas = document.getElementById('game-canvas');
  player.drawToCanvas(canvas, {view:'front',animation:'stand'});
})();
</script>
```

For a JSON loaded with a browser `File`, provide an explicit base URL if it has external assets:

```js
const player = await FootballSpriteCharacter.fromFile(file, {assetBaseUrl:'/assets/players/alex/'});
```

The runtime honors layer order, crop, position, scale, rotation, mirroring, alpha, brightness, saturation, hue, sepia, independent RGB channel multipliers, and the 24-bit color tint. See `JSON_FORMAT.md`.