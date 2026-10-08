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
  - (Moved in Phase 4 step 3: these image files now live in `lib/images/` as `rules.ts`,
    `prepare.ts`, `prepare-server.ts` and `fetch-remote.ts`.)
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

## Phase 3 — Section pages (done 2026-10-06)
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

- **Step 3 — Music (done 2026-10-04, tested by Ivan: checklist 1–7, laptop Firefox and phone).** Ivan's choices: the record
  hover as proposed; the filler is a quiet non-link "More on the way." (to-do: link it to
  his Spektral profile once his music is public); songs show only once their article is
  published; build and test with the sample songs only (his music isn't public yet; he
  unpublishes "speki" himself).
  - `lib/tracks.ts`: `getPublishedSongs()` (cached, tags `tracks` + `posts`; published, not
    in progress, Ivan's order; drops songs whose article isn't published, via `songHref`,
    which also covers drafts hidden by RLS), `TRACK_LINK_LABELS` (typed by the admin's
    `TrackLinkKey`, so the keys stay in step).
  - `components/song-card.tsx`: `SongCard` (`Music · Songs`; sleeve 45% of a small card, 21%
    of a wide one, so both come out the same size; extra badges and the wide card's note
    from `sm`, the note one line at `lg`, three from `xl`) and `RecordSleeve`. **The record
    hover:** a record (`vinyl` grooves + a non-turning `vinyl-sheen`, centre label = the
    cover art or the typed cover) sits behind the sleeve; on `group-hover` /
    `group-focus-within` it slides up 40% (`translate`, 300 ms ease-out) and spins
    (`record-spin`, 1.8 s = 33⅓ rpm). The spin is paused **inside the `animate-[…]`
    shorthand** (a separate `[animation-play-state:paused]` could be reset by the
    shorthand, depending on CSS order); hover sets it running with a more specific rule, so
    leaving stops it where it is. Movement and spin are `motion-safe:` only; the sleeve's
    shadow deepens either way.
  - `components/cover.tsx`: `TypedCover` (book 2:3 with spine, or square), moved out of
    `book-card.tsx`.
  - `components/audio-player.tsx` (client): play/pause key (44 px, `--shadow-skeuo`), a
    `role="slider"` bar (click, drag with pointer capture, arrows ±5 s, Home/End,
    `aria-valuetext` "0:05 of 0:10"), time. Length: `snippet_seconds` first, then the
    player's (`shownLength`). `preload="metadata"`; a requestAnimationFrame loop follows the
    playhead while playing. The file starts loading before hydration, so an early error or
    length is read once on mount. Never toggles `disabled`; a file that can't play shows
    "The preview can't be played right now." `formatDuration` moved to `lib/format.ts`
    (re-exported from `snippet-rules.ts`); new `formatMonth` ("September 2026", UTC).
  - "About this song" panel: sleeve (no record), title, "Spektral · September 2026", the
    player, "Listen to the full track ↗" and the platform links. `site.artist` added
    (`now.producing` uses it); the `home_feed` label change stays in step 6.
  - `app/music/page.tsx` (static `○`), `TODO(Ivan)` intro. 404: Music removed.
  - Tested: tsx 12 (`songHref`, `shownLength`, `timeAtPoint`, `formatDuration`,
    `formatMonth`) + the 9 book tests. **Player harness** (server-rendered with
    `react-dom/server`, hydrated, real 10 s MP3 from lamejs, served with range requests on
    :3125), Edge and real Firefox 23 each: saved length / player's length / saved wins,
    missing file → message, play (playhead and bar move), pause, click to 0:05 with
    aria values, drag to 0:08, hover without pressing doesn't seek, Home / arrows / End,
    plays to the end → Play and 0:00, tab order, 44 px targets, no hydration warnings.
    (Headless Edge starts audio slowly: wait for `currentTime`, not a fixed delay.)
    `/music` on the production build, Edge and Firefox 41 each: cards and filler, the
    in-progress sample and "speki" not listed, hover (translate `0px -40%`, running, rises
    60 px above the sleeve, clear of the label, shadow, card tone), leave (paused at the
    same `currentTime`, slides back), focus, full grid / no sideways scroll / text inside at
    360–1920 px, the song article panel (bucket URL, missing-file message, full-track link),
    reduced motion (no slide, no animation, shadow still deepens), 404 text; Reading rerun
    41/41 both. Small / real-cover / wide song cards (live data has only one song, widened)
    checked on `next dev` with a temporary page edit (reverted) at 9 widths 360–1920: all
    inside the padding, record clear of the label, label art loaded.
  - Noise to expect: Firefox logs `Cookie "__cf_bm" has been rejected` on Supabase Storage's
    404 for the missing sample snippet.
  - Live data note: a book "194" (TO READ, with a cover) is published, saved 2026-10-04
    13:21 UTC; probably from Ivan's step-2 checklist.
- **Ivan's browser checklist** for step 3 (laptop Firefox, then phone):
  1. /music: `music.` header; "Night Drive (sample)" (wide) and a quiet "More on the way."
     card (no arrow). The in-progress sketch and "speki" aren't there.
  2. Hover Night Drive: a record slides up out of the sleeve and spins; move away: it stops
     where it is and slides back. Tab to it with the keyboard: same.
  3. Click it: the article shows "About this song" (Spektral · September 2026), says the
     preview can't be played (the sample's file doesn't exist), and has the full-track link.
  4. Real playback (optional): in the admin, upload a snippet to "Night Drive (sample)"
     (it replaces the missing file); play it on the article: play/pause, click and drag
     the bar, arrow keys, the time ends at the right length. Remove it again afterwards if
     the sample should stay as it was.
  5. Phone: cards and the record look right; a tap opens the article; the player's button
     and bar are easy to hit.
  6. Both themes; reduced motion (if used): nothing slides or spins.
  7. /reading still looks right (its covers moved to a shared component).

- **Step 4 — Games (done 2026-10-05, tested by Ivan: checklist 1–8, laptop Firefox and phone).** PRESS START as
  proposed and approved by Ivan (our own SVG pixel letters, not a font).
  - `lib/games.ts` (also loaded by the admin's form in the browser, so nothing
    server-only): `formatHours` ("62.5 h"), `gameDetails` (`PC · 62.5 h · 9/10`, empty
    parts left out; `short` for phones drops the platform unless it's all there is),
    `gameHref` (published review only), `hoursSummary` (the filler's text pieces).
    `lib/games-loader.ts`: `getPublishedGames()` (cached, tags `games` + `posts`, Ivan's
    order, only games whose review is published).
  - `components/game-card.tsx`: label `Games · <title>`; under it (Card's new `meta`
    slot) the status badge + Ivan's badges on one 24 px row (badges that don't fit drop
    out whole; extra badges from `sm`) and the details line (phones: hours and rating
    only; measured cells are 160–186 px at 360–412 px). The window sits at
    `top-[max(30%,6.625rem)]` (`7.75rem` from `sm`) so it clears those lines at rest
    (20 px phones, 34 px up) and at the top of the pop (5–23 px). No screenshot → a text
    card (badges, serif title, details).
  - `components/framed-screenshot.tsx`: `hover: "grow"` (Projects, unchanged) or `"pop"`:
    `origin-bottom`, lift 8 px / 12 px from `sm`, `scale-104`, −1.5° (wide −1°), shadow
    `0 22px 40px -12px rgb(0 0 0/0.45)`. The hover rule carries 250 ms
    `cubic-bezier(0.34,1.56,0.64,1)`, the base rule 200 ms ease-out (a transition uses the
    timing of the state it goes *to*). Movement `motion-safe:` only. `TitleBar` (exported,
    reused by the panel): dots grey, lit peach `#f0a983` / yellow `#e8c95c` / green
    `#9ccc78` with `lit`.
  - `components/press-start.tsx`: 5×7 letters as strings → one SVG path (each run of
    pixels one rectangle), `crispEdges`, cream `#fff4dc` over a `#1c1b1a` copy shifted one
    pixel down-right; same in both themes (it sits on the screenshot). 99×12 px on phones,
    132×16 px from `sm`, centred at 60% of the screen part above the card's edge
    (`top-[calc(60%-1.2rem)]`: the bottom 2rem is cut off). `press-start-blink` in
    `globals.css`: 1 s, `step-end`, on until 60%, 250 ms delay, infinite; the element is
    `opacity-0` until the animation starts, so it shows as the pop lands and vanishes at
    once on leave; reduced motion: `opacity-100`, no animation.
  - `Badge`: fixed tones PLAYING yellow, FINISHED green, DROPPED pink (the admin list
    follows). `Card`: `meta` prop (lines right under the label).
  - `app/games/page.tsx` (static `○`), `TODO(Ivan)` intro; fillers: `Games · Hours`
    ("62.5 hours across 1 game, 1 finished."), any further one "More in writing".
    "About this game" panel in `about-item.tsx`: small window (title bar + 16:10
    screenshot), title, status badge, details line. 404: only Hobbies left.
  - Tested: tsx 5 tests / 18 checks (`formatHours`, `gameDetails` full and short,
    `gameHref`, `hoursSummary` incl. 0.1 + 0.2 and singulars). Production build on :3124,
    Edge and real Firefox, live data, 23 each: title, card, link, text card, FINISHED
    green, details line, Hours filler, drop-in 0/150 ms, console clean, full grid / no
    sideways scroll / text inside at 9 widths 360–1920 (phones show `62.5 h · 9/10`), the
    panel on `sample-review-hollow-knight`, 404 text, Projects' hover unchanged (1.05,
    150 ms, no tilt, no PRESS START). **Framed cards** (live data has none) with a
    temporary page edit adding four fake games using Test Project's screenshot (separate
    build, reverted, nothing in the database), Edge and Firefox 29 each: rest state, both
    timings, the overshoot (scale peaks 1.0438), lift / 1.04 / −1.5° / bottom origin, wide
    −1°, shadow, lit dots, PRESS START hidden for the first 250 ms then blinking on ~60%
    with no in-between values, placement and size, gone at once on leave, keyboard focus,
    badges never cut, **the letters read back from a canvas exactly as designed** (this
    caught a bug: `M${x}${y}` ran the numbers together, so nothing was drawn), window
    clear of the lines at rest and popped at 9 widths. Reduced motion (Edge emulated,
    Firefox pref) 4 each: no movement, shadow and dots still change, PRESS START steady,
    no delays.
  - Not tested with data: the panel with a screenshot (the sample game has none): on
    Ivan's checklist.
- **Ivan's browser checklist** for step 4 (laptop Firefox, then phone):
  1. /games: `games.` header; "Hollow Knight (sample)" as a text card (FINISHED in green,
     serif title, "Nintendo Switch · 62.5 h · 9/10") and a `Games · Hours` card ("62.5
     hours across 1 game, 1 finished."). Clicking the game opens its review.
  2. The review shows "About this game": title, FINISHED, the details line.
  3. Admin: give Hollow Knight (sample) a screenshot (laptop) and save. The card now shows
     the badge and details under the label and the screenshot in a window below them.
  4. Hover it: the window pops up (lifts, grows, tilts a little, with a small bounce), its
     dots turn peach / yellow / green, and "PRESS START" appears on the screen as it
     lands, then blinks. Move away: it settles back and PRESS START is gone at once. Tab
     to it with the keyboard: the same.
  5. The review's panel now shows the screenshot in a small window.
  6. Make the game wide: it tilts a little less. Add a few badges: the ones that don't fit
     on one row disappear whole. Undo the changes afterwards (or keep the screenshot).
  7. Phone: details show only hours and rating; the window and PRESS START fit; a tap
     opens the review. Both themes; reduced motion (if used): nothing moves, PRESS START
     stays on.
  8. /projects hover still just grows the screenshot; /games in the header isn't a 404.

- **Step 5 — Hobbies (done 2026-10-05, migration applied with Ivan's OK; tested by Ivan: checklist 1–7, laptop Firefox and phone).**
  Ivan's choices: an automatic LEARNING badge for the Learning category (never twice); a
  `Hobbies · All` filler ("4 things across 3 hobbies."), "More in writing" as a rare
  second; cut-outs `object-contain`; the `post_items` migration (dry-run first).
  - **Research:** chester's live hobby cards read in headless Edge (`chester.mjs` in the
    scratchpad): photo `img absolute … transition-all group-hover:mt-12`, caption
    `text-white/70 … group-hover:bg-black/70`; cut-out `img absolute -z-10 object-cover
    transition-transform group-hover:z-10 group-hover:scale-105`, text block `grow
    bg-gradient-to-t from-neutral-50 group-hover:opacity-20 group-focus-within:opacity-0`;
    text card `h3 font-serif font-light text-4xl md:text-5xl lg:text-6xl line-clamp-2`,
    subtitle muted and note in ink, `line-clamp-1` each. Timings: Tailwind's default
    (150 ms, `cubic-bezier(0.4, 0, 0.2, 1)`).
  - `lib/hobbies.ts` (browser-safe): `hobbyHref` (link, else published article, else
    none), `hobbyBadges` (LEARNING first, Ivan's own "Learning" dropped ignoring case),
    `hobbyCaption` (caption, else title), `hobbiesSummary`. `lib/hobbies-loader.ts`:
    `getPublishedHobbies()` (cached, tags `hobby_items` + `posts`, Ivan's order; a photo or
    cut-out without an image becomes `style: "none"`).
  - `components/hobby-card.tsx` (for the home grid in step 6 too): label
    `Hobbies · <category>`; **photo**: image layer `absolute inset-0` (positioned, so it
    covers the label row), `motion-safe:` `translate-y-12` on hover/focus instead of
    chester's `mt-12` (so reduced motion can skip it), caption `white/70` → `black/70`
    backing; **cut-out**: layer `-z-10` (the card is `isolate`) → `z-10` + `scale-105`,
    `object-contain`; the text block fades (20% hover, 0 focus) and its gradient is a
    `::before` reaching 4rem up, so it takes no height; **text**: badges, light serif title,
    subtitle, note.
  - **Fitting text (measured):** at first the titles were silently clipped on phones and at
    1024 px (30–44 px of 50, 64 of 76): a `line-clamp` element has `overflow: hidden`, so
    a flex column may shrink it. Titles are now `shrink-0` (overflow shows, and the checks
    catch it), and the text card fits each cell: phones badges + title (`text-xl`); `sm`
    `text-4xl` + subtitle + note; `lg` (230–294 px cells) `text-3xl` + subtitle; `xl`
    `text-5xl` + subtitle + note. Note one line everywhere (chester).
  - `components/badge.tsx`: `BadgeRow` (one row, badges that don't fit drop out whole;
    `phoneFirstOnly` for games); `game-card.tsx` now uses it.
  - "About this hobby" panel: `Hobbies · <category>`, title, subtitle, note, "Visit ↗";
    the picture as on the card (photo cropped square, cut-out whole, none for a text card).
    Needs `image_style` and `note` in `post_items`: migration
    `20261005120000_post_items_hobby_style.sql` (same view, two fields added to the hobby
    details; dry-run lists only it). Without it the panel still works (photo crop, no note).
  - `app/hobbies/page.tsx` (static `○`), `TODO(Ivan)` intro. 404: the "still being built"
    line is gone (every section is live), and so is the header's prefetch noise.
  - Tested: tsx 4 tests (`hobbyHref`, `hobbyBadges`, `hobbyCaption`, `hobbiesSummary`) +
    the 5 games tests. Production build on :3124, Edge and real Firefox, live samples, 21
    each: title, order, labels, plain cards without links, Monstera's fallback, light serif,
    badges, LEARNING once and lavender, subtitle and note, drop-in, console clean, 9 widths
    360–1920 (full grid, titles whole, text fits, lines shown per width), 404 text. Games
    rerun 23 each (made data-driven: live data now also has Ivan's "Hollow Knight" with a
    screenshot from his step-4 checklist). **Photo and cut-out cards** with a temporary
    page edit (five fake items with two images generated by `sharp` into `public/__test__`,
    plus a second grid that needs a filler; reverted and deleted, nothing in Storage or the
    database), Edge and Firefox 27 each + 3 reduced motion: photo link in a new tab, covers
    the label at rest (hit-tested with the layer's pointer events briefly on: it's
    `pointer-events-none`), 48 px slide, label and ↗ shown, caption backing, focus, title as
    caption; cut-out link, −10 → 10, 1.05, contain, title on top at rest and covered on
    hover, 20% / 0, gradient; LEARNING then Rust; badges never cut, note one line; the
    filler "5 things across 4 hobbies."; 9 widths; reduced motion: no slide or growth,
    backing, stacking and fade still change, no delays. Test gotcha: Tailwind 4 colours
    come back as `oklab(…)` in Edge.
- **Ivan's browser checklist** for step 5 (laptop Firefox for images, then phone):
  1. /hobbies: `hobbies.` header; four text cards (two Coffee, Plants, Learning) with big
     light serif titles; "Next.js 16 (sample)" has one LEARNING badge (lavender).
     Monstera (a cut-out with no image) shows as a text card.
  2. Admin: give a hobby item a **photo** (style PHOTO, a caption, a link) → the photo
     fills the card with the caption bottom-left; hover: it slides down showing the label
     and ↗, the caption gets a dark backing; click opens the link in a new tab.
  3. Give one a **cut-out** (transparent PNG, style CUT-OUT) → the object stands behind the
     title; hover: it grows a little and comes in front while the text fades; Tab to it:
     the text disappears completely.
  4. Link a hobby item to a published sample article → the article shows "About this
     hobby" with the picture, subtitle, note and Visit link.
  5. Make one wide; resize the window: no gaps (a `Hobbies · All` card may fill one).
  6. Phone: text cards show badges and title only, photos and cut-outs look right, taps
     open links. Both themes; reduced motion (if used): nothing slides or grows.
  7. The 404 page no longer mentions anything still being built; /hobbies in the header
     works. Undo the test changes afterwards (or keep real ones).

- **Step 6 — Home grid + status cards (done 2026-10-06, tested by Ivan: checklist 1–8, laptop Firefox and phone).**
  Ivan's choices: home from the **section loaders**, `home_feed` dropped; status cards
  automatic (no "Show on home" needed), never twice; the latest article + 4 more; the
  pixel-art spot with **his own Shinx fan art** (CLAUDE.md's rule updated: allowed there
  only), using the animation's own first frame as the still.
  - **Why loaders, not the view:** `home_feed` lacked what the section cards show (a book's
    author and rating, a game's platform and hours, a hobby's subtitle, a project's extra
    links, a song's month). Reusing the loaders makes a home card exactly the section
    card. Migration `20261005130000_drop_home_feed.sql` (dry-run, then applied with Ivan's
    direct OK; `db:types` removed the view's 19 lines); `rls-check.sql` lost its
    `home_feed` check (loaders' link rules are unit-tested).
  - Loaders gained `showOnHome` + `homeDate` (projects / hobbies: added; books / games:
    finished, else added; songs: released, else added); `getNowProducing()` in
    `lib/tracks.ts` (published, in progress, top of the Music order).
  - `lib/home.ts` (`homeLayout`, `MORE_ARTICLES = 4`, `isLearning`): featured = latest
    article; status = every book being read + every Learning item; feed = the next 4
    articles + items marked "Show on home" (minus status ones), newest first, ties by key.
  - `lib/grid.ts`: `gridHoles(spans, columns, block)` and `fillGrid(spans, { intro })`:
    the intro's 2 × 2 block at the top-left on 4 columns (on 2 columns it's its own row).
  - `app/page.tsx`: one grid, `grid-rows-[auto]` (the intro's own row below `lg`, then
    square `--cell-2` rows) / `lg:grid-rows-none` + square `--cell` rows; slots (featured,
    Now producing, books, Learning, feed, YouTube, archive) → `fillGrid({ intro: true })`,
    fillers "Writing · More". Song cards on home: `Music · <title>`.
    `components/project-card.tsx` (moved out of /projects), `SongCard`'s `label`,
    `WritingCard`'s `className` + `square`, `status-cards.tsx` (`NowProducingCard` from
    data; the Learning card is gone, Learning items are hobby cards), `lib/site.ts` lost
    `now`.
  - **Pixel art:** `GIFS/` held a pixel-art still and an MP4 (two different drawings;
    the MP4 on white). Frames taken in Edge (seek every 1/240 s, keep changed frames: 8,
    87–92 ms each), white removed by a flood fill from the edges (so the light-blue fill
    stays) with white-to-alpha on the outline's edge, trimmed to one box, 120 px tall, with
    `sharp`: `public/art/shinx-wag.webp` (29 KB, animated, loops), `shinx-still.webp`
    (6.4 KB, frame 1), `shinx-pixel.png` (3.2 KB, kept for later). `components/pixel-art.tsx`:
    inline after the intro's first sentence (1.15 em tall), animation fades in over 0.5 s
    on hover, never shown with reduced motion (`unoptimized`: next/image would flatten it).
  - **Card text must fit its cell (found by measuring):** home now has square cells on
    phones too, which writing/status cards never had; and several cards were squeezed
    already: the Projects and Games **text** cards at 360–390 px on their own pages, and
    `/writing` at 1024–1279 px (square cells there). Budgets (160 px phone cell ≈ 100 px
    under the label; 230 px at 1024 ≈ 162 px): phones show title + one line (writing:
    no tag badge, 2-line title, date; latest article: title + date; Now producing: badge +
    title, bars from `sm`; project text: title; game text: badge + title; YouTube: button
    beside the words); `lg` hides or shortens summaries and steps titles down. Titles are
    `shrink-0`. Check: `fit.mjs` (scratchpad) on all seven card pages.
  - Tested: tsx 17 (home layout 5: featured + 4, status marked or not, never twice, only
    marked items, newest first with date-only strings, empty; `gridHoles` with the block;
    `fillGrid({ intro })` full for every arrangement of up to 9 cards; section pages
    unchanged) + hobbies 4 + games 5. Production build, Edge and real Firefox: home 21 each
    (order, Now producing without link, both books being read, Learning items, no
    duplicates, 4 articles newest first, marked items, YouTube then archive, drop-in 0.15 s
    apart, pixel art loaded / hover cross-fade 0.5 s, console clean, 9 widths: full grid,
    no sideways scroll, intro fits, every card fits) + reduced motion 2 each (no animation,
    no delays); fit check on `/`, `/writing`, `/projects`, `/reading`, `/music`, `/games`,
    `/hobbies` at 9 widths: 7/7 each; Games 23 each (made data-driven). The step-5 Hobbies
    check now fails on its "four samples" assumptions only (live data changed by Ivan's
    checklist); `/hobbies` passes the fit check.
- **Ivan's browser checklist** for step 6 (laptop Firefox, then phone):
  1. Home: the intro top-left with Shinx after the first sentence; hover Shinx: it fades
     into the wagging animation (and back). Both themes: no white box around it.
  2. Beside the intro the latest article (wide); then "Now producing" (the in-progress
     sample sketch), both books being read, the Learning items (your "coffee" photo is in
     the Learning category, so it's here: change its category if that's not wanted).
  3. Then newest first: 4 more articles mixed with the items marked "Show on home"
     (Pixel Racer, Hollow Knight (sample), Ethiopia Guji); YouTube and the archive last.
  4. Admin: tick "Show on home" on a book or song → it appears in date order; untick → gone.
     Mark a second song in progress and drag it to the top of Music → it becomes "Now
     producing". Undo afterwards.
  5. Cards behave as on their pages (book tilt, record, game pop and PRESS START, hobby
     photo/cut-out effects); song cards on home are labelled `Music · <title>`.
  6. Widen and narrow the window: no gaps (a "Writing · More" card may fill one); text
     never cut off mid-line.
  7. Phone: the intro on its own, then square cards; writing cards show title and date;
     everything readable; taps open the right pages. Reduced motion (if used): Shinx stays
     still.
  8. /writing, /projects and /games still look right (their text cards got phone/laptop
     sizes).

## After Phase 3: Shinx in the footer (done 2026-10-06, tested by Ivan: checklist 1–5)
Ivan's choices: the line "Made in the lab by Gvan"; no copyright line and no footer links
(like chester; the links are in the header); Shinx 60 px tall.
- **Reference:** Ivan's screenshot `design-refs/Screenshot 2026-10-06 060359` plus chester's
  live footer read in headless Edge (`chester-footer.mjs` in the scratchpad): `<footer
  class="flex justify-center pt-36 pb-20">`, one `group` holding the art (an animated GIF
  131 × 70 in the flow at `opacity-0`, the still 40 × 40 centred over it) and the line
  (`text-sm tracking-tight text-neutral-400`, 14 px, −0.35 px); hover anywhere in the group:
  `opacity` 0.5 s, Tailwind's default curve.
- `components/site-footer.tsx`: that layout with our muted colour; no `"use cache"` any more
  (it no longer reads the clock for the year). `components/pixel-art.tsx`: 95 × 60 (the
  190 × 120 files at exactly 2×), still and animation stacked, hover on the parent
  `group/art`, the animation `motion-reduce:hidden`. `app/page.tsx`: the art is out of the
  intro.
- The art is lazy-loaded (`next/image` default), so it's only fetched as the footer nears
  the screen; Firefox waits until then, Edge starts a little earlier.
- Tested: production build, Edge and real Firefox, 24 each: the footer on `/`, `/projects`,
  an article, the 404 page and `/login` (only the art and "Made in the lab by Gvan", no
  links, art 95 × 60 and line centred to the pixel, padding 144 / 80, no border, 14 px Inter
  −0.35 px, both images loaded once in view, console clean); the intro has no art; hovering
  the art and hovering the line each cross-fade in 0.5 s and back; centred with no sideways
  scroll at 9 widths. Reduced motion 1 each: the still stays, the animation never shows.
  (The step-6 home check's pixel-art items are retired: the art isn't in the intro now.)
- **Ivan's browser checklist** (laptop Firefox, then phone):
  1. Any page: at the bottom, Shinx centred above "Made in the lab by Gvan", lots of space
     around, nothing else (no ©, no links, no line above).
  2. Hover Shinx, then hover the words: either one makes Shinx fade into the wagging
     animation, and back when you move away.
  3. Home: the intro reads normally without the art.
  4. Both themes: Shinx has no white box; check the thin tail line is visible enough in dark
     mode.
  5. Phone: centred and sized well; reduced motion (if used): Shinx stays still.

## Demo content + favicon (2026-10-06)
For showing the site to an engineer: a polished demo set in every section, and the
browser-tab icon made from Ivan's pixel Shinx. Plan approved by Ivan; run with the service
key from `.env.local`.
- **Found first:** every content table was already empty (0 rows, drafts included), so
  nothing needed deleting; Ivan's song "speki" was gone too (noted in CLAUDE.md).
- `scripts/demo-content.mjs` (`remove`; `add <assets-dir>`) and
  `scripts/demo-content-data.mjs` (the content). Ids `de300000-0000-4000-8000-…` (posts
  101+, projects 201+, books 301+, tracks 401+, games 501+, hobbies 601+); files in
  `<section>/demo/`. `remove` deletes by id range (uuid columns can't use `LIKE`), items
  before posts, then every file in the `demo/` folders. `npm run demo:remove`.
- Images go through the admin's rules (EXIF rotation, longest edge 2400 / covers 1200,
  WebP 85%, no metadata); article image URLs carry `#WxH` like the editor's.
  - Photos: Unsplash, free licence only (`images.unsplash.com/photo-…`, never `premium_`),
    found by reading the public search page in headless Edge (the API needs a key).
  - Book covers: Open Library by ISBN.
  - Projects: Ivan's real projects. LoL Voice Coach and Brainrot Authenticator are screenshots
    of their live sites; AI Player Finder (no live site) is a mock screen drawn from its
    README. PixelForge left out (its repo is empty).
  - Games: mood photos, not game screenshots (those are the studios' copyright).
  - Music: covers drawn as SVG; two original 26-second synth loops rendered sample by sample
    and encoded with the project's lamejs (192 kbps, 0.5 s / 2 s fades); no samples used.
  - Cut-outs: a green key (monstera on beige) and a flood fill over a black background
    (haworthia in a white pot); plain white-key flood fills failed on shadows and gradients.
- Content: 16 articles over 7 Sep – 5 Oct (code titles, highlighted lines, line numbers,
  captioned images, a table, task lists, footnotes, quotes, a cover image, Ivan's YouTube
  video), 2 book reviews, 4 game reviews, 2 song articles, a project article (from the AI
  Player Finder README). No quotes attributed to real books or games.
- **Book covers taller than 2:3 broke phone cards** (Dune 1:1.8: author line 16 px out of
  the card at 360 px). `BookCover` now caps a cover at 1.5 × its column's width
  (`@container` + `max-h-[150cqw]`, `w-auto max-w-full`, the shadow box `w-fit`): taller
  covers keep their shape and get narrower.
- **Favicon:** the pixel Shinx was drawn in 12 px blocks on a checkerboard baked into the
  PNG; flood fill removes the checkerboard, one sample per block gives the native 51 × 36
  sprite, scaled by whole numbers only where it fits. `app/favicon.ico` (16/32/48, PNG
  inside), `app/icon.png` (32), `app/apple-icon.png` (180, on the page colour). Branding
  sweep: nothing default left (public/ holds only the art; titles and link previews are
  the site's own).
- Tested: production build, Edge and real Firefox, 26 each: every section page (cards,
  images load, console clean), home (full without a filler, Now producing = Static Bloom),
  every article's features (code titles, line numbers, highlighted lines, images and
  captions, table, footnotes, task lists, quotes, YouTube only where set, the cover only
  where set), each "about this" panel, both audio players (0:26), the three icons linked
  and served. Fit check on all seven card pages at 9 widths: 7/7 each. Firefox's
  `__cf_bm` cookie messages from Supabase Storage are expected noise.

## Home intro (2026-10-07)
Ivan's own text: three paragraphs, key words in ink (Gvan, lab, creating things,
Polacrity, music, Spektral, insects, birds, reading, writing); links music → /music,
insects and birds → /hobbies, reading → /reading, writing → /writing; Polacrity unlinked
(`TODO(Ivan)`). The newsletter line is gone (Phase 6 needs a new spot for it).
- **Chester's intro, measured in headless Edge:** one `h1`, Fraunces light, muted, ink
  words near-black; paragraphs split by `<br><br>` (a gap of exactly one line); 24/30 px on
  phones, 30 px from `sm`, 36/45 px from `lg` (`leading-tight`); padding 16 px, 32 px from
  `sm`; a square 2 × 2 box at desktop, text filling 72 % (1440 px) to 84 % (1024 px) of it.
- **Ours:** `<p>`s with `[&>p+p]:mt-[1lh]` (one line between paragraphs), light serif,
  `leading-tight`, `p-4 sm:p-8`, 24 px on phones and 30 px from `sm` like chester. From `lg`
  our grid is already 4 columns (chester switches at 1280), so the box is smaller (468 px at
  1024 against his 640): the size is `5.7cqw` of the intro's own box (`@container`), which
  keeps the same line breaks at every width, so it always fills the same share: 85–86 %,
  27 px at 1024 up to 41 px at 1920. (5.2cqw left 71 % and 104–177 px empty above the cards.)
- Tested, Edge and real Firefox, 14 each: the text, the ten ink words, the five links,
  console clean; at 10 widths 360–1920: no overflow, no sideways scroll, paragraph gap = one
  line; phones and tablets: cards start 24–40 px below the text (padding + grid gap);
  desktop: 85–86 % fill, cards 36–77 px below the text. Home fit check: 1/1 each.

## Phase 4 — Accounts + Settings (done 2026-10-07)
Plan, steps and Ivan's decisions: CLAUDE.md, "Start here".

- **Step 0 — Guards (done 2026-10-07; migration applied with Ivan's OK; tested by Ivan:
  `rls-check.sql` all passed, the dashboard's "Truncate table" on `hobby_items` refused).**
  - **The investigation** (how every content table got emptied before the demo):
    - Not the repo: migrations only create tables, policies and views (the two applied on
      2026-10-05 only touched views, before the data was last seen); the app's deletes
      are single-row (`.eq("id", id)`); the demo script deletes only `de300000-` ids. No
      `db reset --linked`: the `admins` row dates from 2026-09-30 (a reset recreates it,
      and with seeding on would have brought the samples back).
    - Not a Claude session: the session transcripts (`~/.claude/projects/…/*.jsonl`) show
      every command; nothing wrote to the database in the window (no Playwright, no
      subagents).
    - Window (AEST, 2026-10-06): hobby items listed at 00:19; a local production build at
      06:08 still prerendered `sample-rls-explained`; all six tables had 0 rows at 06:33
      (`admins` and Storage intact). The demo script's first run (06:37) failed on its
      first delete (`uuid ~~ unknown`), so it removed nothing. In between, Ivan was in the
      dashboard creating the secret key.
    - Most likely `TRUNCATE posts … CASCADE`: it empties posts and every table with a
      foreign key to it (exactly the five item tables, not `admins`), and skips the row
      rules that refuse deleting an article a published song or game needs. Ivan doesn't
      remember it; the SQL editor's history has nothing; logs had expired (free plan).
  - **Truncate guard:** `supabase/migrations/20261007130000_truncate_guard.sql`:
    `public.refuse_truncate()` (statement trigger, raises unless
    `app.allow_truncate = 'on'`, with a hint on how to do it on purpose) on `posts`, the
    five item tables and `admins`; `revoke truncate` from `anon`, `authenticated`,
    `service_role`. `rls-check.sql` gained a "Guards" part (as the owner): every table
    has the trigger enabled, no API role can truncate, and the behaviour on a temp table
    (refused, then allowed when switched on). It never truncates a real table.
  - **Backups:** `scripts/db-backup.mjs` (`npm run db:backup`, `npm run db:restore --
    <file> [--apply]`). Service key, every row in id order, 1000 a page; warns about API
    tables it doesn't know (from the API's OpenAPI listing). Restore refuses a backup from
    another project, lists missing rows by id, inserts only those (articles first), and
    retries a failed batch row by row so one bad row doesn't stop the rest (exit code 1).
    `supabase db dump` was tried first: it needs Docker (not installed).
  - Tested on the live database with `[test]` drafts (deleted afterwards, with the test
    backups): backup → delete → list (1 missing) → `--apply` → the row is identical to
    the backup (timestamps, accents, arrays) → a second run finds nothing missing; a hand-made
    backup with one valid and one invalid row (published hobby without category): the
    valid one restored, the invalid one reported with the check's name, exit code 1.
    Dry run lists only the new migration; lint and build pass.

- **Step 1 — Schema (done 2026-10-07: applied with Ivan's OK; Ivan ran `rls-check.sql`, all passed).** Plan and the table's rules:
  CLAUDE.md, "Start here". Ivan's choices: Google sign-ups get only the first name,
  everyone else "Reader"; the reserved list as proposed; his profile `gvan` / "Gvan".
  - `supabase/migrations/20261007140000_profiles.sql`: `is_reserved_name()` (lowercased,
    non-alphanumerics removed), `profiles` + `check_profile_names()` trigger (reserved
    names refused unless the row's id is in `admins`), `create_profile_for_new_user()`
    on `auth.users` (made safe so it can never block a sign-up), backfill of existing
    accounts (the admin renamed to gvan / Gvan), RLS + column grants (only username,
    display name, picture are updatable), truncate guard, `avatars` bucket and its four
    storage policies (Storage needs `select` to replace or delete), `delete_my_account()`.
  - The provider comes from `raw_app_meta_data` (set by the server):
    `raw_user_meta_data` can be sent by anyone signing up through the API, so an email
    sign-up with a name in its metadata still gets "Reader".
  - `rls-check.sql`: visitors read profiles but can't edit them or call
    `delete_my_account()`; the admin can't delete the admin account; a "Sign-up" part
    adds five fake accounts (email, Google with given name, Google with full name only,
    Google with a reserved first name, email with a name in its metadata) and checks
    their usernames and display names, and that the admin is gvan / Gvan; a "reader"
    part checks no drafts, no content writes (one row tried each), uploads only to the
    own avatars folder, own profile only (three columns; not `created_at`, no insert or
    delete), reserved / malformed / taken usernames, reserved / padded / empty display
    names, picture paths in other folders, then `delete_my_account()` removes the
    account and its profile. 32 PASS lines in all.
  - Checked over the API after applying: visitors see only `gvan` / "Gvan" (created
    2026-09-30); a visitor's edit and `delete_my_account()` get 401 "permission denied";
    the avatars bucket is public, 1 MB, WebP/JPEG/PNG. `db:types` added `profiles`,
    `delete_my_account` and `is_reserved_name`. Backup includes `profiles`. Lint and
    build pass.

- **Step 2 — Sign-in for everyone + `/privacy` (done 2026-10-07; tested by Ivan, checklist 1–8;
  both templates pasted into Supabase before testing).** Ivan set up Google
  Cloud (Testing, his Gmail + test-reader email as test users) and Supabase (Google
  provider, manual identity linking, URL configuration) first.
  - `lib/next-path.ts` (moved out of `lib/auth.ts`, which is server-only, so the browser
    and tests can use it): `safeNextPath` (default now `/`; refuses other sites,
    backslashes and control characters, since browsers drop tabs and newlines and
    `/\t/evil.com` would become `//evil.com`; never `/login` or `/auth`, which would
    loop), `nextFromLink` (a path, or a full URL on this site's origins: what comes back
    through the email), `emailReturnAddress` (the page's path on `site.url`, query
    dropped because it travels inside the email link's own query string).
  - Email: `app/login/actions.ts` now creates accounts (`shouldCreateUser: true`) and
    sends `emailRedirectTo`; the templates' link is `{{ .SiteURL }}/auth/confirm?…&next=
    {{ .RedirectTo }}`, so it still goes to the live site and works with old and new
    code either way (old route: a full URL fails its check → `/admin`; new route: no
    redirect address → Supabase's Site URL → `/`). `supabase/templates/confirm-signup.html`
    (new readers get "Confirm signup", returning ones "Magic Link"). Real errors now say
    so (any address gets an email now, so there's nothing to hide).
  - Google: `components/google-button.tsx` (browser `signInWithOAuth`, PKCE verifier in a
    cookie; resets after Back from Google), `app/auth/callback/route.ts`
    (`exchangeCodeForSession`, then `next`; failure or cancel → `/login?error=google`).
  - `/login`: `sign in.` header and copy, Google, "or", email (no auto-focus: it would
    open the phone keyboard), errors `link` / `google` / `not-admin`, signed in →
    `next`, link to `/privacy`. `button-secondary` utility in `globals.css`.
  - Header: `components/account-menu.tsx` in `<Suspense>` (reads the URL). Signed out:
    "Sign in" with `?next=` (path only). Signed in: 24 px initial; menu with name,
    @username, Admin (only if `is_admin()`), Sign out (`scope: "local"`, stays on the page
    except `/admin` and `/settings`). Re-checks the session on every page change and on
    window focus, because signing in with the code (server action) or signing out of the
    admin changes the cookie without telling the browser client; the profile is fetched
    only when the person changes. Open state = the page it was opened on, so a page
    change closes it (no `setState` in an effect: lint rule). The admin bar's sign-out
    is `scope: "local"` too.
  - `/privacy` (static): no analytics, theme in local storage, Vercel logs, YouTube
    thumbnails vs click-to-play embeds; private (email, sign-in method, dates, Google's
    name / email / picture, first name used) vs public (display name, username, join
    date); sign-in cookies; Supabase (Tokyo), Vercel, Resend, Google; removal by email
    until 4.4; contact `starfoxlabs.contact@gmail.com`. Keep it true as later steps add
    pictures, deletion, comments and the newsletter.
  - Tested: tsx 5 groups (`next-path`: allowed paths, other sites and tricks, no loops,
    full URLs only on this site incl. percent-encoded, return address round trip).
    Production build: public pages still static, `/privacy` ○, `/auth/*` ƒ. Edge on :3124,
    29 checks, with a throwaway reader made by the service key and signed in without any
    email (`admin.generateLink` → `verifyOtp` in Node, cookies handed to the browser),
    deleted afterwards (0 left): profile Reader / reader_…; Sign in link with `next`, none
    on home; no layout shift signed out or in; `/login` contents and errors; Google →
    Supabase authorize with `provider=google`, S256, `redirect_to=…/auth/callback?next=…`,
    verifier cookie on our site; `/privacy`; callback and confirm redirects incl. other
    sites; avatar button, menu contents (no Admin), Escape, outside click, page change;
    `/login` signed in → `next` or `/`; reader on `/admin` → not-admin; sign out stays,
    cookie gone, account kept; phone 390 px: no sideways scroll, Google button ≥ 44 px;
    console clean. Test gotchas: wait for `load`, not `networkidle0`, between `/login`
    URLs; after an aborted navigation read cookies with `page.cookies(url)`.

- **Step 3 — Settings: Profile + Appearance, profile pictures (done 2026-10-07; tested by Ivan,
  checklist 1–8).**
  Ivan's choices: automatic centred square crop; a Google picture copied only at
  sign-up; appearance saved per browser; no username-change limit for now (to-do for
  Phase 5).
  - **Images moved** (`git mv`, so history follows): `lib/admin/image-rules.ts` →
    `lib/images/rules.ts`, `prepare-image.ts` → `prepare.ts`, `prepare-image-server.ts` →
    `prepare-server.ts`, `fetch-remote-image.ts` → `fetch-remote.ts`; the admin's
    behaviour is unchanged. New: `AVATAR_RULES` (512 px, 1 MB), `prepareAvatar` (browser:
    oriented bitmap, crop + first step down to at most 2048 px in one draw, since a full
    6000 px square is a canvas phones refuse, then halving to 512, WebP/JPEG, no
    metadata), `prepareAvatarOnServer` (sharp: rotate, centred `cover` square, WebP;
    `openImage` shared with `prepareImageOnServer`).
  - `lib/avatars.ts` (URL, `newAvatarPath` = `<id>/<32 hex>.<ext>`, `isOwnAvatarPath`,
    `initialOf`, `isNewGoogleSignUp` = provider google and created < 10 min ago,
    `googlePictureUrl` = https on `*.googleusercontent.com` only, size asked `=s512-c`),
    `lib/profile-rules.ts` (username / display name rules, `isReservedName` mirroring
    `public.is_reserved_name()`, database error → field message), `lib/profile-events.ts`
    (Settings → header), `lib/theme.ts` (saved choice: light / dark / none = device; the
    header toggle and Appearance both go through it, `THEME_CHANGED`).
  - `lib/google-picture.ts` + `app/auth/callback/route.ts`: a new Google account's picture
    is copied in `after()` (runs once the redirect is sent), acting as the user with
    their access token (never the service key): only if the profile has no picture,
    through the safe remote fetch, uploaded to their folder, set only `where avatar_path
    is null` (else the upload is removed). A failed callback for someone signed in
    (linking Google) goes back to the page with `?error=google`.
  - `/settings` (`app/settings/`): layout with `settings.` header and tabs (Profile,
    Appearance); `proxy.ts` now also runs on `/settings` (signed out → `/login?next=`),
    and every page calls `requireUser()` (new in `lib/auth.ts`) inside its own
    `<Suspense>`. Profile: `PictureField` (pick → prepared in the browser → preview →
    upload to `avatars/<id>/` → `savePicture` action points the profile at it and deletes
    the old file; failed save removes the upload; Remove), `ProfileForm` (username
    lowercased as you type, rules, then "taken" / "Available." after a 400 ms pause; Save
    off while it's wrong; `saveProfile` action checks again; reserved names allowed for
    the admin), `SignInMethods` (email always; Link Google = `linkIdentity` → Google →
    `/auth/callback?next=/settings`; Unlink only with 2+ identities, two-step; resets
    after Back from Google). Appearance: static page, `ThemeChoices` with
    `useSyncExternalStore` (follows the header toggle and other tabs).
  - Header menu: picture (`components/avatar.tsx`, next/image, or the initial),
    Settings link, reloads on `PROFILE_CHANGED`; Settings and Admin links have
    `prefetch={false}` (after signing out, their prefetch was redirected to `/login` and
    logged a 404). `/privacy`: pictures public, cropped, stored without location; a
    Google sign-up's picture copied and removable.
  - Tested: tsx 12 + 2: the redirect rules (5); reserved names compared with the
    database's `is_reserved_name()` over the API for 39 names; username / display name
    rules; error mapping; avatar paths (incl. `../`, other folders, wrong names);
    Google picture addresses (other hosts, http, ports, credentials, metadata address,
    too long); new-sign-up rule; server avatar with `--conditions react-server` (a
    3000 × 1800 JPEG stored sideways with EXIF orientation 6 + GPS → upright 512 square
    WebP, no EXIF, centre pixel on the stripe; small not enlarged; GIF refused).
    Production build on :3124, Edge: `settings-check` 29 (two throwaway readers, one
    owning a "taken" username, signed in without email, deleted with their files):
    signed-out redirects, menu link, page contents, tab; username reserved / short /
    taken / available, Save on and off; save → "Saved.", database and header updated;
    a reserved name set straight in the page refused by the server; picture preview,
    upload, file checked (512 square WebP, no metadata, upright), header shows it,
    replace leaves one file, remove clears both; Link Google reaches Supabase's
    `/user/identities/authorize` with our callback and goes on to Google;
    `?error=google` explained; appearance (device → dark → reload → header toggle →
    light → device; attribute, storage and radio in step); phone 390 px (no sideways
    scroll, controls ≥ 44 px); console clean. `signin-check` rerun: 29 (menu now has
    Settings first). Gotchas: select an input's text with `el.select()`, not a triple
    click; tsx flags (`--tsconfig`) before Node flags (`--conditions`).

- **Step 4 — Settings → Account: sign out everywhere, delete account (done 2026-10-07;
  tested by Ivan, checklist 1–7).** Ivan's choices: confirm by
  typing the username; backups pruned after 30 days, said on `/privacy`; "Sign out on all
  devices" added; orphaned profile pictures added to the "Unused media" to-do.
  - `app/settings/account/` (`page.tsx`, `delete-account-form.tsx`, `actions.ts`): email
    and "Member since" (private); **Sign out everywhere** (`signOut({ scope: "global" })`
    → `/login?notice=signed-out-everywhere`); **Delete account** (button off until the
    username is typed exactly; the admin sees a note instead). `deleteAccount`: checks
    the typed username again and refuses the admin, clears `avatar_path`, lists and
    deletes every file in `avatars/<id>/` (strays too), calls `delete_my_account()`,
    signs out locally and removes any `sb-` cookie left, then `/goodbye`. Any failure
    stops with "try again"; files go first because SQL can't delete Storage files.
  - `app/goodbye/page.tsx` (static, noindex); Settings tabs gain Account; `/login` shows
    notices; `/privacy`: Settings → Account → Delete account, backups kept ≤ 30 days,
    removing the Google connection; `scripts/db-backup.mjs`: each backup run deletes
    `backups/<date-time>.json` older than 30 days (by the date in the name).
  - **Found by the checks: deleted pictures stayed public.** Supabase's CDN (Cloudflare)
    keeps serving a deleted file until its Cache-Control runs out (probe: HIT after the
    delete; only a new query string reached Storage's 400), and Vercel keeps optimized
    copies for max(4 h `minimumCacheTTL`, the upstream max-age) with no way to clear
    them. Pictures were uploaded with a year. Now `AVATAR_CACHE_SECONDS = 3600`
    (`lib/avatars.ts`, used by the picture field and the Google copy): a deleted or
    replaced picture is gone everywhere within ~4 hours; `/privacy` says so. Article
    images and covers keep a year.
  - Tested: production build (`/goodbye` ○, `/settings/account` ◐), Edge on :3124:
    `account-check` 19 (signed-out redirect; tab contents; button off / almost / exact;
    the server refuses a wrong username sent past the form; delete → `/goodbye`, account
    + profile + picture + a stray file gone, Storage answers 400, signed out, `/settings`
    asks to sign in; the same email signs up as a fresh account; sign out everywhere →
    note, this browser signed out, a second session can't refresh, account kept; phone
    390 px; console and 404s clean), `settings-check` 30 (+ pictures cached an hour),
    `signin-check` 29. Backup pruning: a 67-day-old backup deleted, a 10-day-old one and
    a file with another name kept. Gotcha: Claude Code's Bash tool was blocked for a
    while ("classifier gave no verdict"); the PowerShell tool still worked.

- **Step 5 — The end-of-article sign-up prompt (done 2026-10-07, switched off; tested by Ivan
  with the switch on locally, checklist 1–8, then switched off again).**
  Ivan's choices: the drafted wording; just above Comments; short articles after 15 s;
  never again once someone was signed in on this browser. Off until Phase 5.
  - `lib/features.ts`: `SIGN_UP_PROMPT` = `NEXT_PUBLIC_SIGN_UP_PROMPT === "on"` (fixed at
    build time; only set in `.env.local` to try it, never on Vercel; listed in
    `.env.example`). Off: the article page renders neither the marker nor the prompt,
    so the HTML is unchanged (checked).
  - `components/sign-up-prompt.tsx`: an `aside` (`reveal` fade-in, off with reduced
    motion) above Comments: "Enjoyed this?", the text, **Sign up** (`/login?next=
    /writing/<slug>#comments`), **Not now**, Privacy. Shown when the `#article-end` marker
    (after the body) comes into view after a scroll; if the whole article fits on the
    screen, after 15 s. Never with a session, nor where `starfox:had-account` or
    `starfox:sign-up-prompt-dismissed` is remembered (`lib/sign-up-memory.ts`; blocked
    storage reads as "nothing remembered"). `AccountMenu` remembers "had an account"
    whenever it sees a session.
  - Tested: build with the switch off (no marker or prompt in the article HTML); build
    with it on, Edge on :3124, `prompt-check` 18, each in a fresh profile: not on load,
    not just before the end is in view, no layout shift while reading; appears at the
    end, above Comments; Sign up link; fade-in; Not now hides it and is remembered
    (reload, another article); never for a signed-in reader, nor after signing out on
    that browser; a screen tall enough to fit the article: not at 5 s, there by 15 s;
    storage blocked: still shows, Not now still hides; reduced motion: no animation;
    phone 390 px (fits, buttons ≥ 44 px); console clean. `signin-check` rerun: 29. Then
    rebuilt with the switch off. Gotcha: with a 900 px window, "halfway down" an
    1800 px article already shows the end; test "just before the end is in view".

## Phase 5 — Comments (done 2026-10-08)
Plan, steps and Ivan's decisions (2026-10-08): CLAUDE.md, "Start here".

- **Step 1 — Schema (done 2026-10-08: applied with Ivan's OK; Ivan ran `rls-check.sql`, all passed).**
  - Backup first (`backups/2026-10-08T02-10-30.json`).
  - `supabase/migrations/20261008100000_comments.sql`: `comments` (`post_id` cascade,
    `user_id` → profiles `on delete set null` = "deleted user", `parent_id`, `body`
    1–2000 characters with no leading/trailing space, `by_admin`, `created_at`,
    `edited_at`, `deleted_at`; placeholders have an empty body and no author).
    `check_new_comment()` (before insert, security definer): reply rules first (parent
    exists, is top-level, same article, not deleted; parent read `for share` so a reply
    can't slip in during a delete), then `by_admin`, then the rate limit (per-person
    advisory lock; 20 s / 30 per 24 h; `PT429`, which PostgREST answers with 429;
    the admin and inserts without a user, e.g. restores, skip it). `mark_comment_edited()`.
    RLS: read on published articles (admin all), insert as yourself on published
    articles, update own non-deleted; grants: insert `(post_id, parent_id, body)`,
    update `(body)`, no delete. `delete_comment(id)` → `removed` / `placeholder` /
    `gone`. Truncate guard. Username limit: `profiles.username_changed_at`,
    `limit_username_changes()` (after `profiles_check_names`, by trigger name order;
    `PT429`), `next_username_change()`; `profiles` select is now granted per column
    (without `username_changed_at`). `profileSaveError` maps `PT429`.
  - `rls-check.sql`: 51 PASS lines. Name checks moved before the reader's first rename
    (otherwise the 30-day limit would refuse them first). The comments part steps
    around the rate limit by backdating the reader's comments as the owner (`now()` is
    fixed for the whole transaction) and adds 29 old ones to reach the daily limit.
    Gotcha (Ivan's first run failed on it): `if delete_comment(x) <> 'removed' or
    exists (… where id = x)` is one statement, and its `exists` reads the snapshot
    taken before the function deleted the row. Call the function in its own
    statement (`outcome := delete_comment(x)`), then check.
  - `db-backup.mjs`: `comments` in `TABLES` (after `profiles`), restores top-level
    comments before replies, readable labels for rows without a title.
  - Checked: every statement and PL/pgSQL body parsed with `@libpg-query/parser`
    (scratchpad; `parsePlPgSQL`, DO blocks wrapped as functions; a broken block is
    caught); dry run listed only this file. Over the API after applying, as a visitor:
    comments readable (empty), profiles readable, `username_changed_at` 401, insert 401,
    `delete_comment` and `next_username_change` 401. `db:types` added `comments`,
    `username_changed_at`, both functions (`next_username_change` is typed `string` but
    returns null when a change is allowed). Backup includes comments; lint and build pass.

- **Step 2 — Comments on articles (done 2026-10-08; tested by Ivan, checklist 1–9).**
  - `lib/comments.ts` (browser-safe, tested): `COMMENT_MAX` 2000, `COMMENTS_PAGE` 30,
    `COMMENT_COLUMNS` (author embedded from `profiles`), `normaliseCommentBody` (CRLF,
    3+ blank lines → 1, trim), `commentProblem`, `buildThreads` (replies oldest first,
    ties by id), `countVisible`, `afterDelete` (mirrors `delete_comment()`),
    `authorState` (author / deleted user / placeholder), `mentionFor` (a reply to a
    reply starts `@username `), `relativeTime` (just now … 6 days ago, then the date),
    `commentError` (PT429 and the reply rules' own messages; raw constraint names
    replaced). `lib/comments-api.ts`: browser calls (page of top-level comments by
    keyset on `created_at, id` + their replies, exact count without placeholders,
    post, edit, `delete_comment`).
  - `components/comments.tsx`: loads when the section is within 800 px of the screen
    (an IntersectionObserver; a `#comment-…` link loads on its first callback, then
    scrolls to the comment and tints it), heading count, the viewer from
    `onAuthStateChange` (follows the header's sign-out; profile fetched in a
    `setTimeout`, as Supabase advises), box for signed-in readers ("Comment as
    <name>…"), "Sign in to join the conversation." otherwise (`next` =
    `/writing/<slug>#comments`), threads with replies indented under a rule from the
    picture, Reply / Edit / Delete (two-step: "Delete this comment?" Delete / Keep),
    placeholders ("This comment was deleted.", no Reply in that thread), "deleted
    user", AUTHOR badge (`tone-lavender`), time links to `#comment-<id>` (full date as
    tooltip), "· edited". `components/comment-form.tsx`: grows with the text, count
    from 1,800, Ctrl/⌘+Enter, Escape cancels replies and edits, `autoComplete="off"`
    (Firefox form restore). The article page keeps a static `<section id="comments">`.
  - Lint gotchas (React compiler rules): no `setState` at the top of an effect (start
    async work with the `await`; the observer's first callback instead of a direct
    call), no `Date.now()` in handlers defined in the component body (the reply box is
    keyed by the comment it answers).
  - Tested: tsx 7 groups (normalising, limits, threads, deletes, authors/mentions,
    relative times, errors). Production build (articles still ○). Edge on :3124,
    `comments-check` 45, on the newest demo article with two throwaway readers (and a
    third for the phone), everything deleted afterwards (0 comments, 0 accounts left):
    static HTML has the section; nothing fetched before scrolling near; signed-out
    link; Post off when empty / spaces / over 2,000; posting tidies the text; name,
    @username, "just now", line breaks; count 0 → 1 → 2 → 1; the second comment within
    20 s shows the database's "Slow down…" and keeps the text; count from 1,850 and the
    box grows; edit focused, saved, "edited"; someone else's comment has only Reply;
    reply box empty and focused, reply saved and indented, box closes; reply to a reply
    starts `@username `; Escape closes; `#comment-` link loads, scrolls, tints; Delete
    asks, Keep keeps; placeholder keeps the reply, no Reply there; last reply removes
    both; 31 comments: 30 newest first, count 31, Show more adds the last without
    repeats; a deleted account's comment shows "deleted user"; signing out in the
    header swaps the box for "Sign in"; phone 390 px: no sideways scroll (long words and
    addresses wrap), buttons ≥ 44 px; console clean apart from the browser's own log
    of the deliberate 429. Test gotchas: while "Show more" loads its text is
    "Loading…" (wait for the comments, not for the text to go); test comment bodies
    must not end in a space (the database refuses them).

- **Step 3 — Moderation (done 2026-10-08; tested by Ivan, checklist 1–7).**
  - On articles the admin sees Delete on every comment (`Viewer.isAdmin` from
    `is_admin()`, read with the profile); Edit stays the writer's.
  - `/admin/comments` (new tab "Comments" after Hobbies; `ItemSectionKey` now excludes
    it): the latest 100 comments across articles, placeholders left out, newest first;
    author (or "deleted user"), AUTHOR badge, relative time (server clock), "edited",
    "reply", text clamped to 4 lines, "on <article> ↗" linking to
    `/writing/<slug>#comment-<id>` (unpublished articles named, not linked);
    `DeleteCommentButton` (Delete → Confirm delete, cancels itself after 5 s) →
    `deleteCommentAsAdmin` (server action: `requireAdmin`, `delete_comment()`,
    `refresh()`; no cache tags, comments aren't cached).
  - Tested: production build (`/admin/comments` ◐). `admin-gate-check` 3: a visitor is
    sent to `/login?next=/admin/comments`, a throwaway reader is turned away
    (not-admin) and sees no list. `comments-check` rerun: 45 (now on the newest article
    without comments, so real comments are never touched; Ivan's two checklist comments
    stayed). The admin's own view needs Ivan's sign-in: his checklist.

- **Step 4 — Wrap-up (done 2026-10-08; tested by Ivan, checklist 1–7).** Ivan's choices:
  read-only username with the date; Account shows the comment count; the switch removed;
  "Gvan" on `/privacy`.
  - Username: `/settings` reads `next_username_change()`; `saveProfile` returns it after a
    save (`nextUsernameChange`), so a change locks the field at once. `ProfileForm`:
    read-only (`read-only:` styles) with "You can change your username again on <date,
    time>"; otherwise the hint warns "You can change it once every 30 days." (not for
    the admin). `components/local-date-time.tsx`: `LocalDateTime` (UTC date from the
    server, local date and time in the browser via `useSyncExternalStore`, no hydration
    mismatch) and `localDateTime` (also the comments' tooltip).
  - Account: "You've written N comments." (counts the reader's live comments on
    published articles; RLS hides the rest) + "Your comments stay, shown as 'deleted
    user'…". `/privacy` (updated 8 October 2026): prompt memory, private rename date,
    public comments, a Comments section, backups hold comments, comments stay after
    deleting the account; owner named by `site.handle` ("Gvan").
  - Sign-up prompt always on: `lib/features.ts` deleted (`git rm`), the article page
    always renders the marker and the prompt, `.env.example` line removed.
  - Tested: production build; Edge on :3124, `wrapup-check` 15 (a throwaway reader: hint
    before, read-only + date 30 days on after saving, database change time, still
    locked after a reload with local time, display name still saves, a forced change
    refused with the 30-day message; Account 0 then 1 comment and the wording;
    `/privacy` contents, no "Ivan"; article HTML has the marker, no prompt on load,
    prompt after reading to the end above Comments; console clean), `comments-check`
    rerun 45.

## Phase 6 — Newsletter (in progress)
Plan and Ivan's decisions (2026-10-08): CLAUDE.md, "Start here".

- **Step 1, part A — Two-factor sign-in, the code (done 2026-10-08; tested by Ivan,
  checklist 1–8; his authenticator is set up).** Ivan's choices: admin only; one factor scanned onto two devices; the
  header's Admin link visible before the code; setup in Settings → Account.
  - Probe first (throwaway reader, Node): TOTP is on for the project; enroll → wrong
    code refused (`mfa_verification_failed`) → real code (RFC 6238, computed with
    `node:crypto`) → `aal2`; a fresh sign-in elsewhere is `aal1` with `aal2` next;
    removing a factor at `aal1` is refused (`insufficient_aal`).
  - `lib/admin-access.ts` (pure, tested): `adminAccess()` → signed-out / not-admin /
    needs-setup / needs-code / ok; `TWO_FACTOR_REQUIRED = false` until part B;
    `twoFactorPath()`, `TWO_FACTOR_SETUP_PATH`. `lib/auth.ts`: `CurrentUser.aal` (from
    the verified claims), `isAdminAccount()` (identity: reserved names, no account
    deletion, Settings' two-factor section; for now the `is_admin` RPC, part B adds
    `is_admin_account()`), `hasVerifiedFactor()` (`mfa.listFactors()`: asks Supabase
    Auth), `getAdminAccess()`, `isAdmin()` (powers: the admin routes), `requireAdmin()`
    (→ the code screen, or the setup once required). Settings' identity checks moved to
    `isAdminAccount()`.
  - `/login/two-factor?next=` (`app/login/two-factor/`): signed out → `/login?next=`;
    `aal2` or no factor → `next`; otherwise the form (`TwoFactorCodeInput` in
    `components/two-factor-code.tsx`: number pad, `one-time-code`, non-digits dropped,
    the sixth digit sends; `twoFactorError()`), `challengeAndVerify` in the browser,
    then `window.location.replace(next)` so the server reads the aal2 cookie from the
    start. `proxy.ts` matcher `/login/:path*` (was `/login`).
  - Settings → Account → "Two-factor sign-in" (`#two-factor`, admin only,
    `app/settings/account/two-factor.tsx`): clears a half-done setup, `enroll` with
    issuer "Starfox Labs", QR (Supabase's SVG data URL) + the key in groups of four,
    "scan it with your backup device too", code → on; "On since …"; Turn off needs a
    current code (verified first, since unenrolling needs aal2). The admin layout shows
    a reminder while no factor exists. `/login` intro no longer says "soon you can
    comment".
  - Tested: tsx 4 groups (access rules incl. part B's, path, errors). Production build
    (`/login/two-factor` ◐). Edge on :3124, `twofactor-check` 15 (throwaway reader with
    a factor added through the API): signed out → sign in; no factor → straight on;
    readers see no two-factor section and are turned away from the admin; issuer
    "Starfox Labs"; fresh sign-in aal1; number pad, focused; wrong code explained, box
    emptied; the right code typed with a space goes on to `next` and the cookie is
    aal2; aal2 → straight on; phone 390 px; console clean apart from the browser's own
    log of the deliberately wrong code (422). Reruns: `admin-gate-check` 3,
    `wrapup-check` 15. Gotcha: redirects inside streamed pages (`redirect()` behind
    `<Suspense>`) land after the `load` event; checks must wait for the address.

- **Step 1, part B — Admin powers require two-factor (done 2026-10-08: applied with Ivan's
  OK; Ivan ran `rls-check.sql`, all passed, and checklist 1–5).**
  - Backup first (`backups/2026-10-08T03-24-20.json`). Migration
    `20261008120000_admin_two_factor.sql`: `is_admin_account()` (identity) and
    `is_admin()` now also needs `auth.jwt() ->> 'aal' = 'aal2'` (same signature, so
    every policy, `reorder_items()` and `delete_comment()` follow; grants kept by
    `create or replace`). Identity rules that read `admins` directly are unchanged.
  - Code: `TWO_FACTOR_REQUIRED = true` (no factor → Settings → Account);
    `isAdminAccount()` and the header's Admin link use `is_admin_account()`; the
    admin banner removed; setup texts say the admin needs it.
  - `rls-check.sql`: 54 PASS lines: admin sessions carry `aal: aal2`; new parts: the
    admin at aal1 (no drafts, no writes, no reordering, can't delete others' comments;
    still `is_admin_account()` and keeps the reserved name), a reader with aal2 is not
    the admin.
  - Tested: both files parsed; dry run; over the API after applying: visitor, reader
    aal1 and reader aal2 all false / false; `db:types` added `is_admin_account`; tsx;
    build; reruns: `twofactor-check` 15, `admin-gate-check` 3, `wrapup-check` 15,
    `comments-check` 45. Gotcha (`wrapup-check`): typing into a server-rendered,
    streamed field before React hydrates it is lost; wait for the element's
    `__reactProps…` key first (earlier passes were luck).

- **Step 2 — Newsletter schema (done 2026-10-08: applied with Ivan's OK; Ivan stored the
  secret's hash, ran `rls-check.sql` (all passed) and added the secret to Vercel
  Production).** Live test with the real secret and the publishable key, 7/7: new
  address → pending, lowercase, "send"; again → no email; an older link refused; the
  link at millisecond precision confirms (with the time of consent); unsubscribe
  deletes; nothing left. Ivan's choices: CLAUDE.md, "6.2
  decisions".
  - `supabase/migrations/20261008130000_newsletter.sql`: `private` schema (not exposed;
    `private.newsletter_settings` = one row with the secret's SHA-256,
    `private.newsletter_secret_ok()`), `newsletter_subscribers` (email unique,
    lowercase, format-checked; `user_id` → auth.users cascade, unique; pending /
    confirmed; form / account; created / confirm sent / confirmed), `newsletter_digests`
    (status, window `covers_from`–`covers_until`, post and recipient ids, counts; one
    `sending` at a time by a partial unique index). RLS: admin (aal2) reads and deletes
    subscribers, manages digests; no other access. Visitor functions need the secret:
    `newsletter_subscribe` (advisory lock, 7-day cleanup, 24 h resend, 20 an hour,
    PT429; returns `subscriber_id, sent_at, send_email`), `newsletter_confirm`
    (latest email only, compared to the millisecond, 7 days; twice is fine),
    `newsletter_unsubscribe` (deletes). Reader functions: `newsletter_subscribe_me`
    (address from `auth.users`, confirmed at once, takes over a pending form row),
    `newsletter_unsubscribe_me`, `newsletter_my_status`. `delete_my_account()` also
    deletes subscriptions by account and address. Truncate guard on both tables.
  - `rls-check.sql`: 64 PASS lines (a Newsletter part with a test secret set inside
    the rolled-back transaction; time rules tested by moving rows back as the owner).
    `db-backup.mjs`: both tables; restore labels by email; **a listed table that
    doesn't exist yet is now skipped with a warning**: the backup before this migration
    crashed on it (the tables were listed first), so none was taken; the migration
    only added things, and backups work again (checked, plus a test with a made-up
    table). `.env.example`: `NEWSLETTER_SECRET=` (name only).
  - The secret: generated by Node (32 random bytes, base64url) straight into
    `.env.local`, never printed; only its SHA-256 shown, in the SQL line Ivan pastes.
  - Checked over the API after applying: visitors get 42501 on both tables, "Not
    allowed." with a wrong secret, 42501 on `newsletter_subscribe_me`; the `private`
    schema isn't served (PGRST106). Parsed, dry run, `db:types` (+91 lines), tsc,
    lint, build.

## Empty states + demo removal (2026-10-08)
Ivan's choices: drop ⌘K search; remove all demo content (including the three projects);
"Still growing" empty states with an original pixel-art sprout, easy to swap for his
own art; home must look good with little or no content.
- `components/sprout-art.tsx`: 16 × 16 pixel art written as text rows (one letter per
  pixel, colours in `COLORS`), drawn as an SVG (runs merged into rects,
  `crispEdges`, `image-rendering: pixelated`); four frames (seed on its mound → crack
  with a shoot tip → a hooked shoot with its first leaf → two leaves), switched by
  `sprout-f1`…`f4` keyframes (`step-end`, 5 s: 0.6 / 0.4 / 0.5 s, then the leaves held);
  without animation only the last frame shows. Fixed colours (mid-tones, fine on both
  themes' card colours). `lib/art.ts` `sproutArt`: Ivan's still + animated WebP instead.
- `components/still-growing.tsx` on all six section pages (Writing shows it instead of
  the search / tag browser); home: `StillGrowingCard` replaces the archive card (no "0
  articles") and the fillers (no "More in writing" to an empty page). `fillGrid` cases
  tested: nothing → YouTube widened + Still growing; 1–2 articles; a book being read.
- Pushed first (`d1f6136`, deployed), then `npm run db:backup`
  (`backups/2026-10-08T12-24-45.json`) and `npm run demo:remove` (40 rows; 27 files in
  the six `demo/` folders). Checked: every content table 0 rows, `demo/` folders empty;
  the `2026/` folders (old samples, speki) left alone.
- Tested: the art rendered once to check the frames (light and dark card colours).
  Production build against the empty database (`/writing/no-posts-yet` placeholder
  prerendered; `generateStaticParams` stays non-empty). **Gotcha:** the first build
  still showed the demo, because it reused cached database results from `.next/cache`;
  cleared, rebuilt. Edge on :3124, `empty-check` 24: every section page's text, line,
  sprout (4 frames, animations set), no cards, no "Nothing here yet", Writing without
  the search box; reduced motion: frames 0,0,0,1 and no animation; home at 390 / 800 /
  1280 / 1920 px: YouTube + "Lab · Still growing", no holes, no sideways scroll, no "0
  articles", no card links to empty sections (the intro's own word links are fine);
  phone `/music`; a removed article answers 404; console clean.

## Phase 8, step 1 — Sitemap + robots.txt (2026-10-08)
- `lib/sitemap.ts` (`sitemapEntries`, pure, tested): home, the six section pages, every
  published article (with its publish date; home and `/writing` take the newest),
  `/privacy`; absolute `https://starfoxlabs.org/…` from `site.url`; never admin,
  settings, sign-in, `/auth`, `/goodbye`. `app/sitemap.ts` loads the cached
  `getPublishedPosts()`, so the prerendered `/sitemap.xml` (○, 1 h) refreshes with the
  `posts` tag when the admin publishes. `app/robots.ts`: allow `/`, disallow `/admin`,
  `/settings`, `/login`, `/auth`, `/goodbye`; points to the sitemap (static ○).
- Tested: tsx 3 groups (empty site, dates, no private pages). Build. On :3124:
  `robots.txt` (text/plain, contents), `sitemap.xml` (application/xml, valid urlset, 8
  entries now, all https on the site, every one answers 200); the private pages send
  noindex. Ivan's check after his first article: it appears in `/sitemap.xml`.

## Phase 8, step 2 — RSS feed (2026-10-08)
Ivan's choices: summaries plus a "Read it on Starfox Labs" link (not whole articles);
the address `/rss.xml`.
- `lib/rss.ts` (pure, tested): RSS 2.0 with `atom:link rel="self"`; channel title,
  `/writing` link, description, `en`; `lastBuildDate` = the newest article's date (not
  the clock, so it only changes with an article); up to `FEED_SIZE` = 50 items: title,
  link, `guid isPermaLink`, `pubDate` (RFC 822 via `toUTCString()`), one `category` per
  tag, `description` = escaped HTML (`<p>summary</p><p><a>Read it on …</a></p>`).
  `xmlEscape` also drops control characters XML 1.0 forbids. `app/rss.xml/route.ts`:
  the cached `getPublishedPosts()`, so the prerendered feed (○, 1 h) refreshes with the
  `posts` tag; `application/rss+xml; charset=utf-8`.
- Discovery: `<link rel="alternate" type="application/rss+xml">` in the root layout's
  `<head>` (not in metadata: every page's own `alternates` would replace it); an "RSS"
  text link in the header after YouTube / GitHub (hidden on phones like them).
- Tested: tsx 3 groups (escaping incl. `<script>` and a control character, RFC 822
  dates, absolute links, 50-item limit, empty feed); both sample feeds and the served
  one parsed by Edge's `DOMParser` (no `parsererror`; the description decodes to HTML).
  On :3124: `/rss.xml` 200 with the right type; one head link on `/`, `/writing`,
  `/privacy`; the header link at 1280 px (hidden at 390), no sideways scroll; console
  clean. Ivan's check after his first article: it appears in `/rss.xml` (and in a feed
  reader).

## Phase 8, step 3 — Link previews (2026-10-08)
Ivan's choice: no counts in the images (platforms cache previews for days).
- `lib/section-meta.ts`: each section's title and description (the pages' metadata now
  read it; texts unchanged). `lib/section-og.tsx`: `sectionOgImage` (`ogImage` with
  "<section>." and the description), `sectionOgAlt`. `app/{projects,writing,reading,
  music,games,hobbies}/opengraph-image.tsx` (Writing's rewritten through the helper, same
  output). `app/privacy/opengraph-image.tsx` re-exports the root image.
- **Found by the check:** `/privacy` had no `og:image` at all: a page that sets its own
  `openGraph` metadata doesn't inherit the root's `opengraph-image` file. (Section pages
  were the same before they had their own files.)
- Tested: build (every image ○, 1 y). `preview-check` on :3124, 40: for every page in
  `/sitemap.xml` (home, six sections, `/privacy`): title, description, canonical,
  `og:title/description/url/site_name/image(+width/height/alt)`, `twitter:card`,
  `twitter:image` each exactly once; canonical and `og:url` absolute on the site; each
  page's own image; `summary_large_image`; every image 200, `image/png`, a real PNG
  1200 × 630 (IHDR read). One image looked at (Hobbies: the longest description fits on
  one line). Article previews (existing, Phase 1) can't be re-checked until an article
  is published.

## Phase 8, step 4 — YouTube on home (2026-10-08)
Ivan's choices: the newest 2 videos, Shorts included, full-bleed thumbnail cards.
- Channel ID looked up once from the public `@gvan1` page (canonical
  `/channel/UCi1vz5yZr_iJe3aW9xX4OmA`), stored as `site.youtubeChannelId`. The public
  feed (`/feeds/videos.xml?channel_id=…`, Atom, max-age 900) had 1 video on 2026-10-08.
- `lib/youtube-feed.ts`: `parseYouTubeFeed` (per `<entry>`: `yt:videoId` of 11
  characters, title with entities decoded, a valid `published`; anything else skipped;
  newest first), `smallThumbnail` (hqdefault, 480 × 360 letterboxed), `largeThumbnail`
  (maxresdefault, 1280 × 720, missing for some videos). `lib/youtube-loader.ts`:
  `getLatestVideos` ("use cache", hours, tag `youtube`; 5 s timeout; a HEAD per video
  for the sharp thumbnail; every failure → `[]`). `components/video-card.tsx`: hobby
  photo-card style (fills the card, slides 48 px on hover / focus, `motion-safe` only),
  title on a dark backing bottom-left, a small play button bottom-right, label "YouTube
  · Video", external link (new tab); through next/image (`i.ytimg.com/vi/**` was already
  allowed). `lib/home.ts`: `HomeEntry` kind `video`, dated by `publishedAt`; videos span
  2. The "YouTube · @gvan1" channel card stays at the end.
- Found by the checks: with a video and no writing, the grid needed a filler, so home
  showed two sprout cards. Fix: the "Still growing" card now starts small and the grid
  widens it when that fills a row (no filler in any tested case).
- Tested: tsx 6 groups (the real saved feed; a tricky feed: entities incl. an emoji,
  malformed entries, ordering, not-a-feed; home ordering by date; grid fills; the loader
  with `fetch` faked: offline, 500, changed format → no videos; newest 2 with the sharp
  thumbnail only where it exists; `next/cache` stubbed by a `--require` hook). Build.
  `video-check` 15 on :3124 (390 / 800 / 1280 / 1920 px: the card, wide, link and new
  tab, sharp thumbnail through `/_next/image` all 200, full grid, channel card; hover
  slides 48 px, not with reduced motion; console clean) and `empty-check` rerun 24.
  Gotchas: the first runs reported holes because the cards were still dropping in
  (finish the finite animations before measuring); `networkidle0` hung (wait for `load`
  and the images).

## Phase 8, step 5 — Page transitions (2026-10-08)
Ivan's choices: a content-only cross-fade, no slide; public pages only. (Phase 7, ranks,
was dropped the same day; removed from CLAUDE.md and the README.)
- Next 16 + React 19.2's `<ViewTransition>` (browser View Transitions API; no library;
  no animation where unsupported). `app/layout.tsx`: `<ViewTransition
  default="page-fade"><div>{children}</div></ViewTransition>` inside `<main>`.
  `globals.css`: `::view-transition-group(.page-fade)` 0 s (no resize morph);
  `-old` `page-fade-out` 120 ms; `-new` `page-fade-in` 200 ms after 60 ms; the root
  snapshot and its group don't animate (the group's default 250 ms changes nothing
  visible but held every transition, and clicks, for a quarter second: found by the
  check). `components/instant-navigation.tsx` (`<span data-instant-navigation hidden>`)
  in the admin and settings layouts and both sign-in pages; CSS
  `:root:has([data-instant-navigation])` turns the fade off there (no `usePathname`, so
  no extra `<Suspense>`). Reduced motion: every view-transition animation off.
- Tested: `transition-check` 22 in Edge and real Firefox 157, each with and without
  reduced motion (a recorder wraps `document.startViewTransition` and reads the
  pseudo-elements' animations): no transition on first load; one per header-tab
  navigation; the exact fade timings; root and group still; the cards' drop-in still
  plays on the arriving page; sign-in instant; reduced motion: nothing animates;
  consoles clean. Reruns: `empty-check` 24, `video-check` 15, `preview-check` 40.

## Phase 8, step 6 — SEO pass (2026-10-08)
Ivan's choices: "Gvan" only in the structured data; refresh the README at the end.
- Audit (`seo-audit`, every page in the sitemap plus the 404, `/goodbye`, `/login`, after
  hydration): titles and descriptions present and sensible (the `noindex` pages use the
  site default); one `h1` everywhere **except home** (fixed: a visually hidden `<h1>`);
  no skipped heading levels; every `<img>` has `alt` (decorative ones empty).
- Structured data: `lib/structured-data.ts` (`homeJsonLd`: `WebSite` published by
  `Person` "Gvan" with `sameAs`; `articleJsonLd`: `BlogPosting` with headline ≤ 110,
  cover (without its `#WxH`) and the generated preview image, keywords, author and
  publisher by `@id`; `jsonLdText` escapes `<`). `components/json-ld.tsx` renders it on
  the server, as the Next.js guide recommends. `siteIdentity` and `site.description` in
  `lib/site.ts`.
- Lighthouse 13 (scratchpad, `chrome-launcher` with headless Edge, production build):
  phone and desktop for home, Writing, Projects, Music, Privacy: accessibility, best
  practices, SEO 100; performance desktop 99, phone 81–88 (simulated LCP 4–5 s against a
  measured ≈ 0.3 s; CLS 0; TBT ≤ 60 ms). The 404 can't be measured (Lighthouse refuses
  404 responses). Remaining flags, left as they are: the one render-blocking stylesheet,
  framework JavaScript, the lazily loaded YouTube thumbnail and Shinx animation, and the
  preloaded fonts (see CLAUDE.md, "SEO pass", for the `opsz` option).
- README rewritten to describe everything built (sections, admin, accounts, comments,
  two-factor, feeds, transitions, empty states, how security and caching work, testing,
  project structure, commands, environment variables, roadmap).
- Tested: tsx 3 groups (home graph, article fields incl. headline limit and cover URL,
  a title with `</script>` can't close the tag). Build; JSON-LD present in home's HTML;
  audit and Lighthouse as above. Gotchas: Git Bash rewrites `/…` arguments into Windows
  paths (`MSYS_NO_PATHCONV=1`); Lighthouse 13 names its LCP audits
  `lcp-breakdown-insight` / `lcp-discovery-insight`.

## Search favicon (2026-10-08)
Google still showed the old (Vercel) favicon and an old description. Checked the live site
as Googlebot: title "Starfox Labs" and the current description are served, no `noindex`,
`robots.txt` doesn't block the icons, and the live icons are Ivan's Shinx (since
`53982c6`), so Google's copy is simply stale. One real gap with Google's favicon
guidance (square, at least 48 × 48, ideally a multiple of 48): `app/icon.png` was 32 × 32.
Now 192 × 192, the same pixel art scaled 6× with nearest-neighbour (checked: shrinking it
back gives the original pixels exactly), linked as `sizes="192x192"`; `favicon.ico`
(16 / 32 / 48) and the 180 × 180 Apple icon stay. To refresh Google sooner: Search
Console → URL inspection → `https://starfoxlabs.org/` → Request indexing.

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
