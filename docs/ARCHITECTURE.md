# Architecture and directory map

## Layout

```text
SuperMagicAssetStudio/
  AGENTS.md                   agent coding/release instructions
  README.md                   installation, usage, links
  LICENSE                     MIT
  index.html                  static browser entrypoint
  SuperMagicAssetStudio.ps1   Windows/PowerShell CLI wrapper
  package.json                test and verification scripts
  src/
    editor/
      styles.css              browser UI styles
      sprite-geometry.js      isolated pure region geometry
      app.js                  browser editor controller and command bridge
      ui/ui-shell.js           DOM-preserving contextual workspace / popover controller
      ui/workspace-config.mjs  pure mapping of workspaces, canonical commands, tool settings
    cli/
      agent-cli.mjs           JSON command parser, persistence and exports
      agent-engine.mjs        model, transforms, modes, animations and commands
      agent-image-tools.mjs   masks, wand, auto-split, bg removal
      agent-raster.mjs        PNG/GIF codec and offline renderer
    runtime/runtime.js        embed saved projects in the game
  docs/
    REQUIREMENTS.md           traceable full requirement catalogue
    TEST_PLAN.md              verification levels and report conventions
    API.md                    browser scripting surface
    CLI_API.md                PowerShell/Node automation reference
    IMAGE_TOOLS_API.md        selection and cutout reference
    JSON_FORMAT.md            persisted format
    ASSET_CREATION_GUIDE.md   artwork prompt/spec for 4 asset modes
    AI_COMMANDS.md            structured browser command examples
  examples/                   standard/custom parts and small sample manifests
  tests/
    requirements.json         REQ to individual TC mappings
    unit/                     Node 20+ test runner
    browser/                  Chromium Playwright integration tests
  scripts/check-layout.mjs    reproducible tree and import validation
  .github/workflows/ci.yml    main/dev/PR CI gates
```

## Data flow

1. User imports PNGs, sprite sheets or a JSON bundle.
2. Browser controller (`src/editor/app.js`) manages eight direction state, animations, frames, assets and layers. Pure sprite shape math is in `sprite-geometry.js`.
3. Project object conforms to `FootballSpriteStudio` version >=4. Asset references are either inline data URLs or filenames; each layer stores independent source crop, position, scale, angle, color and order.
4. Browser API and Node CLI can read and edit the same JSON model. `agent-engine.mjs` is authoritative for headless project operations.
5. The renderer turns this project into transparent PNGs, GIFs and sprite sheets; `runtime.js` provides in-game drawing.

## Migration and preserved behavior

The former 198 KB one-file HTML application was split into markup, 16 KB stylesheet, 3 KB pure geometry and controller script. The CLI was moved to `src/cli` and the runtime to `src/runtime`, with the PowerShell entrypoint kept at root for convenience. Existing file/command names are preserved at API level; link/documentation paths changed. Historical screenshots and exported demo archives are not tracked. This is a **safe incremental modularization**, not a complete rewrite: the browser editor controller remains large and is an explicit future refactoring target.

## Work boundaries

- Put new geometry/image algorithms in dedicated independently testable functions or modules.
- Do not put headless Node file-system code in the browser bundle.
- Keep CLI commands deterministic and emit JSON errors with nonzero exit code on failure.
- Add one acceptance case for each requirement and substantive behavior tests for each changed feature.
- Keep `index.html` at repo root for Render static hosting on `main`.
## UI ownership (v5.8)

The UI shell activates left/right tabpanels, moves *existing* controls to their contextual home, hides redundant menu relay nodes, and shows the existing paint settings only in the Tool options popover. It never owns project state, raster operations or serialized JSON. `workspace-config.mjs` defines each panel's unique placement, tool-to-property mapping and legacy action aliases. `src/editor/paint-tools.js` continues to own draw/selection behavior; `src/editor/app.js` continues to own editing/project state. The shell is loaded after both via a deferred JS module. The public `SuperMagicStudioUI` facade is layout-only.

## Shared UI/API/CLI contract (v5.9)

The static [control catalog](../src/shared/ui-capabilities.json) is the authoritative inventory of HTML controls and CLI equivalents. src/editor/ui/control-api.js reads this inventory and exposes browser get/set/invoke, using original DOM handlers and persisting option values in project.editor.uiOptions. src/cli/agent-paint.mjs implements PNG-based headless painting without native modules; src/cli/agent-engine.mjs handles capability queries, typed option reads/writes and paint commands. src/cli/agent-cli.mjs supports --list-controls and mapped action routing. A catalog entry with browserOnly indicates a visual-only operation, not false headless feature parity. Tests check that each unique static HTML control is listed and that actual round-trip/painting operations succeed.
