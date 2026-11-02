# Section banner artwork

Generated Jujutsu Kaisen fan art, made with built-in ImageGen for the six section headers. Each card uses two independently animated image planes:

| Section | Character | Foreground (alpha) | Clean background |
| --- | --- | --- | --- |
| Projects | Toji Fushiguro | `projects.webp` | `projects-back.webp` |
| Writing | Kento Nanami | `writing.webp` | `writing-back.webp` |
| Reading | Ryomen Sukuna | `reading.webp` | `reading-back.webp` |
| Music | Satoru Gojo | `music.webp` | `music-back.webp` |
| Games | Yuta Okkotsu and cursed Rika | `games.webp` | `games-back.webp` |
| Hobbies | Mahito | `hobbies.webp` | `hobbies-back.webp` |

Every image has the same **2172 × 724** canvas. Foregrounds retain transparency and their original canvas; backgrounds contain no characters. Keep those canvases aligned when replacing a layer. Masters were generated at native resolution and converted to near-lossless WebP; Next.js supplies responsive delivery sizes.

After the sharpness feedback, the Games and Hobbies foregrounds were refined with ImageGen and saved as **lossless WebP** at their native 2172 × 724 resolution. Their composition and alpha canvas remain aligned to the same backgrounds. No upscaling is presented as new detail. The detail-refinement prompts and prior versions are retained in `banner-collaboration` outside the repository. Banner delivery uses explicit quality 95; other site images retain their existing setting.

Transparent loading previews live in `lib/section-banner-previews.json`: 324 × 108 WebP derivatives, embedded only in the section page's server HTML. After replacing a foreground, run `node scripts/generate-banner-previews.mjs` to regenerate them. The full-resolution images stay unchanged.

The visual direction takes inspiration from the graphic compositions and inked colour planes of [Marvel Rivals nameplates](https://marvelrivals.fandom.com/wiki/Nameplates). Character design references came from the [official Jujutsu Kaisen character gallery](https://jujutsukaisen.jp/character/index_1st.php), [Toji's official design](https://jujutsukaisen.jp/character/index_2nd.php), [Yuta's official gallery](https://jujutsukaisen.jp/character/), and the [official Rika announcement](https://jujutsukaisen-movie.jp/news/2021_1020.html).

Jujutsu Kaisen characters were created by Gege Akutami. Prompt records, reference files, native master paths, and the asset catalog are retained in the workspace's `banner-collaboration` directory. Runtime assets are all contained in this folder.
