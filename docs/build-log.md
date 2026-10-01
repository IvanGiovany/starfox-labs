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
- **Hydration mismatch report (unconfirmed):** once, editing a book, an `ArticlePicker`
  option was `disabled` in the browser but not on the server. Not reproduced:
  server-render + hydrate with identical props (with and without a stored backup) and a
  temporary no-login probe page on the dev server were both clean, with one article query
  per load. Likely cause: posts tied on `updated_at` (10 published sample posts share 4
  timestamps) coming back in different orders. Every admin list now ends its order with
  `id` (commit "Give admin lists a fully determined order").

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
- **Public pages:** production build on another port (3124), screenshots and rendered
  HTML before/after, and per-element layout when screenshots flicker by a pixel.
