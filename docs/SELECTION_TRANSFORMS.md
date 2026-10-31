# Transforming pixels selected with Rectangle, Freeform or Magic Wand

In the right-hand **Paint & selection** workspace, use **Rectangle selection**, **Freeform selection** (finish boundary), or **Magic wand selection**. Once the target is highlighted, use:

- **Copy to layer** to preserve original pixels and make an independently editable copy.
- **Cut to layer** to erase selected pixels from the currently selected, visible, unlocked source layer and create an editable layer from the highlighted composite pixels. The source layer must be selected to cut.

The new layer is selected automatically. Switches to normal Move mode and opens existing layer editing: drag to move, use canvas handles to scale/rotate, or use Inspector for numeric position, scale, rotation, opacity, mirror, crop and other layer properties. The new layer has a cropped bounding box matching its nontransparent selected pixels (not the whole canvas), and is stored as a PNG raster layer in project JSON. Copy and cut support undo; cutting currently creates a separate undo step for erasing and one for inserting the extracted layer.

The selection mask clips copied pixels and preserves transparency. Selection previews remain non-destructive until Copy/Cut. Unrelated layers are not erased when cutting, although copied pixels are taken from the visible canvas composite; isolate the source if you need a strictly single-layer copy.

Browser API: `window.SuperMagicPaintAPI.extractSelection(false)` for copy and `extractSelection(true)` for cut, after selecting by the UI or `setSelectionMask(mask)`. Existing layer transformation APIs and inspector controls apply after extraction.
