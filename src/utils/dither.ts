// src/utils/dither.ts
// Floyd-Steinberg error diffusion dithering for indexed-color GIF output.
// Called AFTER quantize() builds the palette, BEFORE applyPalette() maps to indices.
// Source: https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering

function nearestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: Uint8Array,
): [number, number, number] {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i += 3) {
    const dr = r - palette[i];
    const dg = g - palette[i + 1];
    const db = b - palette[i + 2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return [palette[best], palette[best + 1], palette[best + 2]];
}

export function floydSteinberg(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Uint8Array,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(rgba); // work on a copy

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldR = data[i], oldG = data[i + 1], oldB = data[i + 2];
      const [newR, newG, newB] = nearestPaletteColor(oldR, oldG, oldB, palette);

      data[i]     = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      // Right neighbor (7/16)
      if (x + 1 < width) {
        const j = i + 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + ((errR * 7) >> 4)));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + ((errG * 7) >> 4)));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + ((errB * 7) >> 4)));
      }
      // Bottom-left (3/16)
      if (y + 1 < height && x - 1 >= 0) {
        const j = ((y + 1) * width + (x - 1)) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + ((errR * 3) >> 4)));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + ((errG * 3) >> 4)));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + ((errB * 3) >> 4)));
      }
      // Bottom (5/16)
      if (y + 1 < height) {
        const j = ((y + 1) * width + x) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + ((errR * 5) >> 4)));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + ((errG * 5) >> 4)));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + ((errB * 5) >> 4)));
      }
      // Bottom-right (1/16)
      if (y + 1 < height && x + 1 < width) {
        const j = ((y + 1) * width + (x + 1)) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + ((errR * 1) >> 4)));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + ((errG * 1) >> 4)));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + ((errB * 1) >> 4)));
      }
    }
  }

  return data;
}
