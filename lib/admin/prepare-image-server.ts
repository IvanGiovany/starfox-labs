import "server-only";
import sharp from "sharp";
import { checkInputType, IMAGE_RULES, ImageError, type ImageUse } from "./image-rules";

// The server's version of lib/admin/prepare-image.ts, for images imported
// from a URL (the browser can't read most other sites' images because of
// CORS). Same rules from image-rules.ts: EXIF orientation applied, scaled to
// fit (never enlarged), WebP, and no metadata. sharp drops all metadata
// (EXIF, GPS, XMP) unless asked to keep it.

// What sharp calls each format we accept. AVIF is a kind of HEIF.
const FORMAT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export type ServerPreparedImage = { bytes: Buffer; width: number; height: number; type: "image/webp"; extension: "webp" };

export async function prepareImageOnServer(input: Buffer, use: ImageUse): Promise<ServerPreparedImage> {
  // Huge pixel counts are how "decompression bomb" files exhaust memory; 100 MP
  // is far above any real photo (a 50 MP camera makes 8688 × 5792).
  const image = sharp(input, { limitInputPixels: 100_000_000, failOn: "error" });

  let format: string | undefined;
  let compression: string | undefined;
  try {
    ({ format, compression } = await image.metadata());
  } catch {
    throw new ImageError("That file isn't an image we can read.");
  }
  // Decide by the file's actual contents, not by what the website claimed it was.
  const type =
    format === "heif" ? (compression === "av1" ? "image/avif" : "image/heic") : (FORMAT_TYPES[format ?? ""] ?? `image/${format}`);
  checkInputType(type);

  const max = IMAGE_RULES.maxEdge[use];
  try {
    const { data, info } = await image
      .rotate() // apply the EXIF orientation
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: Math.round(IMAGE_RULES.quality * 100) })
      .toBuffer({ resolveWithObject: true });

    if (data.length > IMAGE_RULES.maxUploadBytes) {
      throw new ImageError("This image is still over 5 MB after shrinking it. Try a simpler image.");
    }
    return { bytes: data, width: info.width, height: info.height, type: "image/webp", extension: "webp" };
  } catch (error) {
    if (error instanceof ImageError) throw error;
    throw new ImageError("Couldn't process that image. The file may be damaged.");
  }
}
