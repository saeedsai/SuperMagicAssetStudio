# AI command panel

Open **Tools → AI command panel** in the editor.

The panel accepts JSON in this shape:

```json
{
  "commands": [
    {"op": "setProjectName", "name": "Alex Runtime Pack"},
    {"op": "setMode", "mode": "bodyHead"},
    {"op": "setImageStorage", "mode": "external"},
    {"op": "setView", "view": "front"},
    {"op": "summary"},
    {"op": "review"}
  ]
}
```

## Supported operations

### Project
- `setProjectName`
- `setMode`
- `setImageStorage`

### Navigation
- `setView`
- `setAnimation`
- `setFrame`

### Editing
- `selectLayer`
- `setLayer`
- `moveLayer`
- `deleteLayer`
- `setReference`

### Structure
- `createAnimation`
- `addCustomPart`

### Inspection
- `summary`
- `review`

## Layer match examples

```json
{"op": "selectLayer", "match": {"name": "Head"}, "scope": "currentFrame"}
```

```json
{
  "op": "setLayer",
  "match": {"category": "head"},
  "scope": "currentFrame",
  "changes": {
    "transform": {"x": 384, "y": 215, "scaleX": 1.03, "scaleY": 1.03},
    "color": {"red": 108, "green": 100, "blue": 95},
    "visible": true
  }
}
```


## Sprite sheet commands (v5.4)

The browser AI command panel now accepts `splitImageAuto`, `splitImageManual`, `removeBackground` for an existing `assetId` with embedded image pixels. The CLI accepts the same operations using `source` (PNG path) and `outputDir`, with optional `assignments` and `importToProject`. See `IMAGE_TOOLS_API.md`.


Image tools for autonomous AI agents: the **headless CLI** supports independent `removeBackground`, `splitImageWand`, and `splitImageManual` with `poly` or `bezier` region shapes. These may be invoked from `SuperMagicAssetStudio.ps1` with a JSON commands file. See `IMAGE_TOOLS_API.md`.