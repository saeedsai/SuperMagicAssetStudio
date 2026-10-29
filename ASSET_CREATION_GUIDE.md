# Creating game-ready 2.5D football characters

**SuperMagic Asset Studio — Production Guide (v5.4)**  
Created by Saeed · saeedmsalehi1990@gmail.com

## Recommendation in one paragraph

For a game with many football players, use **Body + Separate Head** as the primary production pipeline. Reuse a small number of well-animated body kits, while swapping head sprites and colors. Add replaceable shirts, shorts, or accessories only when you need customization. Use **Full Body** for quick prototypes and unique pre-rendered poses, **Standard Modular** for characters that must animate arms/legs/face independently, and **Custom Modular** when you want the right balance between production cost and flexibility. These four modes can coexist in the same game.

## Shared rules for all asset modes

- Plan eight orthographic directions in this order: `front`, `threeQuarterFrontLeft`, `left`, `threeQuarterBackLeft`, `back`, `threeQuarterBackRight`, `right`, `threeQuarterFrontRight`.
- Use the **same orthographic camera elevation, focal length/distance, character proportions, and lighting** for all eight directions. No per-view zoom changes.
- Use a **1024 × 1024 reference canvas** for character sprite generation where practical. All exported parts for a character should share the **same reference origin and scale**, even when the visible art occupies only a small region.
- Define coordinate anchors before producing art: floor/foot contact, character centerline, neck joint, shoulders, elbows, wrists, hips, knees and ankles. Example anchors (1024 reference canvas): foot ground at `(512,946)` and centerline at `x=512`. Adjust other anchors for your chosen character design, then keep them fixed across views.
- Use transparent RGBA PNGs; test that transparent pixels really have alpha=0. Keep **soft anti-aliased edges** and do not bake a colored backdrop into the sprite.
- Include enough overlap at neck, sleeves, elbows, waist, knees and ankles to prevent gaps when parts rotate; place joints under clothing when possible.
- Keep left/right **anatomical** (the character's left, not the viewer's left).
- Avoid baked-in player numbers, logos or personalized emblems on reusable kits. Reserve separately replaceable overlays for these.
- Ensure consistent lighting and visible volume in all views. For mirrored reuse, inspect asymmetric uniforms, tattoos, patches, highlights, letters and logos; mirrored text must be redrawn.
- Generate one independent part per PNG **whenever the target mode calls for separate parts**. A contact sheet is useful as a delivery format but not as a runtime part: split it before assigning view and frame.
- Suggested asset name: `<variant>_<part>_<view>_<animation>_<frame>.png`, such as `alex_head_threeQuarterFrontRight_run_02.png`.
- Prefer a master character reference and standardized sprite dimensions over independent generation for every angle.

## Mode 1: Full Body (fastest)

**Generate:** one complete player with head, hair, jersey, shorts, legs, socks and boots **per view and pose**. The artwork is already assembled; no individual head replacement.

**For every animation** (e.g., `stand`, `run`, `kick`, `celebrate`) provide a sequence of complete full-body PNG frames for all eight viewing directions. Example: `alex_fullBody_front_run_01.png` and `alex_fullBody_front_run_02.png`.

**Best when:** prototyping, fixed heroes, elaborate one-off animations. **Tradeoff:** changing hairstyle/kit requires new images. File count grows by `views × animations × frames × variants`.

**Studio setup:** select **Full Body**. Import full body frames; assign each to a view, animation and frame. Keep scale/pivot consistent. Put optional FX as separate accessories.

## Mode 2: Body + Separate Head (recommended default)

**Generate two core asset families:**

1. **Headless body:** neck opening, shoulders, jersey, shorts, limbs, socks, boots; pose/animation sequence for each view. Keep a consistent neck attachment area.
2. **Head and hair together:** one complete head for each of eight views. Add optional expression or animation head variants only when needed (e.g., blink, cheer, shout). Generate a neck extension to overlap the jersey collar.

**Optional layers:** jersey overlay, shorts overlay, accessories, separate hair or helmet. To create many players, reuse the same body animations and substitute heads plus uniform/skin-color variations. This is the most efficient path for a football roster.

**Studio setup:** select **Body + Separate Head**, import body and head PNGs per view. Position head once on a reference frame, then propagate appropriate scale/offset across matching frames. Save source-relative transforms in JSON. The example front-view assembly from the supplied PNGs shows this mode.

**Animation note:** a static head reused over running frames will look rigid; add mild head translation/rotation or at least 2–3 head keyframes when possible.

## Mode 3: Standard Modular (highest flexibility)

**Generate these independently movable components**, each for all eight directions:

| Group | Separate files / assets |
|---|---|
| Head | Head base with ears and neck joint; front hair; back hair |
| Face | Eyebrows; eyes (including blink options); nose; mouth (expressions); optional moustache/beard |
| Upper body | Torso and jersey; left/right upper arms; left/right forearms; left/right hands; optional independent left/right sleeves |
| Lower body | Pelvis; shorts; left/right thighs; left/right lower legs; optional separate left/right socks; left/right boots |
| Extras | Badge/logo/number overlays, wristbands, gloves, boots, captain armband, glasses or other optional accessories |

**Joint rules:** Draw a hidden overlapping shoulder/elbow/knee attachment patch for each articulated segment. Place anchors at joint centers in JSON; rotate the segment about its anchor. Do not produce a leg or forearm that ends exactly at the visible seam.

**Animation:** For true modular animation, change transforms of pieces per frame instead of drawing a new body PNG for every pose. Store pivot, position, rotation, scale, mirror, visibility and render order in JSON. If needed, provide multiple hand or boot sprites for extreme poses.

**Studio setup:** select **Standard Modular**. Use default part IDs for cross-player reuse. Import each part into the correct view/category; use the inspector and grid to align pivots and sizes. The artwork should use consistent canvas offsets as the game runtime relies on JSON transforms.

**Tradeoff:** more art files and rigging work, but best for animations, outfit changes and dynamic actions.

## Mode 4: Custom Modular (mix and match)

Customize the number of parts according to your project. Three sensible presets:

**Simple custom:** `body`, `head`, `shirt`, `shorts`, `accessory` — a quick roster with customizable kits.

**Intermediate custom:** `head`, `hairFront`, `hairBack`, `torso`, `leftArm`, `rightArm`, `shorts`, `leftLeg`, `rightLeg`, `boots`, `accessory` — more expressive animations with fewer joins.

**Advanced custom:** start from the standard structure, then add `captainBand`, `gloves`, `sleevePatch`, `sweatband`, `facePaint`, `jerseyNumber`, `eyeExpression` or whatever your game needs.

**Studio setup:** select **Customized Modular**. In the Project panel, choose a base structure (`Full Body`, `Body + Head`, `Standard Modular`, or existing custom). Select **Use as base** to replace or **Merge base** to extend. Add/rename/remove/reorder parts in the UI. Export the custom `SuperMagicParts` JSON and reuse it for other characters.

**Important:** if you delete a part definition that existing layers still use, those layers may remain in the project but will not appear as selectable categories. Reassign or remove the corresponding layers before exporting production assets.

## Recommended animation content

Start with `stand` (2–4 frames), `run` (6–12 frames), `turn`, `kick`, `pass`, `tackle`, `jump`, `fall`, `celebrate` and `goalkeeper` where relevant. Not every view needs every action at prototype stage; use the nearest available angle temporarily, but mark missing views as placeholders and do not call them authentic eight-direction art.

For **Body + Separate Head**, 8 views × 8 running body frames = 64 body images, plus 8 static head angles (or a few head frames if needed). This is far cheaper than making 64 fully personalized player images for every roster member.

For **Standard Modular**, most animation can live in JSON transform keyframes rather than additional PNGs.

## Sprite sheets and extraction

1. Use **Import → Auto-split multiple sprites** for sprite sheets on transparent backgrounds with visually isolated figures. The detector finds contiguous alpha regions and proposes crop rectangles.
2. Use **Import → Manual crop & split** if silhouettes touch, overlap, or need hand-edited bounds. Drag one rectangle per resulting sprite.
3. Use **Import → Remove image background** for a nearly solid-colored background. Set the color and tolerance, preview the change, and inspect edges. It is *not* general AI subject segmentation.
4. Select **Add splits to import queue**, then set each item's **view**, **category**, **animation**, **frame**, and optional mirror. The tool does not guess viewing directions from artwork content.
5. You can also download PNGs + `sprite-manifest.json` as a ZIP and bring the files back later.

### Example: the supplied files

The two supplied 1536 × 1024 PNG sheets contain **six separate alpha islands each**, not eight complete direction views. They automatically split into **six head files and six running-body files**. Missing angles must be generated, drawn, or deliberately mirrored (with manual verification). Cropped body poses are not automatically a complete running cycle.

## Storage and runtime

- **Bundled JSON:** PNG data URLs embedded in the project. Convenient for AI-assisted review, offline import and single-file backups, but JSON can become large.
- **External JSON:** `assets[*].fileRef` points to PNG files; better for production pipelines and game builds. Preserve file paths and include the PNGs with your game.
- Keep `crop` in original source pixels, and `transform.scaleX`, `transform.scaleY`, `rotationDeg`, `x`, `y`, `flipX` and `flipY` in project JSON. They must be interpreted relative to the original source dimensions and pivots.
- The canvas origin is top-left. The layer order in `scenes[view][animation][frame]` is back-to-front.
- Use the included browser API or PowerShell/Node CLI for repeatable exports and regression checks. Use `review` to detect missing image references and broken frame links.

## Reusable AI image-generation prompt

> Original premium stylized 2.5D football player art, consistent orthographic camera, identical character proportions, lighting, and 1024×1024 transparent reference canvas. Character variant: **[VARIANT]**. Asset mode: **[fullBody / bodyHead / standard / custom]**. Generate exactly **[PART_ID]** from **[VIEW_DIRECTION]**, for animation **[ANIMATION]** frame **[FRAME_NUMBER]**. Match the attached master character reference and its anchor map. Keep neck/shoulder/elbow/hip/knee/ankle attachment seams overlapping and invisible when assembled. Do not add other body parts unless they belong to the chosen mode. No background, ground shadow, text, branding, extra objects, or watermark. Preserve alpha transparency, accurate joint geometry and consistent relative scale. One output PNG, not a sprite contact sheet.

## Delivery checklist

- [ ] Same master design and proportions across all eight requested views
- [ ] The requested part alone, unless the chosen mode intentionally combines parts
- [ ] Correct alpha transparency, no leftover background color
- [ ] Correct layer order and anatomical left/right
- [ ] Stable pivots and joint overlaps
- [ ] Correct view, animation and frame assigned in import queue
- [ ] Scale/rotation measured against source dimensions
- [ ] JSON save/load round-trip works
- [ ] Runtime PNG/GIF exports visually inspected
- [ ] Missing directions and mirrored approximations documented