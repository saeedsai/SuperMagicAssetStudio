# SuperMagic Asset Studio v5.4 — Image tools test report

Date: October 30, 2026. Credits: Created by Saeed, saeedmsalehi1990@gmail.com.

## Test inputs

- `Athletic Character Head View Sheet.png` — 1536×1024 RGBA (user-supplied)
- `Headless Purple-Gold Soccer Action Sprite Sheet.png` — 1536×1024 RGBA (user-supplied)
- Synthetic opaque green-screen test, 260×180 RGBA with foreground figure and an enclosed same-green detail

## Browser automation results

| Test | Result |
|---|---|
| Open image tools from editor API | PASS |
| Auto detect six separate head regions | PASS — 6 |
| Auto detect six separate headless body regions | PASS — 6 |
| Export ZIP with extracted PNGs + manifest | PASS — 7 entries per ZIP, CRC validated |
| Add split PNG files to assignment queue | PASS — 12 queued sprites |
| Manually draw crop rectangle on preview | PASS — output rectangle 65,15,145,144 on test image |
| Remove opaque chroma-green background | PASS — 30,672 pixels removed |
| Preserve enclosed same-green foreground detail using edge flood fill | PASS — inner alpha remains 255 |
| Encode transparent PNG | PASS — pixel alpha checked |
| Structured AI split command using an existing assetId | PASS — queued six PNGs |
| Browser JavaScript errors | None observed in covered tests |

## Headless CLI results

- `splitImageAuto`: six head PNGs generated from head sheet.
- `splitImageAuto`: six running body PNGs generated from action sheet.
- `splitImageManual`: two custom source-space crops generated from action sheet with assignments.
- `removeBackground`: transparent output from green-screen synthetic image.
- `importToProject:true`: two imported images/layers saved in project JSON; project review produced no warnings.
- Bundled demo project `v54_assembled_example.json` assembled front head and body and rendered PNG through CLI; zero validation warnings.

## Important limitations

- These two images contain **six independent figures each**, not a full eight-direction set. The auto splitter cannot invent missing camera angles.
- Auto split finds contiguous foreground alpha regions, not semantic direction labels or football anatomy; assignments remain editable.
- It may combine touching sprites or ignore very small disconnected decorations; manual split or grid detection is available.
- Remove background uses color thresholding and flood fill, not a trained segmentation model or fine hair matting.
- The example front-character composition is illustrative and the two inputs need manual fitting for production quality.

## Outputs

- `v54_auto_split_01.zip` — six head PNGs + manifest
- `v54_auto_split_02.zip` — six body PNGs + manifest
- `v54_split_results_preview.jpg` — preview of twelve extracted sprites
- `v54_assembled_example.json` — bundled editable front-view example
- `v54_demo_runtime_render.png` — PNG rendered from the example JSON through CLI
- `v54_auto_split_01.png` and `v54_auto_split_02.png` — browser screenshots of detection rectangles
- `v54_manual_split_ui.png` — browser screenshot of manual crop rectangle
- `v54_remove_background.png` and `v54_background_removed.png` — background-removal UI and transparent PNG test