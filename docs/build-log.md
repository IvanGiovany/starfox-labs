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

## Phase 2 — Admin + content model

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

#### 4c — Music, part 2: the snippet cutter (in progress)
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
