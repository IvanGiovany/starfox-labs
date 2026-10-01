import { checkInputType, fitWithin, IMAGE_RULES, ImageError, type ImageUse } from "./image-rules";

// Prepares a pasted or dropped image in the browser before it's uploaded:
//   - turned the right way up (the photo's EXIF orientation is applied)
//   - scaled down to the size for its use (never enlarged)
//   - re-encoded as WebP, or JPEG where the browser can't encode WebP
//   - stripped of all metadata, GPS location included: drawing onto a canvas
//     keeps only the pixels
// Images imported from a URL get the same treatment on the server instead.

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  type: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("This browser can't process images. Try another browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/**
 * Scales in steps of at most half. A single big reduction (say 6000 → 1200 px)
 * skips most source pixels, which makes text in screenshots look jagged.
 */
function scaleDown(source: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let w = source.width;
  let h = source.height;
  while (w / 2 >= width && h / 2 >= height) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const step = canvasOf(w, h);
    context(step).drawImage(current, 0, 0, w, h);
    current = step;
  }
  const result = canvasOf(width, height);
  context(result).drawImage(current, 0, 0, width, height);
  return result;
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, IMAGE_RULES.quality));
}

/** WebP if the browser can encode it (it quietly returns PNG otherwise), else JPEG on white. */
async function encode(canvas: HTMLCanvasElement): Promise<Pick<PreparedImage, "blob" | "type" | "extension">> {
  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp", extension: "webp" };

  // JPEG has no transparency: put see-through areas (PNG screenshots) on white, not black.
  const flat = canvasOf(canvas.width, canvas.height);
  const ctx = context(flat);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  const jpeg = await toBlob(flat, "image/jpeg");
  if (!jpeg) throw new ImageError("Couldn't convert this image. Try another one.");
  return { blob: jpeg, type: "image/jpeg", extension: "jpg" };
}

export async function prepareImage(file: Blob, use: ImageUse): Promise<PreparedImage> {
  checkInputType(file.type);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("Couldn't read this image. The file may be damaged.");
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, use);
    const encoded = await encode(scaleDown(bitmap, size.width, size.height));
    if (encoded.blob.size > IMAGE_RULES.maxUploadBytes) {
      throw new ImageError("This image is still over 5 MB after shrinking it. Try a simpler image.");
    }
    return { ...encoded, ...size };
  } finally {
    bitmap.close();
  }
}
