import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Regenerate after changing a foreground. Keep the alpha canvas aligned with
// its full-resolution image; these small previews are embedded in server HTML.
const source = new URL("../assets/section-banners/", import.meta.url);
const previews = {};
for (const section of ["projects", "writing", "reading", "music", "games", "hobbies"]) {
  const buffer = await sharp(fileURLToPath(new URL(`${section}.webp`, source)))
    .resize({ width: 324, withoutEnlargement: true })
    .webp({ quality: 70, alphaQuality: 80, effort: 6 })
    .toBuffer();
  previews[section] = `data:image/webp;base64,${buffer.toString("base64")}`;
}
await writeFile(new URL("../lib/section-banner-previews.json", import.meta.url), `${JSON.stringify(previews, null, 2)}\n`);
