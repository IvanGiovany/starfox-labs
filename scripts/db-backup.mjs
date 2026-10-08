// Backs up every content row to a JSON file, and puts missing rows back.
// Uses the service key, so it reads drafts too (RLS doesn't apply to it).
//
//   npm run db:backup                               → backups/<date-time>.json
//                                                     (and deletes ones over 30 days old)
//   npm run db:restore -- backups/<file>.json        list the rows that are missing now
//   npm run db:restore -- backups/<file>.json --apply   add those rows back
//
// Restore only ever ADDS rows whose id is missing. It never changes or deletes
// a row that exists, so running it can't make things worse. Rows only: files
// in Storage aren't backed up (nothing here deletes them; see CLAUDE.md).
// `supabase db dump` would be the usual tool, but it needs Docker.
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (never committed). The
// `backups/` folder is git-ignored: backups include drafts.

import { createClient } from "@supabase/supabase-js";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";

// Restore order: articles before the items that link to them, profiles before
// the comments that point at them. New content tables go here (and get the
// truncate guard, see 20261007130000).
const TABLES = [
  "posts", "projects", "books", "tracks", "games", "hobby_items", "profiles", "comments",
  "newsletter_subscribers", "newsletter_digests",
];
// Exposed through the API but not backed up: `admins` is one row, added again
// by hand in the SQL editor; `post_items` is a view.
const NOT_BACKED_UP = ["admins", "post_items"];
const PAGE = 1000;
/** How long backups are kept (see /privacy). */
const KEEP_DAYS = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const project = new URL(url).host;

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Every row of a table (or just `columns`), in id order, a page at a time. */
async function allRows(table, columns = "*") {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = await must(db.from(table).select(columns).order("id").range(from, from + PAGE - 1), `read ${table}`);
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/** Warns about tables the API exposes that this script doesn't know about. */
async function warnAboutNewTables() {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, { headers: { apikey: key } });
  if (!res.ok) return console.warn(`(couldn't list the API's tables: ${res.status})`);
  const names = Object.keys((await res.json()).definitions ?? {});
  const unknown = names.filter((n) => !TABLES.includes(n) && !NOT_BACKED_UP.includes(n));
  if (unknown.length) console.warn(`WARNING: not backed up (add to TABLES in scripts/db-backup.mjs?): ${unknown.join(", ")}`);
}

async function backup() {
  await warnAboutNewTables();
  const tables = {};
  for (const table of TABLES) {
    try {
      tables[table] = await allRows(table);
    } catch (error) {
      // A table listed before its migration is applied (back up first, then
      // migrate) mustn't stop the backup of everything else.
      if (!/does not exist|schema cache/i.test(error.message)) throw error;
      console.warn(`${table}: not in the database yet, skipped`);
      continue;
    }
    console.log(`${table}: ${tables[table].length}`);
  }
  const createdAt = new Date().toISOString();
  const file = `backups/${createdAt.slice(0, 19).replace(/:/g, "-")}.json`;
  await mkdir("backups", { recursive: true });
  await writeFile(file, JSON.stringify({ project, createdAt, tables }, null, 2) + "\n");
  console.log(`saved ${file}`);
  await pruneOldBackups();
}

/**
 * Deletes backups older than KEEP_DAYS (the privacy page promises at most 30
 * days: backups hold profiles, so a deleted account mustn't live on longer).
 * Only files this script named (backups/<date-time>.json), judged by the date
 * in the name.
 */
async function pruneOldBackups(now = Date.now()) {
  const removed = [];
  for (const name of await readdir("backups")) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.json$/.exec(name);
    if (!match) continue;
    const saved = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`);
    if (Number.isFinite(saved) && now - saved > KEEP_DAYS * 24 * 60 * 60 * 1000) {
      await unlink(`backups/${name}`);
      removed.push(name);
    }
  }
  if (removed.length) console.log(`deleted ${removed.length} backup(s) older than ${KEEP_DAYS} days: ${removed.join(", ")}`);
}

/** How a row is named in the restore's list: title, username, or the start of a comment. */
function label(row) {
  if (row.title) return row.title;
  if (row.username) return `@${row.username}`;
  if (row.email) return row.email;
  if (row.covers_until) return `digest until ${row.covers_until}`;
  if (typeof row.body === "string") return row.body ? JSON.stringify(row.body.slice(0, 40)) : "(deleted comment)";
  return "";
}

async function restore(file, apply) {
  if (!file) throw new Error("Usage: npm run db:restore -- backups/<file>.json [--apply]");
  const saved = JSON.parse(await readFile(file, "utf8"));
  if (saved.project !== project) throw new Error(`That backup is from ${saved.project}, not ${project}.`);
  console.log(`backup from ${saved.createdAt}${apply ? "" : " (listing only; add --apply to restore)"}`);

  let failed = 0;
  for (const table of TABLES) {
    const rows = saved.tables[table] ?? [];
    const existing = new Set((await allRows(table, "id")).map((r) => r.id));
    // Top-level comments before replies, so a reply's comment is always there.
    const missing = rows.filter((r) => !existing.has(r.id)).sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
    console.log(`${table}: ${missing.length} missing of ${rows.length}`);
    for (const r of missing) console.log(`  ${r.id}  ${label(r)}`);
    if (!apply || !missing.length) continue;

    // Plain inserts: a row that exists by now is an error, never overwritten.
    for (let i = 0; i < missing.length; i += 100) {
      const batch = missing.slice(i, i + 100);
      const { error } = await db.from(table).insert(batch);
      if (!error) continue;
      // One bad row fails the whole batch: retry one by one to restore the rest.
      for (const row of batch) {
        const { error: rowError } = await db.from(table).insert(row);
        if (rowError) {
          failed++;
          console.error(`  FAILED ${row.id} (${label(row)}): ${rowError.message}`);
        }
      }
    }
  }
  if (apply) console.log(failed ? `done, ${failed} row${failed === 1 ? "" : "s"} failed (above)` : "done: every missing row added back");
  if (failed) process.exitCode = 1;
}

const [command, file, flag] = process.argv.slice(2);
if (command === "backup") await backup();
else if (command === "restore") await restore(file, flag === "--apply");
else throw new Error("Usage: db-backup.mjs backup | restore <file> [--apply]");
