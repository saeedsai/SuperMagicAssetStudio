# Menu navigation and Paint sidebar (v5.9.4)

The editor retains the existing action IDs, imports, dialogs and editing features while consolidating the navigation.

| Location | Actions |
|---|---|
| **File → Import image / PNG…** | Opens the existing PNG/JPEG/WebP/JSON import file chooser and assigns files using the Assets import queue |
| **File** | New project, load/save JSON, image import, PNG/GIF/360° GIF/sprite-sheet export |
| **Edit → Import images and schemas** | Import PNG/JSON, parts schema, download standard parts, resolve external images |
| **Edit → Sprite and image editing** | Manual crop/split, auto-split, background removal, splitter, independent background removal |
| **Edit → Edit and automation** | Undo/redo, auto-fit, cross-view auto-resize, AI command panel |
| **Right sidebar → Paint** | Move/select, rectangle/freeform/wand selections, clear selection, brush, eraser, clone, fill, picker, text and six geometric shape tools |
| **Top canvas toolbar → Tool options** | Contextual paint settings such as brush size/shape, opacity, texture, gradient, font, sides and curves |

Every right-side Paint action has an inline SVG icon (no network or font dependency); the active tool is visibly highlighted. Existing `data-paint-menu` event listeners and browser APIs continue to work because the original controls were relocated, not replaced with dummy actions. Tool settings continue using the previously existing contextual **Tool options** dialog.

## Regression acceptance

TC-133 checks that the Import/Tools menus became Edit without losing their actions and verifies opening split, background and AI dialogs. TC-134 checks both File and Edit invoke the same real import file picker. TC-135 verifies the Paint tab is on the right, all 17 option icons appear, all 16 paint selections change the real active tool and open real tool settings, and Clear selection modifies the actual selection state. TC-130 continues to cover visibility of every static and context-dependent UI control.

Run the full test gate:
```sh
npm run test:contracts
npm test
npm run test:browser
```

Remaining manual checks: screen-reader keyboard navigation through nested dialogs, native touch/stylus interactions and real imported art visual comparison.
