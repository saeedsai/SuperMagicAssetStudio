# Skeleton and modular animation (experimental, dev branch)

This feature adds non-destructive **2D hierarchical joint rigs**, distinct from source-image layers. Rig coordinates use the existing editor canvas pixel coordinate system. The rig is stored separately per view to avoid treating 2.5D sprite views as a true 3D mesh.

## Data model

* `project.rigs[view]`: `{schemaVersion:1,joints:[{id,parent,position:{x,y}}], bindings:[{category,joint,anchor:{x,y}}]}`; joint rest positions are **absolute canvas coordinates**. `parent` is an ID or null. One category binding per view.
* `project.poses[view][animation][frame]`: sparse joint overrides `{jointId:{x?,y?,rotationDeg?}}`. Rotation is in degrees relative to the parent; x/y are local **translation offsets**.
* `project.motions[view][animation]`: `{keyframes:[{timeMs,pose}]}` with linear interpolation. Keyframe timestamps in milliseconds.
* Existing layer crops, colors, z-order, and base transforms are untouched; pose application returns cloned, posed layers. Missing rig/pose means legacy behavior.

## CLI and headless commands

Use `node src/cli/agent-cli.mjs --project player.json --commands commands.json` (see CLI help for exact accepted flags), or use `execute(project,{commands:[...]},{projectPath})`.

```json
{
  "commands":[
    {"op":"createRig","view":"front","joints":[{"id":"root","parent":null,"position":{"x":384,"y":470}},{"id":"knee","parent":"root","position":{"x":352,"y":590}}],"bindings":[{"category":"lowerLegLeft","joint":"knee","anchor":{"x":0,"y":0}}]},
    {"op":"setJoint","view":"front","id":"knee","changes":{"position":{"x":355,"y":583}}},
    {"op":"bindPart","view":"front","category":"bootLeft","joint":"knee","anchor":{"x":0,"y":0}},
    {"op":"setPose","view":"front","animation":"run","frame":"run_1","pose":{"root":{"y":-12},"knee":{"rotationDeg":30}}},
    {"op":"setMotion","view":"front","animation":"run","keyframes":[{"timeMs":0,"pose":{"knee":{"rotationDeg":-30}}},{"timeMs":150,"pose":{"knee":{"rotationDeg":40}}},{"timeMs":300,"pose":{"knee":{"rotationDeg":-30}}}]},
    {"op":"samplePose","view":"front","animation":"run","timeMs":75},
    {"op":"listPosedLayers","view":"front","animation":"run","frame":"run_1"},
    {"op":"getRig","view":"front"},
    {"op":"getPose","view":"front","animation":"run","frame":"run_1"}
  ]
}
```

`setRig` replaces a view's rig and validates it; `createRig` replaces a view's rig from joint/binding arrays. `samplePose` returns a computed animation pose without modifying source data. For motion preview, pass `timeMs` to `listPosedLayers`.

## Known limitations

The **Skeleton / Pose** control beside the Animation selector opens a dialog for per-view rig creation, category binding, numeric joint/pose editing, draggable rest joints, and starter **idle, running (two strides), jumping and celebration** poses. The browser editor, headless renderer and standalone game runtime apply saved **frame poses**, and sample `motions` at frame times for animation playback, PNG/GIF and sprite-sheet export. Timing is frame-sampled; there is not yet an independent subframe motion-preview timeline. A binding's `anchor` is an additional canvas-pixel pivot offset used during joint-driven rotation, without shifting the part's rest position. This is separate from the image's normalized `transform.anchorX/anchorY`. There are no IK solvers, mesh deformation, auto-weighting, motion curves, contact constraints, or 3D cross-view retargeting yet. This distinction is important: **do not report visual animations as implemented or validated**.

## Next integration requirements

Complete rig overlay editing directly on the main canvas (currently a separate dialog preview), add snapping, pivot/anchor editing and full animation timeline with playback interpolation and onion skin. Improve independent timeline/keyframe editing, IK and skin deformation, interpolation beyond frame sampling, advanced anchor editing and inherited-frame pose overrides, then add broader interaction and visual regression coverage. No changes to the existing four asset structure modes are required: fullBody is one root sprite, bodyHead is coarse bones, standard/custom use fine-grained rigs.
