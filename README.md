# SuperMagic Asset Studio

**Created by Saeed**  
**saeedmsalehi1990@gmail.com**

An offline-first HTML/JavaScript editor for modular 2.5D football sprites. Edit eight orthographic directions, reusable parts and animation frames; export transparent PNG, GIF, sprite sheets and machine-readable projects. Standalone headless CLI and Windows PowerShell wrapper are included.

[Live application](https://supermagic-asset-studio.onrender.com) · [Requirements](docs/REQUIREMENTS.md) · [API](docs/API.md) · [Agent instructions](AGENTS.md) · [Test plan](docs/TEST_PLAN.md)

## Getting started

Run `index.html` from a static server for full browser asset functionality (or visit the live application). Node 20+ enables the CLI. No runtime npm dependencies are needed. For command examples:

```bash
node src/cli/agent-cli.mjs --list-ops
node src/cli/agent-cli.mjs --project player.json --commands '{"commands":[{"op":"review"}]}'
```

```powershell
pwsh -File ./SuperMagicAssetStudio.ps1 -Project ./player.json -Operation review
```

## Main features

- Character modes: complete player, body + separate head, standard modular, arbitrary custom modular UI editor.
- Eight view angles with under-canvas left/right rotation control, mirrored reuse and consistency references.
- Independent body layers; group selection, crop, scale X/Y, rotation, color/HEX tint, move, visibility, reordering, undo/redo, grid and rulers.
- Animation timelines (stand, run, tackle, celebrate and custom), reusable linked clips and frame-specific assets.
- Sprite-sheet import: manual rectangle/polygon/curved selection, editable anchor points, magic wand, alpha auto-splitting and separate background removal.
- Bundled JSON or referenced external PNGs. Browser/AI structured commands, Windows PowerShell, Node CLI, game runtime and PNG/GIF exports.

## Documentation

- [Agent coding guide](AGENTS.md), [architecture](docs/ARCHITECTURE.md) and [full requirements](docs/REQUIREMENTS.md).
- [Browser API](docs/API.md), [CLI API](docs/CLI_API.md), [Image Tools API](docs/IMAGE_TOOLS_API.md), [JSON format](docs/JSON_FORMAT.md).
- [2.5D asset production guide](docs/ASSET_CREATION_GUIDE.md) and [structured commands](docs/AI_COMMANDS.md).
- [Test plan](docs/TEST_PLAN.md), [latest test report](docs/TEST_REPORT_CURRENT.md) and [individual test matrix](tests/requirements.json).

## Testing and release process

`npm test` checks domain operations, image tools, CLI integration and one traceability test case per requirement. `npm run test:browser` runs UI regression cases with Playwright/Chromium. GitHub Actions runs both on `dev`, `main` and pull requests. Implement on `dev`, pass CI, review PR, then merge to `main`. Render auto-deploys `main`.

## License

MIT — see [LICENSE](LICENSE). This package retains creator credits and respects source artwork rights.

### Main-canvas Paint menu (v5.7)

Use **Paint** to switch between rectangle / freeform / magic wand selection and drawing tools. The **Tool options** popover lets you set brush size, round/square/diamond/soft tip, color and opacity, preset or imported texture, solid/texture/gradient fill, polygon sides, curve bend, text font and font size. Alt-click to sample the clone stamp source. To remove pixels, set **Erase target** to either added paint/text/shapes or the currently selected original image. Strokes are stored as editable raster layers in the scene and included in bundled JSON and PNG exports. Painting operations enter Undo history. **Move layers** returns to normal layer selection/transform mode.

## Modular workspace UI (v5.8)

The left workspace now groups **Project**, **Assets**, **Animation**, **Layers**, and **Camera** behind tabs. On the right, choose **Inspector**, **Canvas**, or **Shortcuts**. All original section controls are moved into the relevant workspace without duplicating DOM IDs. The **Paint** menu is the single place to choose painting/selection/shape tools; click **Tool options** in the canvas toolbar to change only properties relevant to the active tool (brush tip, size and texture; eraser target; wand tolerance; text font; shape sides, etc.). The popover closes by its X, Escape, or clicking outside. Advanced import settings and linked-clip options are expandable. Sprite detection settings respond to alpha/grid and region shape choices. Menus keep a single canonical action entry for commands; hidden legacy command relays preserve existing APIs/keyboard bindings.

This is a UI and interaction refactor, **not** a change to the saved project schema or the headless engine. Test reports distinguish automated behavior coverage from manual artistic/touch review.

## Complete browser and CLI control coverage (v5.9)

The [shared capability inventory](src/shared/ui-capabilities.json) records every stable HTML editor control, its property type, and its CLI support classification. The [browser API](docs/API.md) supports catalog, get/set/control invoke, paint settings, texture import, scripted mask/brush/fill/text/shape operations. The [CLI](docs/CLI_API.md) supports --list-controls, listCapabilities, getControlValue, setControlValue, invokeControl and headless paint. Values are interoperable through project.editor.uiOptions. Browser-only interactions (file pickers, native dialogs and playback) are labeled rather than misrepresented as headless editing. Unit and Chromium tests cover catalog completeness, persisted settings and raster workflows.
