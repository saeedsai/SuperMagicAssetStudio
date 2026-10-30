# Product requirements and regression traceability

Created by Saeed (saeedmsalehi1990@gmail.com) · Living specification for SuperMagic Asset Studio.

**Source:** Requirements consolidated from the entire design conversation through October 30, 2026 plus the present implementation. Every requirement has an individual test case identifier `TC-NNN`.

**Verification modes:** `unit` exercises the headless domain or geometry model; `integration` exercises persisted JSON, images, exported files and/or CLI; `browser` exercises a browser UI (runs on CI Chromium); `contract` checks static API/docs/config consistency. Cases are individually registered in `tests/requirements.json`. A contract test is not a substitute for human visual/quality review.

**Acceptance principles:** maintain eight precise views, consistent pixel coordinates relative to source PNG, lossless roundtrip of layer/order/crop/color/mirror/position/animation links, isolated transparency, no destructive changes to source sheets, and backwards compatible asset JSON.

## Functional requirements

| ID | Area | Requirement | Test | Evidence |
|---|---|---|---|---|
| REQ-001 | ASSET | Full body + head in one PNG | TC-001 | unit |
| REQ-002 | ASSET | Body plus detachable head | TC-002 | unit |
| REQ-003 | ASSET | Standard modular character structure | TC-003 | unit |
| REQ-004 | ASSET | Custom modular structures of arbitrary complexity | TC-004 | unit |
| REQ-005 | ASSET | Standard head base ears and neck | TC-005 | unit |
| REQ-006 | ASSET | Hair front and back independently | TC-006 | unit |
| REQ-007 | ASSET | Eyebrows, eyes, nose and expressions | TC-007 | unit |
| REQ-008 | ASSET | Beard and optional facial hair | TC-008 | unit |
| REQ-009 | ASSET | Torso, jersey and optional sleeves | TC-009 | unit |
| REQ-010 | ASSET | Independent upper arms, forearms and hands | TC-010 | unit |
| REQ-011 | ASSET | Pelvis and independent shorts | TC-011 | unit |
| REQ-012 | ASSET | Thighs, shins, socks and football boots | TC-012 | unit |
| REQ-013 | ASSET | Anatomical left and right labels | TC-013 | contract |
| REQ-014 | ASSET | Custom UI add, edit, rename, group and remove parts | TC-014 | browser |
| REQ-015 | ASSET | Custom parts reorder and defaults | TC-015 | browser |
| REQ-016 | ASSET | Custom part schema base, merge, export and import | TC-016 | browser |
| REQ-017 | ASSET | Default placement per part | TC-017 | unit |
| REQ-018 | CAMERA | Eight specific camera directions | TC-018 | unit |
| REQ-019 | CAMERA | Previous and next view below canvas | TC-019 | browser |
| REQ-020 | CAMERA | 360 degree step-through/turntable preview | TC-020 | browser |
| REQ-021 | CAMERA | Camera view buttons remain in side panel | TC-021 | browser |
| REQ-022 | CAMERA | Mirrored reuse and opposite directions | TC-022 | unit |
| REQ-023 | CAMERA | View-specific image assignments | TC-023 | unit |
| REQ-024 | ANIM | Stand and run animation variants | TC-024 | unit |
| REQ-025 | ANIM | Add, duplicate, delete frames | TC-025 | unit |
| REQ-026 | ANIM | FPS control and animated playback | TC-026 | browser |
| REQ-027 | ANIM | Reuse another animation as linked timeline clip | TC-027 | unit |
| REQ-028 | ANIM | Unlink and edit frames independently | TC-028 | unit |
| REQ-029 | ANIM | Export animated GIF | TC-029 | integration |
| REQ-030 | ANIM | Export sprite-sheet PNG | TC-030 | integration |
| REQ-031 | ANIM | Export 360 turntable GIF | TC-031 | integration |
| REQ-032 | LAYER | Multiple PNG layers with forward/back ordering | TC-032 | unit |
| REQ-033 | LAYER | Hide/show and lock layers | TC-033 | unit |
| REQ-034 | LAYER | Multiple selection with Ctrl | TC-034 | browser |
| REQ-035 | LAYER | Group movement and resize | TC-035 | browser |
| REQ-036 | LAYER | Position, rotation, scale X and scale Y | TC-036 | unit |
| REQ-037 | LAYER | Source-relative transformations preserved in JSON | TC-037 | unit |
| REQ-038 | LAYER | Visual crop rectangle independent of resize | TC-038 | browser |
| REQ-039 | LAYER | Mirror and flip individual layers | TC-039 | unit |
| REQ-040 | LAYER | Opacity and anchor alignment | TC-040 | unit |
| REQ-041 | LAYER | Auto-fit using geometry heuristics | TC-041 | unit |
| REQ-042 | LAYER | Auto-resize across directions and animations | TC-042 | unit |
| REQ-043 | LAYER | Reference overlay of other camera/frame at 30 percent | TC-043 | unit |
| REQ-044 | LAYER | Grid and X/Y rulers | TC-044 | unit |
| REQ-045 | LAYER | Undo and redo | TC-045 | integration |
| REQ-046 | COLOR | Separate RGB channels | TC-046 | unit |
| REQ-047 | COLOR | HEX tint color and tint strength | TC-047 | unit |
| REQ-048 | COLOR | Brightness, contrast, saturation, hue, sepia | TC-048 | unit |
| REQ-049 | IMPORT | Upload multiple files and assign later | TC-049 | browser |
| REQ-050 | IMPORT | Import manifest with image metadata and transforms | TC-050 | integration |
| REQ-051 | IMPORT | Manually draw rectangular sprite crop | TC-051 | browser |
| REQ-052 | IMPORT | Auto-detect sprites based on alpha connectivity | TC-052 | unit |
| REQ-053 | IMPORT | Freeform polygon cutout | TC-053 | unit |
| REQ-054 | IMPORT | Curved Bézier boundary | TC-054 | unit |
| REQ-055 | IMPORT | Edit existing boundary anchors | TC-055 | browser |
| REQ-056 | IMPORT | Magic wand connected pixel selection | TC-056 | unit |
| REQ-057 | IMPORT | Standalone edge-connected background remover | TC-057 | unit |
| REQ-058 | IMPORT | Assign extracted image to camera/animation/frame | TC-058 | integration |
| REQ-059 | IMPORT | Export separated PNGs and manifest | TC-059 | integration |
| REQ-060 | PROJECT | Save JSON including embedded PNG images | TC-060 | integration |
| REQ-061 | PROJECT | Save JSON with external PNG references | TC-061 | integration |
| REQ-062 | PROJECT | Reload JSON without losing transforms/layers | TC-062 | integration |
| REQ-063 | PROJECT | Export transparent PNG | TC-063 | integration |
| REQ-064 | PROJECT | Backwards-compatible schema migration | TC-064 | unit |
| REQ-065 | PROJECT | Game runtime renders saved character | TC-065 | integration |
| REQ-066 | UI | Top File, Import, View, Animation, Tools, Help menus | TC-066 | browser |
| REQ-067 | UI | Collapsible panels and progressive disclosure | TC-067 | browser |
| REQ-068 | UI | Part picker depends on selected asset mode | TC-068 | browser |
| REQ-069 | UI | AI structured JSON command panel | TC-069 | browser |
| REQ-070 | API | Browser automation API for create, edit, review | TC-070 | browser |
| REQ-071 | API | PowerShell entrypoint and Node CLI support | TC-071 | integration |
| REQ-072 | API | Machine-readable command schema and JSON outputs | TC-072 | integration |
| REQ-073 | API | CLI image processing and rendering | TC-073 | integration |
| REQ-074 | API | CLI transactional history undo/redo | TC-074 | integration |
| REQ-075 | DOC | Complete README and in-app Help | TC-075 | contract |
| REQ-076 | DOC | Credit Created by Saeed and email | TC-076 | contract |
| REQ-077 | DOC | MIT license included | TC-077 | contract |
| REQ-078 | DOC | Four-mode asset creation prompt and design guide | TC-078 | contract |
| REQ-079 | DOC | Agent instructions and architecture conventions | TC-079 | contract |
| REQ-080 | DOC | API and JSON schema documentation | TC-080 | contract |
| REQ-081 | ENG | Develop changes on dev, verify then merge main | TC-081 | contract |
| REQ-082 | ENG | CI regression suite for requirements | TC-082 | contract |
| REQ-083 | ENG | No generated assets or historical screenshots in source root | TC-083 | contract |
| REQ-084 | ENG | Render deployment occurs from main only | TC-084 | contract |

## Non-functional and future requirements

Production artwork should use isolated 1024×1024 PNGs, fixed orthographic camera/elevation, standardized attachment points, original character lighting, no text/logos baked into reusable parts, mirrored views only when asymmetries allow it, and no copyrighted character likenesses. These are content-production guidelines, not programmatic guarantees.

**Future backlog, not implemented / not silently treated as passing:** semantic AI-powered part fitting; robust removal of complex photo backgrounds; per-sprite editable alpha masks with paint brushes; frame tweening and rigged skeleton; GPU/performance optimization for thousands of parts; end-to-end Windows PowerShell CI on actual Windows; visual golden-image comparisons using a canonical production art pack. Record issues with acceptance criteria when prioritized.

**Release gate:** all automated test cases must pass, all broken references must be fixed, `dev` must be reviewed and merged via PR, and deployment must be checked after main updates.