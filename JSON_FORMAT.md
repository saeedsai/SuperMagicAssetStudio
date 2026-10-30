# SuperMagic Asset Studio JSON format

Editor version documented here: **v5.2**

## Root object

```json
{
  "format": "FootballSpriteStudio",
  "schemaVersion": 4,
  "mode": "bodyHead",
  "assetStorage": "bundled",
  "projectName": "Alex - Crown Royal",
  "canvas": {"width": 768, "height": 768},
  "animations": [],
  "assets": {},
  "scenes": {},
  "defaults": {},
  "editor": {},
  "partDefinitions": null,
  "viewOrder": [
    "front",
    "threeQuarterFrontLeft",
    "left",
    "threeQuarterBackLeft",
    "back",
    "threeQuarterBackRight",
    "right",
    "threeQuarterFrontRight"
  ]
}
```

## `mode`

- `fullBody`
- `bodyHead`
- `standard`
- `custom`

## `assetStorage`

- `bundled`: every asset contains `src` as a data URL.
- `external`: assets omit `src` and keep `fileRef` / filename.

## Asset object

```json
{
  "name": "head.png",
  "fileRef": "head.png",
  "mime": "image/png",
  "width": 512,
  "height": 512,
  "src": "data:image/png;base64,..."
}
```

In `external` mode, `src` may be absent.

## Layer object

```json
{
  "id": "layer_abc123",
  "name": "Head",
  "category": "head",
  "assetId": "asset_xyz789",
  "visible": true,
  "locked": false,
  "crop": {"x": 0, "y": 0, "w": 512, "h": 512},
  "transform": {
    "x": 384,
    "y": 240,
    "scaleX": 1.0,
    "scaleY": 1.0,
    "rotationDeg": 0,
    "opacity": 1,
    "flipX": false,
    "flipY": false,
    "anchorX": 0.5,
    "anchorY": 0.5
  },
  "color": {
    "brightness": 100,
    "contrast": 100,
    "saturate": 100,
    "hue": 0,
    "sepia": 0,
    "red": 100,
    "green": 100,
    "blue": 100
  }
}
```

## Frame reuse

Animations can reuse frames from another animation:

```json
{
  "id": "run_1",
  "name": "Run 1",
  "reuse": {
    "animation": "stand",
    "frame": "stand_1"
  }
}
```

## Standard part definitions

`standard-parts.json` follows the `SuperMagicParts` format:

```json
{
  "format": "SuperMagicParts",
  "schemaVersion": 1,
  "parts": [
    {"id": "head", "name": "Head", "group": "Face"},
    {"id": "shirt", "name": "Shirt / jersey", "group": "Clothes"}
  ]
}
```


## `partDefinitions`

When the project uses `mode: "custom"`, the project may contain a reusable modular-parts definition:

```json
{
  "format": "SuperMagicParts",
  "schemaVersion": 1,
  "base": "standard",
  "parts": [
    {"id":"body","name":"Body","group":"Base","default":true,"order":0},
    {"id":"head","name":"Head","group":"Head","default":true,"order":1},
    {"id":"shirt","name":"Shirt","group":"Clothes","default":false,"order":2}
  ]
}
```

Notes:
- `base` indicates which structure was used as the starting point.
- `parts` is ordered.
- `id` must start with a letter and may contain only letters, digits, and `_`.
- `name` is the display label shown in the UI.
- `group` is a free-form grouping label.
- `default` is optional and indicates that the part is typically enabled by default.
- `order` is optional but preserved when exporting.


## Extracted sprite manifest (v5.4)

The image tools also export a separate manifest with `format:"FootballSpriteAssetBundle"`, `version:1`, and an `items` array. Each item provides `file`, `view`, `category`, `animation`, `frame`, `mirror` and optionally `cropSource:{x,y,w,h}` in the original sheet. The crop rectangle records provenance; the cropped PNG itself is now its own source image. The manifest may be imported together with its PNG files through the regular bulk import queue. See `IMAGE_TOOLS_API.md`.


## Source sprite regions (v5.5)

`cropSource` in an exported sprite manifest can record a rectangle (`type: rect`), polygon (`type: poly`, `points`), Bézier curve (`type: bezier`, `points`, `tension`), or wand selection (`type: wand`, `seed`, `mode`, `tolerance`, and the optional encoded pixel mask). Extracted PNG pixels are already alpha-masked; games use the output PNG directly.