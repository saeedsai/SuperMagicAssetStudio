# Project packages

All operations are in the **File** menu.

- **Save standalone JSON (Ctrl+S)** exports a single FootballSpriteStudio JSON with all images embedded as base64 data URLs.
- **Save ZIP (JSON + images)** exports project.json with fileRef links and separate binary image files in images/. ZIP is created offline with uncompressed STORE entries and CRC32 validation.
- **Open project JSON / ZIP (Ctrl+O)** replaces the current project from either format.
- **Import / merge JSON or ZIP into current project** imports assets, animations, frames and layers into the existing project. Imported IDs are remapped to avoid collisions. Canvas sizes must match. Existing work is preserved.

The ZIP parser checks checksums, paths and size limits. It supports ZIP archives produced by this studio, not encrypted or externally compressed ZIPs. Unresolved images must be resolved before saving.

Browser API: saveJSON(), saveZIP(), exportProjectZip() (Blob), openProjectFile(file), mergeProjectFile(file), mergeProjectObject(data). These are available on window.SuperMagicAssetStudioAPI.

Run npm test and npm run test:contracts. ZIP unit tests cover binary and JSON roundtrips, CRC validation and path traversal.
