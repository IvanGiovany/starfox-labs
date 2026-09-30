import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { site } from "./site";

// Link-preview images (Open Graph / X cards), drawn from JSX by next/og.
// One layout for every page: the site name top-left, a big serif title, a
// muted line underneath, on warm near-black with a soft UQ-purple glow.
// next/og only supports a subset of CSS (flexbox, no grid), and needs font
// files it can read, so the fonts live in assets/fonts (SIL Open Font License).

export const ogSize = { width: 1200, height: 630 };

// Reading files counts as uncached work under Cache Components, which would
// make every image route render on each request (and be sent as no-store).
// Caching the font loading lets the images themselves be prerendered.
async function loadFonts() {
  "use cache";
  cacheLife("max");
  const dir = join(process.cwd(), "assets/fonts");
  // ArrayBuffer: accepted by next/og and storable in the "use cache" cache.
  const read = async (file: string) => new Uint8Array(await readFile(join(dir, file))).buffer;
  return Promise.all([read("Newsreader-SemiBold.ttf"), read("Newsreader-Italic.ttf"), read("Inter-Medium.ttf")]);
}

const colors = {
  bg: "#1c1b1a",
  fg: "#ede6db",
  muted: "#a39a8e",
  accent: "#c3a6e0",
};

type OgImageProps = {
  /** Big serif line: an article title, or the site name. */
  title: string;
  /** Italic line under the title: date and reading time, or a tagline. */
  subtitle?: string;
  /** Small text in the top-left, after the site name, e.g. "Writing". */
  section?: string;
};

/** Long titles get smaller type so they still fit in three lines. */
function titleSize(title: string) {
  if (title.length <= 28) return 104;
  if (title.length <= 52) return 84;
  return 68;
}

export async function ogImage({ title, subtitle, section }: OgImageProps) {
  const [serif, serifItalic, sans] = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: colors.bg,
          // The one accent: a soft purple light from the bottom-right corner.
          backgroundImage: "radial-gradient(circle at 100% 100%, rgba(150,95,205,0.5) 0%, rgba(81,36,122,0.3) 32%, rgba(28,27,26,0) 68%)",
          color: colors.fg,
        }}
      >
        {/* Site name top-left, unless the title already is the site name. */}
        <div style={{ display: "flex", fontFamily: "Inter", fontSize: 28, color: colors.muted }}>
          {title !== site.name && <span style={{ color: colors.fg }}>{site.name}</span>}
          {section && <span style={{ marginLeft: 14 }}>/ {section}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Newsreader",
              fontWeight: 600,
              fontSize: titleSize(title),
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontFamily: "Newsreader",
                fontStyle: "italic",
                fontSize: 34,
                color: colors.muted,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontFamily: "Inter", fontSize: 24, color: colors.accent }}>
          {site.url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Newsreader", data: serif, weight: 600, style: "normal" },
        { name: "Newsreader", data: serifItalic, weight: 400, style: "italic" },
        { name: "Inter", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
