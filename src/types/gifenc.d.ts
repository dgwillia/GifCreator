// Type declarations for gifenc — no official @types package available.
// Based on gifenc v1.0.3 API (https://github.com/mattdesl/gifenc).

declare module 'gifenc' {
  export interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }

  export interface WriteFrameOptions {
    palette?: Uint8Array;
    delay?: number;
    repeat?: number;
    transparent?: number;
    colorDepth?: number;
    first?: boolean;
    dispose?: number;
  }

  export interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    buffer: ArrayBuffer;
    writeHeader(): void;
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: WriteFrameOptions,
    ): void;
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;

  export function quantize(data: Uint8ClampedArray, maxColors: number, opts?: object): Uint8Array;

  export function applyPalette(data: Uint8ClampedArray, palette: Uint8Array, format?: string): Uint8Array;

  export function nearestColorIndex(palette: Uint8Array, r: number, g: number, b: number, a?: number): number;

  export function nearestColor(palette: Uint8Array, r: number, g: number, b: number, a?: number): [number, number, number];

  export function prequantize(data: Uint8ClampedArray, opts?: object): void;

  export function snapColorsToPalette(palette: Uint8Array, data: Uint8ClampedArray, opts?: object): void;
}
