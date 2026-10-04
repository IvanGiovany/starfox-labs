# Build log

What has been built, step by step: where things live, the decisions made along the
way, and how each step was checked. `CLAUDE.md` holds the rules and the current
state; this file holds the detail. Newest phase last.

## Phase 1 — Foundation (done, on `main`)
1. **Design system:** warm light/dark tokens via `light-dark()`, UQ purple, Newsreader +
   Inter, paper grain, `prose` styles, flash-free theme script (Next 16 inline-script
   pattern; since 2.4b it goes through `components/inline-script.tsx`).
2. **Layout shell:** header tab bar, footer, theme toggle.
3. **Supabase `posts` table + RLS:** the public reads published posts only (verified with
   the publishable key: 7 visible, the draft hidden, writes blocked). Sample seed posts.
   `lib/posts.ts` data layer with `"use cache"` + `cacheTag("posts")`.
4. **Home:** chester-style 4-column grid, badges, status cards; the page widened to 1460 px.
5. **Writing page (`/writing`):** section header, card grid, search, tag filters, load
   more, lazily loaded body search index.
6. **Article page (`/writing/[slug]`):** reading layout; markdown via `lib/markdown.tsx`
   (Shiki code blocks with a copy button, highlighted lines/words, line numbers,
   footnotes); click-to-play YouTube; older/newer links; comments placeholder; one
   fade-in; page metadata, canonical URLs, generated link-preview images (`lib/og.tsx`);
   friendly 404s (`app/not-found.tsx`, `app/writing/[slug]/not-found.tsx`). `WRITING.md`
   lists every markdown feature.
7. **README** with screenshots (`docs/screenshots/`), architecture notes and setup steps.

## Phase 2 — Admin + content model (done 2026-10-04)

### 2.1 Admin sign-in (done, tested on laptop)
Email code + link via Resend SMTP. `signInWithOtp` with `shouldCreateUser: false` on the
admin form only. `admins` table + `public.is_admin()`; `requireAdmin()` in `lib/auth.ts`.

### 2.2 Content schema (done)
Item tables, rules, RLS, the `home_feed` and `post_items` views, the `media` bucket,
sample section data (`supabase/seed-sections.sql`), generated types. Visitor-side checks
pass with the publishable key.

### 2.3 `/admin` shell + Writing editor (done, all parts tested by Ivan)
- **3a:** admin tabs; the Writing list (search, All/Drafts/Published, one-tap Publish /
  Unpublish / Delete with plain-language errors); placeholders for the other tabs.
- **3b — the editor form** (`/admin/writing/new`, `/admin/writing/[id]`,
  `app/admin/writing/post-editor.tsx`):
  - Rules shared by browser and server: `lib/admin/post-form.ts` (zod schema, `slugify`,
    `normalizeTag`, `firstSentence`, `statusAfter`). `savePost` in
    `app/admin/writing/actions.ts`.
  - Slug follows the title until edited or published; a warning when a live slug changes
    (no redirects yet; see "Still open" in CLAUDE.md).
  - An empty summary is saved as the body's first sentence.
  - Tags: chip input with suggestions (`components/admin/tag-input.tsx`, reused for badges).
  - Body: markdown toolbar + shortcuts (`components/admin/markdown-toolbar.tsx`); the "?"
    button opens WRITING.md in a dialog (`lib/admin/cheat-sheet.ts`; the file is shipped
    with the editor routes via `outputFileTracingIncludes` in `next.config.ts`).
  - Save bar: Save draft / Publish / Update / Unpublish / Save and add another.
  - Safety: an `updated_at` check refuses to overwrite newer saves; unsaved text is backed
    up in localStorage with Restore / Discard (`components/admin/use-local-backup.ts`);
    `beforeunload` warns when closing the tab. A success message ("Saved at …") gives way
    to "Unsaved changes" on the next edit.
- **3c — live preview:**
  - Write / Split / Preview switch; Split only on screens ≥ 1280 px; Write/Split
    remembered per device. Full Preview shows the article at reading width and hides the
    admin bar and tabs (`data-admin-chrome` in `app/admin/layout.tsx`, rule in
    `globals.css`); Esc leaves it.
  - `components/article-view.tsx` draws the article for both the public page and the
    preview. Before/after checks proved the public pages unchanged (rendered HTML of all
    7 sample articles, plus per-element layout at 1440/390 px, light and dark).
  - The renderer is split at the HTML-tree stage: `lib/markdown.tsx` (server-only, Shiki;
    uncached `markdownToHast`, cached `renderMarkdown`) and `lib/markdown-react.tsx`
    (`hastToReact`, runs on server or browser).
  - `POST /admin/writing/preview` (`app/admin/writing/preview/route.ts`) returns the tree
    as JSON (admin only, uncached, max `LIMITS.preview` characters). Browser side:
    `lib/admin/fetch-preview.ts`, `app/admin/writing/live-preview.tsx` (0.3 s debounce,
    cancels superseded requests). A route handler, not a server action, so previews never
    queue in front of Save (Ivan verified: saves start while previews are pending). JSON
    round trip checked: only `undefined` properties drop out, which the React converter
    ignores anyway.
- **3d — images:**
  - Shared rules: `lib/admin/image-rules.ts` (2400 px body, 1200 px cover, WebP at 85%,
    JPEG where WebP can't be encoded, JPEG/PNG/WebP/AVIF in, GIF and SVG refused, 5 MB
    bucket limit). Stored as `media/<folder>/YYYY/MM/<random>.webp`.
  - Files (paste, drop, pick) are prepared in the browser (`lib/admin/prepare-image.ts`:
    EXIF orientation, step-down scaling, re-encode, so all metadata is dropped; tested
    with a rotated photo carrying GPS) and uploaded straight to Storage
    (`lib/admin/upload-image.ts`, `lib/supabase/browser.ts`).
  - Image URLs (Unsplash, Pexels, game art) are imported by the server:
    `POST /admin/media/import` → `lib/admin/fetch-remote-image.ts` (admin + same-origin;
    http(s) on standard ports; public addresses only, checked inside the connection's own
    DNS lookup and on every redirect; 15 s / 25 MB caps; tested against 23 blocked
    tricks) → `lib/admin/prepare-image-server.ts` (`sharp`, same rules) → our own copy.
  - Cover: `components/admin/image-field.tsx` (called `cover-image-field.tsx` before
    2.4a); the schema accepts only our own `media` URLs. Covers are decorative
    (`alt=""`), by Ivan's choice.
  - Body: `components/admin/use-body-images.ts` + `body-image-panel.tsx` (toolbar Image
    button). Placeholders at the cursor become `![alt](url#WxH)`; saving waits for
    uploads. `lib/image-size.ts` carries the size in the URL fragment; the renderer turns
    it into `width`/`height`.
  - Fixed while testing: random ids use `crypto.getRandomValues` (`randomId()`), because
    `crypto.randomUUID` only exists on https/localhost.
- Also fixed in 2.3: admin pages each got their own `<Suspense>` + `requireAdmin()`; the
  article page's intended 404 wait (`instant = false`); the theme script's React warning
  (`components/inline-script.tsx`).

### 2.4 Section forms
Plan: shared item pieces first, then one step per section. Decisions: **Reading is
ordered automatically** (no drag handles); every other section is drag-to-reorder
(`@dnd-kit`); new items go to the top.

#### 4a — shared item pieces + Projects (done, tested by Ivan)
- `lib/media.ts`: bucket folders (`writing`, `projects`, `books`, `music`, `games`,
  `hobbies`), `mediaUrl(path)`, `isMediaPath`, `isOwnMediaUrl`. Uploads and the URL import
  take a whitelisted folder and return the stored **path** (items store paths, articles
  store URLs).
- `lib/admin/items/`:
  - `sections.ts`: table, folder, image size, order, cache tag per section.
  - `item-form.ts`: shared fields and rules (images in the section's own folder; badges
    keep their wording, max 4; http(s) links; real calendar dates), `ItemDefinition`,
    `validateItem`, `SaveItemInput`/`SaveItemResult`/`EditableItem`.
  - `projects.ts`: the Projects definition (schema + publish rule + `toRow`/`fromRow` +
    empty form).
  - `item-errors.ts`: every database rule as a sentence on its field.
  - `save-item.ts`: one save for all sections (admin check, validation, new items at the
    top, no overwriting newer saves, cache refresh).
  - `list-actions.ts`: publish/unpublish, delete, reorder via `reorder_items`.
  - `article-options.ts`, `link-target.ts`, `link-article.ts`: the article picker's data
    and "Write the article".
- UI: `components/admin/item-list.tsx` (search, filters, one-tap actions, drag / ↑↓ /
  keyboard reorder with screen-reader announcements, rolls back if saving fails),
  `item-editor.tsx` (the shared form; each section passes its own fields as children),
  `article-picker.tsx`, `form-field.tsx`, `save-bar.tsx`, `image-field.tsx` (the last three
  shared with the article editor).
- Routes: `app/admin/projects/` (list, `new`, `[id]`, `actions.ts`, `project-form.tsx`).
- "Write the article": the item form saves, then opens
  `/admin/writing/new?for=<section>:<id>`; the article's first save links it back, only if
  the item has no article yet. `post_items` isn't used for the picker because it only
  covers published items.
- Mistake made and fixed: one commit was first made with only a rename because a
  `git add` listed a missing path (see the git note in CLAUDE.md); it was amended before
  pushing.

#### 4b — Reading (done, tested by Ivan)
- `lib/reading.ts` (public, also for the Phase 3 page): statuses, badge labels,
  `compareBooks` (reading, then read newest finished first, then to read newest added
  first; id breaks ties).
- `lib/admin/items/books.ts`: the definition; ISBN cleaning + check-digit validation
  (ISBN-13's check digit can't catch every swap; ISBN-10's can); `withReadingStatus`
  (status changes fill the start/finish date from the admin's **local** day, never
  overwriting; going back to TO READ keeps dates, by Ivan's choice).
- List (`app/admin/reading/`): automatic order, status badges, stars, one-tap "Start
  reading" / "Mark as read" (`setReadingStatus`; the browser sends its local date,
  accepted only if `isPlausibleToday`). The shared list gained optional `stateBadge` +
  `quickStep` (a server action passed from the page), for Games too.
- Form: author, status toggle, dates, `StarRating` (reusable; max 10 for Games), note,
  link, ISBN, year, pages; covers 1200 px, shown whole. The item editor gained `patch()`
  and a `header` slot.
- Open Library: `lib/admin/open-library.ts` (fixed host; User-Agent
  `StarfoxLabs/1.0 (+https://starfoxlabs.org)`, site only by Ivan's choice, no email)
  behind `GET /admin/reading/open-library` (`?q=` search, `?covers=<work>` edition
  covers). `open-library-autofill.tsx`: a pick fills details and copies the cover into
  `media/books/`; "Choose a different cover" shows other editions' covers (English
  first); no cover → a clear message and an empty image. Values the autofill filled are
  replaced or cleared by the next pick, never values Ivan typed or uploaded (a bug found
  in testing: a coverless book kept the previous pick's cover, year and pages).
- **Hydration mismatch (solved 2026-10-01, after 4c part 1):** an `ArticlePicker` option
  `disabled={true}` on the client, no `disabled` in the "server" HTML. Seen twice by Ivan
  (editing a book, then on `/admin/reading/new`). First guess, ties in ordering, was wrong
  (the `id` tie-breakers stay: they're right anyway). Ivan suspected Firefox's form state
  restoration; confirmed and fixed:
  - Rules, tested in Firefox 157 with plain HTML: after a reload, Firefox restores only the
    *enabled* state of a control whose `disabled` changed during the visit, keyed by its
    position in the **original** HTML, onto whatever control has that position in the
    reloaded HTML. It doesn't restore for `no-store` pages; `next dev` sends `no-cache`.
    `autocomplete="off"` on the control or its form stops it. React's diff shows the live
    DOM as "server", and attribute mismatches "won't be patched up": the button stayed
    clickable.
  - Reproduced with the real `ItemEditor`, server-rendered with `react-dom/server`
    (development build) and hydrated: "Write the article" disabled while saving, enabled
    after a failed save; reload; meanwhile the article list changed (a new post, and an
    article linked from a game), so a disabled option took that position. Firefox: the
    option came back enabled, with the exact warning (`+ disabled={true}` /
    `- disabled={null}`). Edge: clean. The HTML differs between loads whenever articles
    change, or after the first save (the URL becomes `/<id>` via `replaceState`, so a
    reload brings the edit page while Firefox applies the `/new` page's state).
  - Harness lessons: a toggle inside one click handler is batched (the DOM never changes),
    so make the save fail asynchronously; accept the "Leave page?" prompt on reload.
  - Fix: `autoComplete="off"` on the item and article editor `<form>`s (covers picker, save
    bar, image/snippet fields, tags, Open Library), and on toggled controls outside forms:
    item list (↑ ↓, publish, delete), article list, login buttons (the inputs keep their
    autofill), the Writing page's search box and Load more. Buttons need
    `types/react-button-autocomplete.d.ts` (React renders the attribute; its types only
    allowed it on inputs and forms). After the fix: Firefox clean, option stays disabled.
  - Side effect, intended: Firefox no longer refills typed text in the editors after a
    reload (React state never had it anyway); the local backup's Restore covers that.

#### 4c — Music, part 1 (done, tested by Ivan: checklist 1–8, laptop Firefox and phone)
Decisions (Ivan): several songs can be in progress ("Now producing" = the top one in the
Music order); cut snippets (part 2) are MP3 at 320 kbps.
- `lib/admin/items/tracks.ts`: the definition. Platform links are separate form fields
  (`spotifyUrl` …) stored together in `links` jsonb (only filled ones; unknown keys
  ignored when loading). Each must be on its service's domain (subdomains and short
  links like `spotify.link`, `youtu.be` count) except Bandcamp (custom domains). Publish
  rule = the database's, one message per missing field (snippet, article); a song in
  progress needs neither.
- `lib/admin/snippet-rules.ts`: one set of numbers (2 MB, 30 s + 0.3 s encoder slack,
  MP3 → `audio/mpeg`, M4A → `audio/mp4`), file checks (name first, then type: systems
  report M4A as `audio/x-m4a`, `audio/mp4` or nothing), `storedSnippetProblem` for the
  server.
- `lib/admin/add-snippet.ts` + `components/admin/snippet-field.tsx`: choose or drop;
  length read by decoding with Web Audio (also proves the browser can play it); upload
  to `media/music/YYYY/MM/<random>.mp3|m4a`; the browser's own `<audio>` as preview (the
  styled player is Phase 3); Replace / Remove; newest pick wins.
- `lib/admin/upload-media.ts`: the Storage upload, now shared by images and snippets.
  `mediaPath()` and `randomId()` moved to `lib/media.ts`.
- `lib/admin/items/check-snippet.ts` + `app/admin/music/actions.ts`: before saving, the
  server asks Storage (`.info()`) about a **new or changed** snippet (exists, audio type
  matches the name, ≤ 2 MB). Unchanged paths aren't checked, which keeps the sample songs
  (whose files don't exist) editable. A missing file arrives as HTTP 400 with Storage
  code `404` / `NoSuchKey` (checked against the live project). Length isn't re-checked
  on the server (would need decoding).
- Item forms wait for uploads: `ImageField` / `SnippetField` report `onBusyChange`; the
  item editor keeps the fields uploading, shows "Uploading the image…" / "Uploading 2
  files…", and refuses Save / Publish / Ctrl+S / "Write the article" with "Wait for the
  upload to finish, then save." Starting an upload clears "Saved at …" (it hid the
  upload status, found in testing). The article editor's **cover** got the same guard
  (body images already had it).
- `ArticlePicker`: on a phone the linked article's buttons now wrap below its title
  (`basis-48`); before, the title was squeezed to one word per line.
- Pages: `app/admin/music/` (list with drag to reorder, `NOW PRODUCING` badge, detail line
  "Sep 30, 2026 · Snippet · No article"; `new`; `[id]`; `track-form.tsx`). Music tab on.
- Tested: tsx (definition 8, snippet rules 5, server check 6 incl. the live "missing"
  case); headless Edge with real MP3s (made with lamejs) and an M4A recorded by the
  browser: snippet field 13, upload waiting 6, Music form 7 (incl. 390 / 1280 px layout,
  light and dark).
- **Ivan's browser checklist** (laptop, then phone):
  1. Music tab → New song: add a cover, upload a real snippet (MP3 and M4A), play it.
  2. Publish without snippet/article → both fields flagged. Tick "Still in progress" →
     publishes with just a title; the list shows `NOW PRODUCING`.
  3. Finish it: snippet + "Write the article" (or pick one) → untick → Update.
  4. Paste a SoundCloud link into the Spotify box → "That isn't a Spotify link."
  5. Tap Publish while a snippet or image is still uploading → asked to wait; then save.
  6. Article editor: tap Save while a new cover is uploading → asked to wait.
  7. Edit the sample song "Night Drive" and save (its snippet file doesn't exist; saving
     other changes must still work). Drag songs to reorder.
  8. Phone: pick a snippet from Files (iPhone: Voice Memos / GarageBand exports are M4A).

#### 4c — fixes after part 1 (done, tested by Ivan, pushed)
Claude re-ran checklist 1–7 in the Playwright window on 2026-10-01 (all pass; mouse drag
untestable there, reorder passed via ↑↓ and keyboard). That run found three small bugs:
- Article editor "Wait for the images…" message and `.gitignore` (`40e6429`, `f57ab8b`).
- **Snippet length** (`a99e3b2`, retested by Ivan 2026-10-02). After a reload, the
  browser-recorded `test-8s.m4a` showed "M4A · 0:00". Cause: the file states two lengths
  (movie header 7.018 s, track header 0.146 s, milliseconds written into a 48 kHz field),
  and Firefox's player trusts the wrong one. Fix: the decoded length is saved at upload in
  `tracks.snippet_seconds` (migration `20261002100000`, applied; additive, nullable) and
  shown before the player's figure; older rows fall back to the player. Files: the
  migration, `lib/database.types.ts`, `lib/admin/items/tracks.ts`,
  `lib/admin/items/item-errors.ts`, `components/admin/snippet-field.tsx` (also reads the
  player's state on mount), `app/admin/music/track-form.tsx`. Reproduced and verified in
  real Firefox (0:00 without, 0:07 with the saved length).
- **Form replaced after the first save** (`3405dca`, tested by Ivan, all 7 checks):
  - *Bug:* after the first save of a new item or article, the editors did
    `history.replaceState` to `/<id>`. Next patches `replaceState` and dispatches a
    "restore"; on request-time admin pages the router refetched the new URL, got the
    `[id]` route (another segment) and swapped the page subtree about a second later.
    Lost: typing in that second, focus, the "Saved at" message, uploads in progress.
  - *Fix:* stay on the `new` page and put the id in the hash: `new#<id>`.
    `lib/admin/editor-url.ts` → `useNewItemUrl(isNewPage, editHref)` gives the editors
    `rememberNewId` (first save) and `reopening` (a reload, Back or pasted link on
    `new#<id>` shows "Opening the saved …" and `router.replace`s to `/<id>`). Only UUIDs
    are accepted from the hash. Ids an open editor saved itself are ignored (otherwise its
    own first save would trigger "Opening…"); they're released on unmount, so Back still
    works. Keeps `?for=` (article editor). "Save and add another" clears the hash.
    Trade-off: the address bar shows `…/new#<id>` while the form is open.
  - *Rejected:* `router.replace('/<id>')` (another segment always remounts); one route for
    new and edit (keyed by id, still remounts); bypassing Next's patch via the native
    `History.prototype.replaceState` (Next's `HistoryUpdater` writes its URL back on the
    next update, and it relies on internals); creating the draft on "New" (leaves
    "Untitled" drafts); keeping form state in a layout above the page (text survives,
    focus and uploads don't).
  - *Testing, probe first:* a temporary public route (`app/remount-probe/`, deleted) copied
    the admin page shape (`new` and `[id]` pages, own `<Suspense>`, request-time work, a
    server action with `updateTag`), driven with `puppeteer-core` in Edge and real
    Firefox: path swap remounted in 4 of 9 runs (Firefox also flashed the loading
    fallback); hash in 0 of 13, no flicker, focus kept. Then unit tests for `idFromHash`,
    the editor harness, a server-rendered + hydrated Firefox test, and the Firefox
    form-state repro again.
  - Also: `eslint.config.mjs` ignores `.playwright-mcp/**` (`fc21208`).
- Playwright note: real mouse clicks in the MCP's Firefox stopped working mid-session
  (after a "Leave page?" dialog); page-level `element.click()`, `setInputFiles` and
  keyboard events kept working. Wait for `networkidle` before setting files, or the change
  event fires before hydration and is lost.

#### 4c — Music, part 2: the snippet cutter (done, tested by Ivan: checklist 1–8, laptop Firefox and phone)
Plan (approved 2026-10-04): in the snippet field, **Cut from the full track** (main) or
**Upload a ready-made snippet** (part 1). The track is decoded in the browser and never
uploaded. A window on its waveform (drag, tap, ±1 s buttons, typed start time, keyboard)
starts on the loudest stretch; length 20–30 s in 1 s steps, default 30. Preview plays the
cut buffer itself, so what Ivan hears is what's encoded. **Use this snippet** encodes an
MP3 in a worker and hands it to `addSnippetFile`, so checks, upload and the saved length
are the same as a manual upload. "Cut a different part" reuses the decoded track.
Decisions (Ivan): adjustable length, loudest start, 0.5 s fade-in / 2 s fade-out; he
exports full tracks as MP3 (~3 min), so the limits (200 MB, 15 min) are generous.

- **Step 1, probe (done):** a temporary public route (`app/worker-probe/`, deleted) loaded
  a component on demand that started `new Worker(new URL("./x.worker.ts",
  import.meta.url), { type: "module" })` importing lamejs, encoded 30 s of stereo tone
  and decoded the MP3 again. Driven with `puppeteer-core` in Edge and real Firefox, in
  `next dev` and after `next build` + `next start`: all four passed (1,201,632 bytes,
  decodes to 30.04 s, encoding 1.2–1.5 s on the laptop), no console warnings from it;
  lamejs is its own 162 KB chunk, fetched only after the click (none of the page's
  first scripts contain it). Edge logs five 404s on every public page: the header's
  prefetches of the unbuilt section pages (known, until Phase 3).
- **Step 2, logic + encoder (done):**
  - `lib/admin/snippet-rules.ts`: `CUT_RULES` (20–30 s, fades, 44.1 kHz, 320 kbps,
    track ≤ 200 MB and ≤ 15 min), `checkTrackFile` (audio type or a known extension;
    an empty type is left to the decoder), `checkTrackDuration` (≥ 20 s, ≤ 15 min).
  - `lib/admin/snippet-cut.ts`: pure functions on `Float32Array` channels:
    `snippetLength`, `clampStart` (tenths of a second, inside the track), `trackPeaks`
    (waveform), `blockLoudness` + `loudestStart` (mean square per 0.1 s, sliding window,
    earliest wins a tie), `cutSnippet` (new arrays, at most two channels, half-cosine
    fades so neither end clicks), `formatPosition` / `parsePosition` ("1:23.5").
  - `lib/admin/decode-track.ts`: checks, then decodes at 44.1 kHz (so the cut is already
    at the encoder's rate); keeps at most two channels.
  - `lib/admin/mp3-encoding.ts` (only imported by the worker, so only the worker pulls in
    lamejs): `toInt16` (clipped) and `encodeMp3` (1152-sample frames, mono sent as both
    channels, progress about once a second). `lib/admin/mp3-encoder.worker.ts`: the
    worker, typed with a small `scope` cast (the project has DOM types, not worker
    ones). `lib/admin/snippet-encoder.ts`: `createSnippetEncoder()` starts the worker
    at once (lamejs downloads while Ivan picks his part); `encode()` copies the arrays
    (the cutter keeps them for preview), one encode at a time (a newer one cancels the
    older), `cancel()` / `close()` end the worker (the only way to stop it mid-encode)
    and reject with `EncodeCancelled`; a worker that fails to load becomes a plain
    message and the next encode starts a new one.
  - Tested with tsx: logic, rules and encoder 15 (incl. walking the MP3's frame headers:
    CBR 320, 44.1 kHz, stereo, 30.04 s, 1.2 MB, frames fill the file), wrapper 9 with a
    fake `Worker` (request, progress, reuse, failure, cancel, newer cancels older, late
    messages ignored, load failure and retry, close).
- **Step 3, waveform + cutter UI (done):**
  - `components/admin/snippet-waveform.tsx`: the waveform is **SVG, not canvas** (the
    plan said canvas): one filled path from `trackPeaks`, stretched with
    `preserveAspectRatio="none"`, so it's sharp at any pixel density, follows the theme's
    `light-dark()` colours (a canvas would need them resolved and redrawn) and needs no
    redraw on resize. The window is a `role="slider"` (arrows 0.1 s, Shift 1 s,
    PageUp/Down 5 s, Home/End) holding a second copy of the path in the accent colour,
    shifted so it lines up with the one behind. Pointer: a press becomes a drag after
    4 px sideways (dragging the window keeps the grab point; starting outside centres
    it), a tap outside centres the window there, a tap on it only focuses it;
    `touch-action: pan-y`, so a vertical swipe scrolls the page and doesn't move the
    window (`pointercancel`). The playhead is a line the cutter moves directly.
  - `lib/admin/snippet-cut.ts`: `latestStart` rounds the latest start **down to a tenth**:
    decoded MP3s end in encoder padding (180.036 s), which made the end position
    150.036 and `+1 s` look stuck. Found by the harness.
  - `components/admin/snippet-cutter.tsx`: pick or drop the full track ("It stays on
    this device"), "Reading the track…", then file line + "Choose another track",
    waveform, **Starts at** (typed `1:23.5` / `83.5`, applied on Enter or leaving the
    box; anything else shows "Type a time in the song, like 1:23.5." and keeps the old
    value), −1 s / +1 s, **Length** (20–30 s select), a line saying what's cut and the
    fades, **Play preview / Stop** (plays `cutSnippet`'s buffer; any change to the window
    stops it; sets `navigator.audioSession.type = "playback"` where Safari has it, so
    the iPhone's silent switch doesn't mute it), **Use this snippet** (encode with a
    progress bar + Cancel, then `addSnippetFile` as a `File` named `snippet.mp3`, then
    `onAdded`). The encoder starts on mount and closes on unmount. Busy (Save waits)
    only while encoding or uploading; Close is disabled while uploading. Icons are SVG:
    "▶" and "■" render as coloured emoji on Windows.
  - Tested in a harness (esbuild bundle of the cutter in a form, fakes for `lib/media`
    and `upload-media`, the worker bundled separately and served under the name the
    bundle asks for, the site's CSS compiled with Tailwind), driven with `puppeteer-core`
    in headless Edge (55 checks) and real Firefox (49; no touch or screenshots). Test
    songs made in Node: every second its own pitch (300 Hz + 5 Hz per second), quiet
    except a loud 60–90 s, as WAV and MP3 (3 and 5 min). Checked: wrong files (text,
    broken MP3, 10 s clip) give their messages; the window starts at 1:00.0 (loudest);
    the uploaded file is `snippet.mp3`, `audio/mpeg`, 1.2 MB, stereo, 30.04 s, and its
    pitch 15 s in is the 75th second's (the right part); fades silent at both ends, half
    level at 0.25 s; a 20 s cut from 1:35 has the 105th second's pitch and keeps the
    quiet level (no normalising); keyboard, typed times, ±1 s, the end of the track,
    mouse drag / click / click on the window, touch tap / drag / vertical swipe (Edge);
    preview playhead moves at real speed (Firefox; **headless Edge's audio clock runs at
    a tenth of real speed**, no sound device) and stops on any change; Cancel mid-encode
    (no upload, no error, busy back to false, next encode works); "Uploading…" disables
    Close and the controls; another track resets to its loudest part; Close; no console
    warnings. Screenshots 1280 / 390 px, light and dark, including the window across the
    quiet/loud boundary (both waveforms line up). Tap targets ≥ 44 px, no sideways
    scroll at 390 px. Timings on the laptop: reading a 3-min MP3 0.3 s (Edge) / 0.6 s
    (Firefox), 5-min 0.5 / 0.9 s; Use (encode + checks + fake upload) 1.6–2.2 s.
  - Harness gotchas: Firefox's `uploadFile` (WebDriver BiDi) wants Windows paths with
    backslashes; test math must use the **decoded** length (180.036 s), as the page does.
- **Step 4, wired into the snippet field (done):**
  - `components/admin/snippet-field.tsx`: the picker offers **Cut from the full track**
    and **Upload a ready-made snippet** (Replace offers both, plus Cancel). The cutter is
    `next/dynamic` with `ssr: false`, so its code (and the worker it starts) loads only
    when opened ("Opening the cutter…"); if its chunk can't be fetched, the loader
    returns `CutterUnavailable` (a message and Close) instead of throwing, so the form
    survives. The cutter's state is `closed` / `open` / `hidden`: after "Use this
    snippet" it's **hidden but still mounted**, so **Cut a different part** reopens it
    with the decoded track (no new file pick); Close unmounts it (frees the track and
    ends the worker). While it's open, the picker and Replace / Remove are hidden. The
    field's busy = its own upload or the cutter's encode/upload.
  - Build check (`next build`): the field's chunk is in `/admin/music/new`'s client
    manifest; the cutter's chunk isn't (only the dynamic loader references it), and
    lamejs is referenced only by the cutter's chunk and Turbopack's worker bootstrap.
  - Tested in a second harness (`renderToString` on Node, `hydrateRoot` in the browser,
    esbuild code splitting standing in for `next/dynamic`, a server switch that fails
    chunk requests), headless Edge and real Firefox, 21 checks each, all passing: the
    first load has neither the cutter's code nor the worker, opening loads both; cut →
    the field's player (`MP3 · 0:30 · 1.1 MB`: MB is 1024²), cutter hidden, then "Cut a
    different part" / Replace / Remove; busy `[true, false]`; reopening shows the same
    track and a second cut replaces the first; Close removes it; Replace + ready-made
    upload; Remove, then the cutter opens fresh; **reload hydrates cleanly in Firefox**
    after buttons were disabled and re-enabled (no form-state restore warnings);
    offline: the message, and Close brings the picker back. In development the worker
    is requested twice (Strict Mode runs the effect twice); production starts one.
  - Each "Use this snippet" uploads a new file; replaced snippets stay in Storage (same as
    replacing an uploaded one; see "Unused media" in CLAUDE.md).
- **Ivan's browser checklist** (laptop Firefox, then phone; a `[test] …` draft, deleted
  afterwards with its uploaded snippets):
  1. Music → New song → Audio snippet: **Cut from the full track** → pick a real MP3
     export. The waveform appears and the window sits on the loudest part.
  2. Move the window: drag it, click elsewhere on the waveform, type a start (`1:23.5`),
     −1 s / +1 s, arrow keys (Shift for whole seconds). Set Length to 20 s.
  3. **Play preview**: it plays just the window, fading in and out; moving the window
     stops it.
  4. **Use this snippet**: progress bar, then the snippet's player shows it (MP3, its
     length). Tap Save draft while it's still making the MP3 → asked to wait.
  5. **Cut a different part** → same track, no new file pick; cut again → replaced.
     Close; Replace → **Upload a ready-made snippet** still works.
  6. Save the draft, reload: the snippet and its length are still there.
  7. Looks: both themes, the waveform and window, the panel at phone width.
  8. Phone: pick the full track from Files; drag with a finger; a vertical swipe over
     the waveform scrolls the page; preview plays (iPhone: also with the silent switch
     on); how long "Use this snippet" takes.

#### 4d — Games (done, tested by Ivan: checklist 1–7, laptop Firefox and phone)
Plan (approved 2026-10-04). No database changes: the `games` table, its publish rule,
the views and the media folder exist since 2.2. Form: the shared item fields (screenshot =
the Projects image field, 16:9, 2400 px, `media/games/`) plus **status** (PLAYING /
FINISHED / DROPPED toggle like Reading; FINISHED fills "Finished on" with today if empty;
**DROPPED leaves it empty**), **platform** (text with suggestions: platforms already used,
then PC, PlayStation 5, Nintendo Switch, Xbox Series X|S, Steam Deck; Ivan may change the
list), **hours played** (decimal keyboard, comma allowed, at most one decimal, ≤ 99,999.9),
**rating 1–10** as **number buttons** (one row on a laptop, two rows of five on a phone;
tap again to clear), **finished on** (not in the future). Publishing needs the review
article. List: drag to reorder, the status badge, detail `Platform · 42 h · 8/10 ·
Review | No review`, and one-tap **Finished** / **Dropped** on a playing game.
Steps: (1) definition + list change + unit tests; (2) form, list, pages, tab, harness;
(3) docs + Ivan's checklist.
- **Step 1 (done):**
  - `lib/games.ts`: `PLAY_STATUSES`, `PLAY_STATUS_LABELS`, `isPlayStatus` (shared with the
    Phase 3 page, like `lib/reading.ts`).
  - `lib/admin/items/games.ts`: schema, `gamePublishRules` (one message on the article
    field), `withPlayStatus` (lives here like `withReadingStatus` in `books.ts`),
    `gameToRow` / `gameFromRow` (unknown status → playing), `PLATFORM_SUGGESTIONS`.
    Hours stay text in the form (so the box can be empty) and become a number in the row.
  - `lib/format.ts`: `isNotInFuture(date)`: not after the UTC date + 1 day, i.e. today in
    the furthest-ahead time zone. The schema runs in the browser and on the UTC server, so
    "today" has to be a rule both agree on (Brisbane is UTC+10).
  - `components/admin/item-list.tsx`: `quickStep` → `quickSteps` (a list; a playing game
    has two buttons). `app/admin/reading/page.tsx` passes one-element lists (or none).
  - Tested with tsx, 12: statuses; empty game; hours (`12,5`, `.5`, `12.50` ok; `12.25`,
    `-3`, `1e3` refused; too many) and their row values; rating 1–10 / none / 7.5;
    platform length; finish date real and not in the future (`isNotInFuture` at 03:00 and
    23:30 UTC); publishing needs the review (field errors first); `withPlayStatus`; the two
    sample games round-trip and validate (Celeste can't be published).
- **Step 2 (done):**
  - `components/admin/rating-buttons.tsx`: number buttons 1–`max` (`grid-cols-5
    sm:grid-cols-10`, 44 px), single choice (`aria-pressed`), tap again to clear, arrow
    keys, "8 out of 10" / "Not rated".
  - `lib/admin/items/games.ts`: `platformSuggestions(used)`: used platforms first (most
    used, merged ignoring case), then the defaults not used yet.
  - `lib/admin/items/load-games.ts`: `getEditableGame`, `getGameSuggestions` (badges and
    platforms from one query).
  - `app/admin/games/`: `actions.ts` (`saveGame`; `setPlayStatus`, the list's one-tap step,
    like `setReadingStatus`), `game-form.tsx` (status toggle as on Reading; platform
    `<input list>` + `<datalist>`; hours `inputMode="decimal"`; rating buttons; finished
    on), `list-row.ts` (`gameListRow` + the selected columns: kept out of the page so it
    can be tested), `page.tsx`, `new/`, `[id]/`. Games tab on (`lib/admin/sections.ts`).
  - Gotcha: `PageProps<"/admin/games/[id]">` only type-checks after a build (or `next
    typegen`) has generated the new route's types.
  - Tested: tsx 2 more (platform suggestions, list rows: zero hours shown, unknown status
    → PLAYING). Harness (server-rendered + hydrated; fakes for `next/link`,
    `next/navigation`, `next/image`, `lib/media`, list actions, image import, and the
    Games actions, whose save runs the real validation), Edge and real Firefox, 28 each:
    status toggle and dates (FINISHED fills today, never overwrites; PLAYING keeps it;
    DROPPED leaves it empty); rating (pick, arrow keys + focus, clear; one row at 1280 px,
    two rows of five at 390 px, ≥ 44 px, no sideways scroll); platform suggestions and
    decimal keyboard; 12.25 h and a future date refused; the saved row (`12,5` → 12.5,
    rating, status, date); Publish without a review → the message, nothing saved; list
    rows (badges, detail lines, Finished + Dropped only while playing; Finished calls the
    action with today and the row updates); Reading still one step per status; reload
    hydrates cleanly (only the end rows' ↑ / ↓ disabled, as on a fresh load). No
    screenshots (Ivan checks the looks).
- **Ivan's browser checklist** (laptop Firefox, then phone; `[test] …` drafts, deleted
  afterwards with their screenshots):
  1. Games tab → New game: add a screenshot, pick a platform from the suggestions, hours
     `12,5`, rating 8 (then tap 8 again: cleared; pick 7), Save draft.
  2. Tap FINISHED: "Finished on" becomes today; DROPPED on a game without a date leaves
     it empty.
  3. Type `12.25` hours or a date next year → the message under the field.
  4. Publish without a review → "A game needs its review article to be published."; then
     "Write the article" (or pick one) and publish; unpublish right after.
  5. List: the badge and detail line; on a playing game tap **Finished** (date filled,
     buttons gone) and on another **Dropped**. Drag to reorder.
  6. Edit the sample "Hollow Knight (sample)" and save: everything loads and saves.
  7. Looks: the form and list in both themes; on the phone the rating is two rows of
     five, the status toggle and the list's buttons are easy to tap.

#### 4e — Hobbies (done, tested by Ivan: checklist 1–7, laptop Firefox and phone)
Plan (approved 2026-10-04). No database changes (table, publish rule, views and the
`media/hobbies/` folder exist since 2.2). Form: the shared item fields plus **category**
(suggestions: used ones, then `Learning`; the server stores an existing category's
spelling when it matches ignoring case), **card style** PHOTO / CUT-OUT / NONE (default
photo), **caption** (photo only), **subtitle**, **note**, **link** (wins over the article,
as in `home_feed`). Publishing needs a category, and an image unless the style is NONE
(Ivan's decision). Photos: 2400 px, square cropped preview; cut-outs: 1200 px, shown whole
on a checkerboard, transparency kept. "Learning" = what Ivan is learning now (no separate
switch, no database change). List: drag to reorder, detail `Coffee · Photo · Link`, a
`LEARNING` badge. Category suggestions: just the used ones plus Learning (Ivan gave no
starting list). Ivan's phone is a Samsung and he doesn't upload images from it.
Steps: (1) definition + image pipeline + tests; (2) form, list, pages, tab, harness;
(3) docs + Ivan's checklist.
- **Step 1 (done):**
  - `lib/hobbies.ts`: `IMAGE_STYLES`, labels, `isImageStyle`, `LEARNING_CATEGORY` (shared
    with Phase 3).
  - `lib/admin/items/hobbies.ts`: schema, `hobbyPublishRules` (category; image unless
    NONE), `matchCategory` (existing spelling ignoring case, spaces tidied, Learning
    always known), `categorySuggestions`, `hobbyImageSettings(style)`, rows (unknown
    style → photo).
  - Images: `prepareImage(file, use, { keepTransparency })`: when the browser can't encode
    WebP, cut-outs become **PNG** (other images keep the JPEG-on-white fallback). Passed
    through `addImageFile` and `ImageField` (`keepTransparency`). URL imports already keep
    transparency (sharp writes WebP with alpha). The bucket already allows PNG.
  - `ItemEditor` takes `imageFor(fields)` → `{ use, frame, fit, keepTransparency }`,
    overriding the fixed `imageFrame` / `imageFit` and the section's size, so the image
    settings can follow a hobby card's style.
  - `app/globals.css`: `checkerboard` utility (both colours in the gradient, so the
    image frame's own `bg-bg-raised` can't hide the pattern).
  - Note: the sample "Monstera (sample)" is a published cut-out without an image; with the
    new rule it can't be updated as published until it gets an image or the NONE style.
  - Tested: tsx 9 (styles; draft = title; publish rules; limits, link, own folder only;
    `matchCategory`; suggestions; image settings; the four samples round-trip; unknown
    style). Browser test in Edge and real Firefox (`prepareImage` on a 2000 px transparent
    PNG, then again with `toBlob("image/webp")` forced to return PNG like a browser
    without WebP encoding): cut-out → WebP 1200 px with see-through corners; without WebP
    → PNG 1200 px, still see-through; other images → WebP, and without WebP JPEG on white
    as before. 8/8.
- **Step 2 (done):**
  - `lib/admin/items/load-hobbies.ts`: `getEditableHobby`, `getHobbySuggestions` (badges and
    categories from one query).
  - `app/admin/hobbies/`: `actions.ts` (`saveHobby`: matches the category against the
    stored ones, ignoring case, before `saveItem`), `hobby-form.tsx` (category with
    `<datalist>` and the same matching when leaving the box; style toggle with a hint per
    style; Caption only for PHOTO, its text kept across style changes; subtitle, note,
    link; `imageFor` → `hobbyImageSettings`), `list-row.ts` (`hobbyListRow`: detail
    `Category · Photo|Cut-out|Text card · No image · Link|Article`, `LEARNING` badge),
    `page.tsx` (no quick steps), `new/`, `[id]/`. Hobbies tab on.
  - **All six sections are built**, so `app/admin/[section]/page.tsx` (the placeholder for
    unbuilt sections) is deleted and the `ready` flag is gone from `lib/admin/sections.ts`.
    With Cache Components, `generateStaticParams` must return at least one result, so the
    build failed once no section was left for it (gotcha noted in CLAUDE.md).
  - Tested: harness (server-rendered + hydrated, fakes as for Games, a fake save that
    matches categories and runs the real validation; real image preparation with the fake
    upload), Edge and real Firefox, 27 each: PHOTO by default with Caption; CUT-OUT /
    NONE hide it, PHOTO brings it back with its text; suggestions; `coffee` → `Coffee`,
    `LEARNING` → `Learning`, `Board  games` → `Board games`; Publish without category or
    image → both messages, nothing saved; a cut-out upload is WebP, 1200 px, see-through
    corners, shown `object-contain` on a painted checkerboard; PHOTO switches the preview
    to cropped; publishing a cut-out with `plants` stores `Plants` and keeps the caption; a
    photo upload is 2400 px; list rows (text card, cut-out without image, LEARNING with
    Article, photo with Link, no category); reload hydrates cleanly.
  - Harness gotchas: the editor's **sticky Save bar covers buttons near the bottom of the
    window**, and puppeteer still counts them as visible, so its click lands on the bar
    (it saved a stray draft). Scroll the button to the centre before clicking. Reloading
    with unsaved changes opens the "Leave page?" dialog: accept it in the driver. A fake
    `mediaUrl` must not point at a host that doesn't resolve (broken previews shift the
    layout, and `networkidle0` waits).
- **Ivan's browser checklist** (laptop Firefox for adding images; phone: Samsung, no image
  uploads; `[test] …` items, deleted afterwards with their images):
  1. Hobbies tab → New hobby item: type category `coffee` and leave the box → `Coffee`.
     Publish with no image as PHOTO → "Add an image, or choose the None style…".
  2. Add a photo: it's cropped square in the preview. Type a caption; switch to CUT-OUT
     (caption hidden) and back (caption still there).
  3. CUT-OUT with a transparent PNG (e.g. a product cut-out): shown whole on a
     checkerboard; after saving and reloading, the transparent parts are still
     transparent.
  4. NONE with category `learning` → saved as `Learning`; the list shows the LEARNING
     badge. Publish it, then unpublish.
  5. List: detail lines (`Coffee · Photo · Link`, `… · No image`), drag to reorder.
  6. Edit the sample "Ethiopia Guji (sample)" and save. (The sample "Monstera" is a
     published cut-out without an image: updating it as published now asks for an image
     or NONE.)
  7. Looks: the form and list in both themes; on the phone, the style toggle, category
     box and list buttons.

## Phase 3 — Section pages (in progress)
Plan approved 2026-10-04 (Ivan's answers: home newest first, a quiet "more" card for a
short last row, `TODO(Ivan)` intros). Steps: 1 shared pieces + Projects, 2 Reading, 3
Music + audio player, 4 Games, 5 Hobbies, 6 home grid + status cards.

**Research (before step 1).** Ivan recorded chester.how (`design-refs/Chester Recording.mp4`).
The watch plugin (Gemini engine; key in `~/.config/watch/.env`, never in the repo) described
the motion; chester.how blocks plain fetches (HTTP 429), but headless Edge with
`puppeteer-core` loads it, so its HTML, CSS and scripts were read to get exact values.
Where Gemini and the code disagreed, the code won (cards come *down* 10 px, not up;
the tab highlight slides on hover only; project images grow 105% rather than lift).
Ivan confirmed the effects list (CLAUDE.md, "Motion, as chester.how does it").

- **Step 1 (done, tested by Ivan on laptop and phone, pushed `a55f081`):**
  - `app/globals.css`: `--bg-raised-hover` (one step: light #e4dccf, dark #2f2c2a),
    `--frost`, `--shadow-skeuo` (light-dark per colour: `light-dark()` only takes
    colours, not whole shadows), `--cell-2` (square rows in the 2-column layout),
    springs as CSS `linear()` curves computed from the spring equation (`--spring-card`:
    stiffness 100 / damping 10, 1.224 s, 16% overshoot; `--spring-header`: 0.5 s, ~3%),
    `card-in` / `header-in` / `fade-in-late`. The reduced-motion rule now also zeroes
    `animation-delay` (staggered cards would otherwise still wait).
  - Header: `components/site-header.tsx` sticky (`pointer-events-none`, only the bar and
    the right side take clicks), `tab-bar.tsx` (frosted bar, drop-in, the hover pill moved
    by writing its width/transform directly; mouse only), `header-extras.tsx` (fade-in
    after 1 s; past 20 px of scroll: opacity 0 and `inert`), `nav-link.tsx` (`TAB_CLASS`:
    chester's `px-2 py-1` tabs).
  - `components/card.tsx`: plain hover tone, `ArrowCircle`, `card-in` with `index` and
    `playedMs`; `links` mode: a covering link underneath, small links on top (links
    can't nest); hover effects keyed to `group-hover` and `group-focus-within`.
  - `lib/grid.ts`: `gridHoles` simulates CSS dense auto-placement; `fillGrid` widens 1–3
    small cards (latest first), then tries one/two/three fillers with as few widenings as
    possible. `components/card-grid.tsx`: 4 columns from `lg`, 2 below, square rows.
  - `components/framed-screenshot.tsx` (frame + slim title bar, top 30%, cut off by the
    card; `motion-safe:group-hover:scale-105`: Tailwind 4 uses the CSS `scale` property).
  - `lib/projects.ts` (cached, tags `projects` + `posts`; `projectLinks`: live → repo
    ("GitHub" or "Code") → article, only published ones; the rest become small links),
    `app/projects/page.tsx` (screenshot cards, text cards without a screenshot, "Projects ·
    More" → GitHub as the filler). Static (`○`).
  - "About this" panel: `lib/post-items.ts` (`getPostItem(postId)`, one query to
    `post_items`, tagged `posts` + every section tag), `components/about-item.tsx`
    (projects version; other sections return null until their step), `ArticleView` takes
    `about`; `lib/posts.ts` now selects `id`.
  - Home and Writing cards got their drop-in order. **Writing gotcha:** the page first shows
    its prerendered copy (the `<Suspense>` fallback) and the interactive grid replaces it
    ~0.3 s later, which restarted the drop-in (the first card jumped back). Fix: the
    interactive grid reads the prerendered first card's animation `currentTime` and
    continues from there (`--card-offset`, `playedMs`), only for the cards it took over.
  - 404 page: Projects no longer "still being built".
  - Tested: tsx 7 (`gridHoles`, `fillGrid`, every arrangement of up to 9 cards comes out
    full). Production build on :3124 driven with `puppeteer-core`, Edge and real Firefox,
    28 checks each: header drop-in (500 ms), late fade (1 s / 300 ms), card stagger (0,
    150, 300 ms…, 1224 ms); projects cards and links; no holes and no sideways scroll at
    390 / 800 / 1280 / 1920 px; hover tone (dark mode in headless), arrow circle, screenshot
    scale 1.05; tab pill under the hovered tab and fading on leave; sticky bar at 16 px
    after scrolling, right side hidden and `inert`, back at the top; Writing: the first
    card's opacity sampled every frame never drops (190 frames); home stagger; reduced
    motion (Edge emulated, Firefox via `ui.prefersReducedMotion`): no delays, no scale,
    colour still changes; no console errors apart from the header's prefetches of the
    unbuilt section pages.
  - Not tested with data: the "about this" panel (no project is linked to a published
    article yet): on Ivan's checklist.
- **Ivan's browser checklist** (laptop Firefox, then phone):
  1. Load any page: the tab bar drops in from above; the links on the right appear a
     second later. Hover the tabs: a soft pill slides under them.
  2. Scroll: the tab bar stays at the top, frosted; the right side fades away and comes
     back at the top.
  3. /projects: `projects.` header, cards drop in one after another; hover: the card goes
     one step darker (lighter in dark mode), the arrow's circle lights up, a screenshot
     grows a little. Small "GitHub" links work on their own.
  4. Widen and narrow the window: no gaps in the grid (a "More on GitHub" card may fill one).
  5. /writing and home: cards drop in once (no jump back), Load more drops the new ones in.
  6. "About this": link a project (e.g. Test Project) to one of the published sample
     articles in the admin, open the article: the panel shows its screenshot, stack and
     links. Unlink it afterwards.
  7. Phone: the tab bar still scrolls sideways; cards and header look right; nothing jumps.
  8. Looks overall, both themes.

- **Step 2 — Reading (done 2026-10-04, tested by Ivan: checklist 1–8, laptop Firefox and phone).** Ivan's choices: book
  titles in the sans (chester's), a `Reading · Shelf` card as the filler, ratings only on
  wide cards and in the "about this" panel.
  - `lib/books.ts`: `getPublishedBooks()` (cached, tags `books` + `posts`; sorted in JS with
    `compareBooks`, so the admin and the page agree), `bookLinks()` (published article →
    the card's link, the book's own link then becomes a small link named after its site,
    e.g. `goodreads.com`; no article → the book's link; neither → not a link, no ↗),
    `shelfCounts()`.
  - `components/book-card.tsx` (reused by the home grid in step 6): `BookCard` (cover 40%
    of the card, bottom-left; beside it, bottom-aligned: status badge, extra badges from
    `sm`, title, author; wide cards add the rating and note from `sm` up, the note one line
    at `lg`, three from `xl`), `BookCover` (keeps the cover's own shape: `next/image` with
    a nominal 600×900 and `h-auto`; without a cover, a **typed cover** in the badge tone of
    the title, sized with container units, `aria-hidden`; `tilt`: −3°, 110%, deeper shadow,
    150 ms ease-out, movement `motion-safe:` only), `Stars`. `Badge`'s `toneFor` is exported
    for the typed cover.
  - `app/reading/page.tsx` (static `○`): `reading.`, `TODO(Ivan)` intro; fillers: the first
    is `Reading · Shelf` ("2 read and 2 reading."), any further one "More in writing".
  - "About this book" panel (`components/about-item.tsx`): cover, title, author, status
    badge, stars, year · pages, all from the existing `post_items` view (no migration).
  - 404 page: Reading no longer "still being built".
  - Phone fit (measured, cells 160–186 px at 360–412 px): small cards clamp the title to 2
    lines there (3 from `sm`); a wide card's cover is 16% on phones (19% from `sm`), or it
    sticks out of the card. 360 px leaves a 2 px squeeze into the 16 px bottom padding.
  - Tested: tsx 9 (`bookLinks` 6 cases incl. draft articles, `shelfCounts`, `compareBooks`
    order). Production build on :3124, `puppeteer-core`, Edge and real Firefox, 41 checks
    each: title, drop-in 0/150/300/450 ms, order, badges, links and ↗, real vs typed
    covers, cover keeps its shape, hover and focus (rotate −3deg, scale 1.1, shadow, card
    tone, 0.15 s), no holes / no sideways scroll / covers and text inside the card at 390,
    800, 1280, 1920 px, the panel on `sample-notes-pragmatic-programmer`, 404 text, reduced
    motion (no delays, no tilt or growth, shadow still deepens), console clean apart from
    the header's prefetches of `/music`, `/games`, `/hobbies`. Wide cards and both fillers
    (no live data has them) checked on `next dev` with a temporary edit to the page
    (reverted): content inside the card padding at 360–1920 px including 1023/1024/1279/1280.
- **Ivan's browser checklist** for step 2 (laptop Firefox, then phone):
  1. /reading: `reading.` header; book cards drop in one after another, reading first, then
     read (newest finished first), then to read.
  2. Covers: Project Hail Mary's real cover stands bottom-left with a soft shadow; the
     others get a typed cover (title and author on a soft colour). Badge, title (sans) and
     author line up with the cover's bottom.
  3. Hover The Pragmatic Programmer (the only one linked to an article): the cover tilts,
     grows and its shadow deepens; the card goes one step lighter/darker; the arrow lights
     up; clicking opens the article. Tab to it with the keyboard: same effect.
  4. The article shows "About this book": cover, title, author, READING, stars, 2019.
  5. Admin: give a book a link (e.g. Goodreads) → after saving, its card links there; give
     The Pragmatic Programmer a link too → a small `goodreads.com` link appears on its card
     while the card still opens the article. Make one book wide with a rating and note →
     stars and note show. Undo afterwards.
  6. Widen and narrow the window: no gaps (a `Reading · Shelf` card may fill one).
  7. Phone: cards readable (titles up to 2 lines), nothing spills out; both themes.
  8. /reading in the header is no longer a 404.

## How things were tested
Admin pages need Ivan's sign-in (signed-out requests get a 307 from `proxy.ts`), so
admin code is tested in pieces, then by Ivan in the browser:
- **Pure logic** (schemas, mappers, ISBN, dates, error explanations, the Open Library
  client): run with tsx from the project folder:
  `node <scratch>/node_modules/tsx/dist/cli.mjs --tsconfig ./tsconfig.json <test>.mts`,
  with `NODE_OPTIONS=--conditions=react-server` for modules that import `server-only`,
  and the two `NEXT_PUBLIC_SUPABASE_*` variables exported from `.env.local` for anything
  that reaches `lib/supabase/config.ts`.
- **Components** (forms, lists, picker, autofill): bundled with esbuild from the
  scratchpad, with `next/link`, `next/navigation`, server actions and network helpers
  replaced by fakes, then driven in headless Edge (`puppeteer-core`, not a project
  dependency). Serve the harness over http (so `history.replaceState` works) with
  `<meta charset="utf-8">` (or "←" breaks hydration checks).
  - Fakes are swapped in with an esbuild `onResolve` plugin (e.g. `@/lib/media`,
    `upload-media`, a form's `./actions`). Bare imports in a scratchpad test resolve
    from the scratchpad, so load project packages with `createRequire(<project>/package.json)`
    and set esbuild's `nodePaths` to the project's `node_modules` (one React copy).
  - Styles: compile `app/globals.css` with the project's `postcss` + `@tailwindcss/postcss`
    (`base` = the project) so screenshots look like the admin. Set `data-theme` for each
    screenshot: headless Edge follows the OS dark setting otherwise.
  - Audio: there's no ffmpeg; test MP3s are made with `@breezystack/lamejs` (sine waves of
    known length and bitrate), an M4A with the browser's own `MediaRecorder`.
  - lamejs under tsx: tsx loads project files as CommonJS, and lamejs's `require` build
    only sets a global `lamejs` (no exports), so `Mp3Encoder` is undefined. Tests load it
    through a `Module._resolveFilename` hook that returns that global, passed as
    `NODE_OPTIONS="--require <hook>"` (the tsx CLI runs tests in a child process, so a
    plain `--require` doesn't reach them). Bundlers use the ESM build; the app is fine.
  - Answer `/favicon.ico` in the test server, or its 404 counts as a console error.
- **Public pages:** production build on another port (3124), screenshots and rendered
  HTML before/after, and per-element layout when screenshots flicker by a pixel.
