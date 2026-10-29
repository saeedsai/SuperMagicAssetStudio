# SuperMagic Asset Studio JSON format

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
    "blue": 100,
    "tintHex": "#cf9a74",
    "tintAmount": 25
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

## Color rules in editor and runtime

- `red`, `green`, `blue`: channel intensity multipliers from 0 to 300 (100 = unchanged).
- `tintHex`: 24-bit RGB color in `#RRGGBB` form, defaults to `#ffffff`.
- `tintAmount`: how strongly the color tint replaces original RGB from 0 to 100 (0 = unchanged, 100 = recolor using source luminance).
- Brightness, contrast, saturation, hue and sepia are then applied as Canvas filters.

## External assets

When `assetStorage` is `external`, `assets` entries preserve `fileRef` instead of `src`. Paths are resolved by the runtime relative to the project JSON file URL or the supplied `assetBaseUrl`. The editor can resolve image files by matching their filename to `fileRef`. Avoid duplicate filenames for different images unless you explicitly give unique relative names.

## AI command panel

See `API.md`, `supermagic-api-spec.json`, and `ai-commands-example.json`.