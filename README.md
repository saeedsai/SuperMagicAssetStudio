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