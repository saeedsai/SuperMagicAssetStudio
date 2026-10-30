# SuperMagic Asset Studio v5.5 — Verification

**Date:** 2026-10-30

- Browser editor boots without JavaScript page errors.
- Four selection modes shown: rectangle, polygon, smooth Bézier curve, magic wand.
- Smooth curved region created with four anchors; edit-points drag moved an anchor.
- Magic wand selected the neighboring transparent island independently.
- Browser `cropImageRegions` rendered valid PNG blobs from Bézier and wand selections.
- Separate background remover opened, uploaded an opaque PNG, removed 14,034 edge-connected pixels and preserved the original canvas.
- Node CLI `splitImageManual` with `bezier`, `splitImageWand` and independent `removeBackground` produced alpha PNGs; the same background count was reproduced.
- Existing real head sprite sheet detected 6 sprites via headless automatic split.

These tests use both a synthetic irregular-shape fixture and the supplied Athletic Character Head View Sheet.png. For fully overlapping sprites, freeform/manual edits are still required; a color/alpha wand cannot separate genuinely overlapping same-color pixels reliably. This is traditional pixel segmentation, not AI semantic detection.