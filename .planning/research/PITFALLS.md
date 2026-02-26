# Pitfalls: Browser-Based GIF Creator

**Domain:** Browser-based GIF creator for designer portfolio use
**Researched:** 2026-02-26
**Confidence:** HIGH — these pitfalls are well-documented in the browser canvas/GIF encoding space

---

## Pitfall 1: GIF Color Banding on UI Screenshots

**What it is:** GIF's 256-color limit causes visible banding on smooth gradients (common in modern UI design). Global palette quantization makes this worse — one palette for the whole GIF.

**Warning signs:** Subtle grey gradients become stepped; blue backgrounds show obvious bands; shadow effects look crusty.

**Prevention:**
- Use per-frame palette quantization (each frame gets its own optimal 256-color palette)
- Enable Floyd-Steinberg dithering — distributes quantization error to neighboring pixels
- Use `gifenc`'s `quantize()` per frame rather than a global palette
- Set this as the default — users should never have to ask for "better quality"

**Phase:** Phase 1 (GIF encoder setup — get defaults right from the start)

---

## Pitfall 2: Main Thread Freeze During Encoding

**What it is:** Encoding a multi-frame GIF with transitions is CPU-intensive. Running it on the main thread freezes the entire UI for 5-30 seconds depending on frame count and resolution.

**Warning signs:** UI becomes unresponsive after clicking Export; progress indicators don't update.

**Prevention:**
- Run encoding in a Web Worker
- Use `OffscreenCanvas` for frame rendering inside the worker
- `postMessage` progress updates back to the main thread (e.g., "12/30 frames encoded")
- Show a progress bar — users are more tolerant of wait time with visible progress

**Phase:** Phase 2 (after basic encoding works on main thread, move to worker)

---

## Pitfall 3: Crossfade Transition Color Artifacts

**What it is:** Alpha-blending two frames on canvas and then quantizing the blended result produces color artifacts that don't appear in either source frame. The intermediate blend introduces new colors that the palette must accommodate.

**Warning signs:** Crossfade transitions look "muddy" or show unexpected color noise at transition boundaries.

**Prevention:**
- Quantize each transition tick's pixel data independently (per-tick palette)
- This is handled automatically if you use per-frame quantization (Pitfall 1's solution covers this too)
- Alternative: increase transition frame count for smoother visual interpolation

**Phase:** Phase 3 (transition implementation)

---

## Pitfall 4: GIF Frame Delay Floor

**What it is:** GIF format specifies frame delays in centiseconds (10ms units). Many browsers enforce a minimum delay of ~20ms (2 centiseconds) regardless of what the GIF specifies. Setting delay to 0 or 10ms has unpredictable behavior.

**Warning signs:** Fast animations (< 50ms per frame) play at unexpected speeds in different browsers.

**Prevention:**
- Never go below 20ms (2 centiseconds) per GIF frame
- For crossfade transitions at 12fps: each transition tick = 83ms (well above the floor)
- Document minimum frame duration in the UI slider (e.g. 200ms minimum recommended)

**Phase:** Phase 2 (GIF encoder setup)

---

## Pitfall 5: Memory Exhaustion with Large Screenshots

**What it is:** Modern design screenshots are often 2x/3x retina resolution (2560×1600px or larger). Loading 10 of these as `ImageBitmap` objects simultaneously can exhaust browser memory (each is ~16MB uncompressed in GPU memory).

**Warning signs:** Browser tab crashes; encoding silently fails; `createImageBitmap()` throws.

**Prevention:**
- Call `imageBitmap.close()` immediately after each frame is rendered to the GIF encoder — frees GPU memory
- For preview thumbnails: render to small canvas (100×70px) and keep only the small canvas, not the full bitmap
- Warn users if total uncompressed size exceeds a threshold (e.g. > 500MB)
- Scale down to output resolution at upload time, not at encode time (reduces working set)

**Phase:** Phase 1 (image loading pipeline)

---

## Pitfall 6: Output File Size Shock

**What it is:** A 10-frame 1200×900 GIF at 12fps with crossfades can easily reach 20-40MB. Designers who expect a "small file for the web" are surprised and can't use the output.

**Warning signs:** Users report GIF is too large to upload to portfolio sites; Behance rejects uploads.

**Prevention:**
- Show estimated file size before export (calculate from frame count × resolution × compression estimate)
- Provide a "Optimize for web" option that reduces resolution to 800×600 and increases dithering quality
- Document typical file sizes in the UI: "1200×900, 10 frames ≈ 8-15 MB"
- The primary lever for file size is output resolution — make this obvious in the UI

**Phase:** Phase 2 (export panel)

---

## Pitfall 7: Canvas CORS Taint

**What it is:** If any image is loaded from an external URL (rather than a local file), the canvas becomes "tainted" and `getImageData()` throws a SecurityError. The entire GIF encoding pipeline breaks silently.

**Warning signs:** Export fails with a security error in console; no user-facing error message.

**Prevention:**
- This tool uploads from disk via `<input type="file">` or drag-and-drop → creates a blob URL → bypasses CORS entirely
- Never accept external image URLs as input
- If external URL support is ever added, require the server to send `Access-Control-Allow-Origin: *` and set `img.crossOrigin = 'anonymous'`

**Phase:** Phase 1 (file input design — avoid the problem entirely by design)

---

## Pitfall 8: Safari OffscreenCanvas Support

**What it is:** `OffscreenCanvas` was added to Safari in 16.4 (released March 2023). Safari 15 and earlier have no support. Some users on older macOS may be on Safari 15.

**Warning signs:** Web Worker encoding fails silently in Safari; OffscreenCanvas is undefined.

**Prevention:**
- Feature-detect before using: `if (typeof OffscreenCanvas !== 'undefined')`
- Fallback: run encoding on main thread with a progress indicator (acceptable if user sees progress)
- Don't block the entire feature — degraded but functional is correct

**Phase:** Phase 2 (when moving encoding to Web Worker)

---

## Pitfall 9: Text Rendering Inconsistency Across Browsers

**What it is:** Canvas `fillText()` uses system fonts. The same font name can render at slightly different sizes, weights, and anti-aliasing across Chrome, Firefox, and Safari. Title card text may look different on different machines.

**Warning signs:** Text position or size looks slightly off in screenshots taken on different browsers.

**Prevention:**
- Use a web font (Google Fonts, bundled font) loaded via `FontFace` API before rendering
- Or use system-safe font stacks (Arial, Helvetica, sans-serif) with explicit `font-size` and `line-height`
- Test text frame rendering in all three major browsers before shipping

**Phase:** Phase 1 (text frame implementation)

---

## Pitfall 10: Frame Reordering State Desync

**What it is:** `@dnd-kit`'s sortable list manages visual order, but the Zustand store manages data order. If the two get out of sync (e.g., optimistic update on drag vs. store update on drop), previews show stale order.

**Warning signs:** Frame strip shows one order; preview plays a different order.

**Prevention:**
- Use Zustand as the single source of truth; derive DnD item list entirely from store
- On drag end: call `store.reorderFrames()` synchronously; let DnD re-render from store
- Don't maintain separate DnD state — the store is the list

**Phase:** Phase 1 (frame strip implementation)

---

## Pitfall 11: Aspect Ratio Distortion at Export

**What it is:** User uploads a 1440×900 screenshot but selects a 1:1 square output preset. The image is stretched/squished rather than letterboxed or cropped.

**Warning signs:** Exported GIF shows distorted screenshots; designers immediately notice.

**Prevention:**
- When rendering at a different aspect ratio, letterbox (add background padding bars) by default
- Offer crop as an option (center crop is usually correct for UI screenshots)
- Never stretch — aspect ratio distortion is visually obvious and unacceptable for portfolio work

**Phase:** Phase 1 (canvas renderer — establish the letterbox rule early)

---

## Pitfall 12: Blob URL Memory Leaks

**What it is:** Every `URL.createObjectURL()` call creates a blob URL that holds a reference to the file in memory. If `URL.revokeObjectURL()` is never called, the file stays in memory for the browser session.

**Warning signs:** Memory usage grows as user uploads many images; tab eventually slows down.

**Prevention:**
- Store the `File` object and `ImageBitmap`, not the blob URL
- If blob URLs are created for thumbnail `<img>` tags, revoke them in `useEffect` cleanup
- Run `bitmap.close()` when frames are deleted from the store

**Phase:** Phase 1 (image loading — establish cleanup pattern early)

---

## Priority Summary

| # | Pitfall | Severity | Phase to Address |
|---|---------|----------|-----------------|
| 1 | Color banding on UI screenshots | High | Phase 1 |
| 2 | Main thread freeze during encoding | High | Phase 2 |
| 5 | Memory exhaustion with large images | High | Phase 1 |
| 11 | Aspect ratio distortion | High | Phase 1 |
| 7 | Canvas CORS taint | Medium | Phase 1 (by design) |
| 12 | Blob URL memory leaks | Medium | Phase 1 |
| 3 | Crossfade color artifacts | Medium | Phase 3 |
| 4 | GIF frame delay floor | Medium | Phase 2 |
| 6 | Output file size shock | Medium | Phase 2 |
| 8 | Safari OffscreenCanvas | Medium | Phase 2 |
| 9 | Text rendering inconsistency | Low-Med | Phase 1 |
| 10 | Frame reordering state desync | Low-Med | Phase 1 |
