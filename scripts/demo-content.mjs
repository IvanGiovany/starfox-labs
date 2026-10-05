// Demo content for showing the site: articles, projects, books, songs, games
// and hobby items, written straight to the database with the service key.
// Every demo row's id starts with "de300000-" and every demo file sits in a
// "demo/" folder inside its section's folder in the media bucket, so all of it
// can be removed in one go.
//
//   npm run demo:remove                        remove every demo row and file
//   node --env-file=.env.local scripts/demo-content.mjs add <assets-dir>
//
// "add" needs the generated assets (screenshots, covers, snippets, cut-outs),
// made once for the 2026-10-06 demo; it replaces any earlier demo first.
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (never committed).
// Images get the same treatment as the admin's URL import: EXIF orientation,
// longest edge 2400 px (covers 1200 px), WebP at 85%, no metadata.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { ARTICLES, BOOKS, GAMES, HOBBIES, PROJECTS, SONGS } from "./demo-content-data.mjs";

const PREFIX = "de300000-";
const FOLDERS = ["writing", "projects", "books", "music", "games", "hobbies"];
const BUCKET = "media";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const publicUrl = (path) => `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;

/** "de300000-0000-4000-8000-000000000101" */
export const demoId = (n) => `${PREFIX}0000-4000-8000-${String(n).padStart(12, "0")}`;

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function remove() {
  // Items first: the database refuses to delete an article a published song or game needs.
  for (const table of ["projects", "books", "tracks", "games", "hobby_items", "posts"]) {
    // uuid columns can't use LIKE: every id from de300000-0000-… up to (not including) de300001-0000-….
    const rows = await must(
      db.from(table).delete().gte("id", "de300000-0000-0000-0000-000000000000").lt("id", "de300001-0000-0000-0000-000000000000").select("id"),
      `delete ${table}`,
    );
    console.log(`removed ${rows.length} from ${table}`);
  }
  for (const folder of FOLDERS) {
    const files = await must(db.storage.from(BUCKET).list(`${folder}/demo`, { limit: 1000 }), `list ${folder}/demo`);
    const paths = files.filter((f) => f.id).map((f) => `${folder}/demo/${f.name}`);
    if (paths.length) await must(db.storage.from(BUCKET).remove(paths), `remove ${folder}/demo`);
    console.log(`removed ${paths.length} files from ${folder}/demo`);
  }
}

// ── images and audio ─────────────────────────────────────────────────────────

/** The admin's image rules (lib/admin/image-rules.ts): WebP, never enlarged. */
async function prepare(input, maxEdge, crop) {
  let image = sharp(input, { limitInputPixels: 100_000_000 }).rotate();
  if (crop) image = sharp(await image.extract(crop).toBuffer());
  const { data, info } = await image
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function download(src) {
  const res = await fetch(src, { headers: { "user-agent": "StarfoxLabs/1.0 (starfoxlabs.org)" } });
  if (!res.ok) throw new Error(`download ${src}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const assetsDir = process.argv[3];
const uploaded = new Map();

/**
 * Upload one image: `from` is an Unsplash photo id, an Open Library ISBN
 * ("isbn:…") or a generated file ("file:…" in the assets folder).
 * Returns its storage path, public URL (with #WxH, like the editor) and size.
 */
async function image(folder, name, from, { maxEdge = 2400, crop } = {}) {
  const cacheKey = `${folder}/${name}`;
  if (uploaded.has(cacheKey)) return uploaded.get(cacheKey);
  const input = from.startsWith("file:")
    ? await readFile(join(assetsDir, from.slice(5)))
    : from.startsWith("isbn:")
      ? await download(`https://covers.openlibrary.org/b/isbn/${from.slice(5)}-L.jpg?default=false`)
      : await download(`https://images.unsplash.com/${from}?w=${maxEdge}&q=85&fm=jpg`);
  const { data, width, height } = await prepare(input, maxEdge, crop);
  const path = `${folder}/demo/${name}.webp`;
  await must(db.storage.from(BUCKET).upload(path, data, { contentType: "image/webp", upsert: true }), `upload ${path}`);
  const result = { path, url: `${publicUrl(path)}#${width}x${height}`, width, height };
  uploaded.set(cacheKey, result);
  console.log(`  ${path} ${width}×${height} ${(data.length / 1024).toFixed(0)} KB`);
  return result;
}

async function audio(name) {
  const data = await readFile(join(assetsDir, `${name}.mp3`));
  const path = `music/demo/${name}.mp3`;
  await must(db.storage.from(BUCKET).upload(path, data, { contentType: "audio/mpeg", upsert: true }), `upload ${path}`);
  console.log(`  ${path} ${(data.length / 1024).toFixed(0)} KB`);
  return path;
}

// ── rows ─────────────────────────────────────────────────────────────────────

async function add() {
  if (!assetsDir) throw new Error("Usage: demo-content.mjs add <assets-dir>");
  await remove();

  console.log("articles");
  const postIds = {};
  for (const [i, a] of ARTICLES.entries()) {
    // Body images: "![alt](img:<from> "caption")" → our own copy's URL.
    let body = a.body;
    for (const [match, alt, from, rest] of a.body.matchAll(/!\[([^\]]*)\]\(img:([^\s)]+)(\s+"[^"]*")?\)/g)) {
      const img = await image("writing", `${a.slug}-${alt.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`, from);
      body = body.replace(match, `![${alt}](${img.url}${rest ?? ""})`);
    }
    const cover = a.cover ? (await image("writing", `${a.slug}-cover`, a.cover, { maxEdge: 1200 })).url : null;
    postIds[a.slug] = demoId(101 + i);
    await must(
      db.from("posts").insert({
        id: postIds[a.slug],
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        body_md: body.trim() + "\n",
        tags: a.tags,
        cover_image_url: cover,
        youtube_url: a.youtube ?? null,
        status: "published",
        published_at: a.date,
      }),
      `post ${a.slug}`,
    );
  }

  const common = (item, i, base, folder, img) => ({
    id: demoId(base + i),
    title: item.title,
    status: "published",
    post_id: item.article ? postIds[item.article] : null,
    image_path: img?.path ?? null,
    image_alt: item.imageAlt ?? null,
    badges: item.badges ?? [],
    show_on_home: item.home ?? false,
    card_size: item.wide ? "wide" : "small",
    sort_order: i + 1,
  });

  console.log("projects");
  for (const [i, p] of PROJECTS.entries()) {
    const img = await image("projects", p.key, p.image, { crop: p.crop });
    await must(db.from("projects").insert({ ...common(p, i, 201, "projects", img), summary: p.summary, url: p.url ?? null, repo_url: p.repo ?? null, stack: p.stack, started_on: p.startedOn ?? null }), `project ${p.title}`);
  }

  console.log("books");
  for (const [i, b] of BOOKS.entries()) {
    const img = await image("books", b.key, `isbn:${b.isbn}`, { maxEdge: 1200 });
    await must(
      db.from("books").insert({
        ...common({ ...b, imageAlt: b.imageAlt ?? `Cover of ${b.title}` }, i, 301, "books", img),
        author: b.author,
        reading_status: b.status,
        started_on: b.startedOn ?? null,
        finished_on: b.finishedOn ?? null,
        rating: b.rating ?? null,
        isbn: b.isbn,
        published_year: b.year ?? null,
        page_count: b.pages ?? null,
        note: b.note ?? null,
      }),
      `book ${b.title}`,
    );
  }

  console.log("music");
  for (const [i, s] of SONGS.entries()) {
    const img = await image("music", `${s.key}-cover`, `file:${s.key}-cover.png`, { maxEdge: 1200 });
    const snippet = s.snippet ? await audio(s.key) : null;
    await must(
      db.from("tracks").insert({
        ...common({ ...s, imageAlt: s.imageAlt ?? `Cover art for ${s.title}` }, i, 401, "music", img),
        released_on: s.releasedOn ?? null,
        in_progress: s.inProgress ?? false,
        snippet_path: snippet,
        snippet_seconds: snippet ? s.snippetSeconds : null,
        full_track_url: null,
        links: {},
        note: s.note ?? null,
      }),
      `song ${s.title}`,
    );
  }

  console.log("games");
  for (const [i, g] of GAMES.entries()) {
    const img = await image("games", g.key, g.image);
    await must(
      db.from("games").insert({ ...common(g, i, 501, "games", img), platform: g.platform, hours_played: g.hours, rating: g.rating ?? null, play_status: g.status, finished_on: g.finishedOn ?? null }),
      `game ${g.title}`,
    );
  }

  console.log("hobbies");
  for (const [i, h] of HOBBIES.entries()) {
    const img = h.image ? await image("hobbies", h.key, h.image, { maxEdge: h.style === "cutout" ? 1200 : 2400 }) : null;
    await must(
      db.from("hobby_items").insert({ ...common(h, i, 601, "hobbies", img), category: h.category, subtitle: h.subtitle ?? null, note: h.note ?? null, image_style: h.style, caption: h.caption ?? null, url: h.url ?? null }),
      `hobby ${h.title}`,
    );
  }
  console.log("done");
}

const command = process.argv[2];
if (command === "remove") await remove();
else if (command === "add") await add();
else console.log("Usage: demo-content.mjs remove | add <assets-dir>");
