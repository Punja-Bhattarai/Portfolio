/**
 * Client-side image compression BEFORE upload.
 * Keeps payloads under the 4.5 MB serverless body limit and produces
 * an optimized thumbnail — no server-side image library needed.
 */

const MAX_DIMENSION = 2560;
const THUMB_DIMENSION = 800;
const TARGET_BYTES = 3.6 * 1024 * 1024;

export interface ProcessedImage {
  original: Blob;
  thumb: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      type,
      quality
    )
  );
}

async function drawScaled(
  img: HTMLImageElement,
  maxDim: number,
  type: string,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  let blob = await canvasToBlob(canvas, type, quality);
  // webp unsupported in this browser? fallback to jpeg
  if (blob.type !== type && type === "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return { blob, width, height };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("UNSUPPORTED_TYPE");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");

  const img = await loadImage(file);

  // Compress the main image, stepping down until it fits the limit.
  let dims = [MAX_DIMENSION, MAX_DIMENSION];
  let qualities = [0.85, 0.78, 0.7];
  let original: Blob | null = null;
  let width = 0;
  let height = 0;

  outer: for (const dim of dims) {
    for (const q of qualities) {
      const r = await drawScaled(img, dim, "image/webp", q);
      original = r.blob;
      width = r.width;
      height = r.height;
      if (original.size <= TARGET_BYTES) break outer;
    }
  }
  if (!original) throw new Error("COMPRESSION_FAILED");

  // If still too big after all steps, halve dimensions once more.
  if (original.size > 4.2 * 1024 * 1024) {
    const r = await drawScaled(img, 1280, "image/webp", 0.6);
    original = r.blob;
    width = r.width;
    height = r.height;
  }

  const thumbResult = await drawScaled(img, THUMB_DIMENSION, "image/webp", 0.8);

  return {
    original,
    thumb: thumbResult.blob,
    width,
    height,
    previewUrl: URL.createObjectURL(original),
  };
}
