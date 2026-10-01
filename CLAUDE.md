# Starfox Labs — Project Brief

## What this is
Personal blog for Ivan at starfoxlabs.org. Mostly software topics, some general posts.
Promotes Ivan's YouTube channel. Readers can optionally create accounts, comment on
articles, subscribe to a newsletter, and earn ranks for long-term loyalty (top rank: **Immortal**).

This is also a portfolio project for software engineering job applications, so
code quality, clear structure, and a good README matter.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres (posts, projects, books, tracks, games, hobby items, profiles,
  comments, subscribers), Auth, Storage (images, covers, screenshots, audio snippets, avatars)
- ALL content (articles, projects, books, songs, games, hobbies) lives in the database and
  is managed through `/admin` on the site (NOT files in the repo), so Ivan can add things
  without touching code.
- Resend: **custom SMTP for Supabase Auth emails** (sign-in codes and links), set up
  2026-09-30 on `starfoxlabs.org`; later also the newsletter. The Resend API key lives only
  in Supabase's SMTP settings, never in this repo or `.env.local`.
- YouTube Data API: latest videos on the home page
- Motion (framer-motion) for page transitions
- Hosting: Vercel (auto-deploys from `main`)

## Commands
- `npm run dev` — local dev server (http://localhost:3000)
- `npm run build` — production build (must pass before pushing)
- `npm run lint` — lint

## Design references — READ THIS BEFORE ANY UI WORK
### Primary reference: https://chester.how/
This is the site Ivan wants Starfox Labs to feel most like. Before building any page,
study the chester screenshots in `design-refs/` (home, projects, writing, hobbies).
Take its ideas and structure; write our own code and content — do not copy its code,
text, or assets. (chester.how sits behind Vercel bot protection, so automated fetches
fail. Rely on the screenshots; ask Ivan for more if something is unclear.)

Elements to take from chester.how:
- **"Digital garden" feel** — a lived-in personal space made of sections, not a corporate blog.
- **Header**: a small tab bar on the left (soft border + faint shadow) holding the home
  link and the section links; the current section is in full ink, the rest muted. Social
  links as small muted text on the right. No big nav bar, no hero banner.
- **Friendly intro** on the home page: a few short sentences in a large, light serif.
  Most words are muted; key words are in full ink and link somewhere.
- **Section pages**: a huge lowercase serif title ending in a period (`writing.`), a short
  muted sans intro (2–3 lines, ~65ch wide), then that section's card grid.
- **Card grid** (exact rules under "Cards" in Visual design).

### Minor reference: https://www.jmduke.com/
Only for: **tag filters with counts** (e.g. `nextjs (12)`), **⌘K / Ctrl+K search** in a
command palette, and the **warm dark mode** (`#1C1B1A`, not cold blue-black).

## Site structure
Header tab bar: **Gvan · Projects · Writing · Reading · Music · Games · Hobbies**
("Gvan" is the home link, like "Chester" on chester.how). On phones the tab bar scrolls
sideways instead of wrapping. The site itself is still called Starfox Labs (page titles,
footer, emails).

### Core idea: items and articles
- Every **item** (project, book, song, game, hobby) is a **card on its section page**.
- Any card can **link to an article** Ivan wrote about it. Reviews and write-ups are normal
  articles, so they also appear on `/writing` like any other post.
- When an article is linked from an item, the article shows a small **"about this"
  panel** near the top (e.g. a book's cover and author, a game's platform, hours and
  rating, or a song's audio snippet and full-track link).
- An item links to **at most one** article, and an article belongs to **at most one** item.

### Pages
- **Home (`/`)** — the intro (with a one-line "subscribe to the newsletter" link) sits in
  the top-left of one dense grid that mixes cards from every section, each labelled
  `Section · Name` (e.g. `Writing · Article`, `Projects · NEON DRIFT`, `Music · Spektral`).
  Only items marked "Show on home" appear, plus the status cards. Latest YouTube videos
  join in the polish phase.
- **Projects (`/projects`)** — `projects.` Like chester's projects page (`design-refs/`):
  wide and small cards, each with a **framed screenshot** sitting in the lower half and
  bleeding off the bottom edge. A card links to the live project, else its GitHub repo,
  else Ivan's article about it; the other links show as small text links on the card.
  Examples: the NEON DRIFT and NEON BREACH browser games. **Starfox Labs itself is not
  listed as a project.**
- **Writing (`/writing`)** — `writing.` Articles as cards (label, tag badges, serif title,
  date, excerpt), newest first. Above the grid: search (title, summary, tags and body;
  updates as you type) and tag filters with counts. Filter state lives in the URL
  (`?tag=&q=`): typing uses `history.replaceState` (no history entry per keystroke, so
  Back still leaves the page); clicking a tag uses `history.pushState`.
  Shows the first **24** cards, then a "Load more" button (+24 each click).
  Search: title, summary and tags are always on the page; article bodies come from a
  separate index (`/writing/search-index`) fetched only when someone starts typing.
  **Next step when needed** (Ivan posts daily, so expect a few hundred articles within a
  year; switch when the index nears ~1 MB or typing feels slow): Postgres full-text
  search — a generated `tsvector` column on `posts` with a GIN index, queried through
  an RPC using `websearch_to_tsquery`, with paging done in SQL.
- **Article (`/writing/[slug]`)** — clean reading layout, NOT cards: title, date, reading
  time, tag badges, optional cover image, the "about this" panel when an item links here,
  body, optional embedded YouTube video. Comments at the bottom.
- **Reading (`/reading`)** — `reading.` Clean book cards like chester's reading page
  (`design-refs/`): square cards labelled `Reading · Books`; the cover sits bottom-left
  (about 40% of the card width, soft shadow), and beside it, aligned to the bottom, the
  `READING` / `READ` / `TO READ` badge, the title and the author (muted). Currently reading
  first, then read (newest finished first), then to read. A card links to Ivan's article
  about the book when there is one.
- **Music (`/music`)** — `music.` Song cards in the same style as the book cards: cover
  art and title. **Every song has an article**, and clicking a card always opens it. Every
  song article shows, near the top, a **20–30 second audio snippet** Ivan uploads, in a
  custom player in the site's style (play/pause, progress, time), plus a link to the full
  track. The song still being made is the "Now producing" card on home.
- **Games (`/games`)** — `games.` Ivan's own screenshots shown in **window-style frames**
  like chester's project cards (a thin frame with a small title bar, bleeding off the
  bottom of the card), with the platform, hours played, an optional rating, and a
  `PLAYING` / `FINISHED` / `DROPPED` badge. Clicking a card opens Ivan's review article.
- **Hobbies (`/hobbies`)** — `hobbies.` Like chester's hobbies page (`design-refs/`):
  mixed cards with full-bleed photos, cut-out images, big serif names with badges,
  labelled by category (`Hobbies · Coffee`, ...).
- **Settings (`/settings`)** — tabs:
  - *Profile*: display name, username, profile picture upload, linked sign-in methods
  - *Appearance*: light / dark / system theme
  - *Newsletter*: subscribe / unsubscribe
  - *Account*: delete account (with a typed confirmation step)
- **Sign in (`/login`)** — Google or email (magic link).
- **Admin (`/admin`)** — Ivan only (see below).
- **Privacy (`/privacy`)** — what data is stored and why.
- Header right side: small muted social links (YouTube, GitHub), RSS, theme toggle, and a
  small avatar button (menu → Settings, Sign out) or a "Sign in" text link when logged out.

## Admin (`/admin`)
- Ivan only: enforced server-side (the page checks the session) and by RLS
  (`public.is_admin()`), not just hidden in the UI.
- **Adding entries must be quick and easy** — Ivan does it often, frequently on his phone:
  - **Minimum required fields** (everything else optional; drafts need only a title):

    | Type | To save a draft | To publish |
    |---|---|---|
    | Article | title | title, body (summary falls back to the first sentence) |
    | Project | title | title + one of live URL / repo / linked article |
    | Book | title | title (status defaults to `TO READ`) |
    | Song | title | title, audio snippet, linked article |
    | Game | title | title, linked review article (status defaults to `PLAYING`) |
    | Hobby item | title | title, category |

  - **Books autofill from Open Library** (free, no API key): type a title or ISBN, pick a
    result, and the cover, author, year and page count fill in. The cover is copied into
    our Storage (not hotlinked). Requests identify the site in their User-Agent, as Open
    Library asks.
  - **One-click status changes** in the list view (`TO READ → READING → READ`,
    `PLAYING → FINISHED / DROPPED`, draft → published) without opening the form. Setting
    READ fills `finished_on` with today.
  - **"Save and add another"** on every form (saves, then opens a fresh form of the same type).
  - **Images: drag and drop, paste, or pick** (camera roll on phones). Resized and compressed
    in the browser before upload (longest edge 2400 px, covers 1200 px; WebP, or JPEG where
    WebP encoding isn't available), with EXIF orientation applied and location data dropped.
  - **Song snippets made in the browser:** upload the full track (it stays on the device,
    only the snippet is uploaded), see its waveform, drag to pick where the 30 s starts,
    preview it, and the snippet is cut with short fades and encoded to MP3 in the
    browser. Manual upload of a ready-made snippet remains as a fallback.
  - **Drag to reorder** cards within each section (sets `sort_order`); on touch screens a
    drag handle plus keyboard/button alternatives (move up / move down).
  - **Works well on a phone:** single-column forms, large tap targets (44 px+), sticky
    Save bar at the bottom, the right keyboard for each field (URL, number), no hover-only
    controls.
- One tab per content type: **Writing, Projects, Reading, Music, Games, Hobbies**. Each tab
  lists items (drafts included) with New / Edit / Delete, and a form for one item.
- Every item form has: title, image upload (paste, drag or pick; stored in Supabase
  Storage), badges, **linked article** (a picker over published and draft posts, with a
  "Write the article" shortcut that opens a new Writing draft already linked),
  **Show on home**, **Card size** (small / wide), Save draft, Publish.
- Per-section fields: see the Data model table. Music also has an **audio snippet upload**
  (MP3/M4A, max 30 s / 2 MB) and a full-track link; a song can only be published once its
  article exists. Games need their review article before publishing, too.
- Writing form: title, slug (auto from title), summary, tags, optional cover image,
  optional YouTube link, markdown body with side-by-side live preview, images pasted or
  dragged into the body. The body is a plain text area with a small toolbar (heading,
  bold, italic, link, inline code, code block, list, quote, image) and a **"?" button
  that opens the WRITING.md cheat sheet in a panel**. Publishing optionally sends the
  newsletter (checkbox added in Phase 6, not before).
- Saving or publishing refreshes the cached pages (`revalidateTag`) so changes show at once.
- Moderation: delete any comment.

## Data model
**One table per content type**, not one generic table. Each type has its own fields (a book
has an author and reading status, a song has an audio snippet and a full-track link, a game
has a platform and hours played). Separate tables give real columns with database checks,
exact TypeScript types, simple per-table RLS, and admin forms that map 1:1 to a table.
The two places that need everything together read from Postgres **views** instead.

Items don't have their own pages (they link to an article, a live site or a repo), so
item tables have no slug; only `posts` does.

Shared columns on every item table: `id`, `title`, `status` (`draft` | `published`),
`post_id` (→ `posts.id`, unique, `on delete set null`), `image_path` (Storage path),
`image_alt`, `badges text[]`, `show_on_home` (bool), `card_size` (`small` | `wide`),
`sort_order` (int, set by drag-to-reorder), `created_at`, `updated_at`.
Built in migrations `20260930100000`–`20260930140000`; `lib/database.types.ts` is generated
from the live schema (`npm run db:types`) — regenerate it after every migration.

| Table | Extra columns | Rules |
|---|---|---|
| `posts` (exists) | slug, summary, body_md, tags, cover_image_url, youtube_url, published_at | — |
| `projects` | summary, url, repo_url, stack text[], started_on | at least one of url / repo_url / post_id |
| `books` | author, reading_status (`to_read` / `reading` / `read`), started_on, finished_on, rating 1–5 (optional), url, isbn, open_library_key, published_year, page_count | — |
| `tracks` | released_on, in_progress (bool), snippet_path (audio), full_track_url, links jsonb (spotify, soundcloud, bandcamp, youtube, apple), note | published ⇒ `post_id` and `snippet_path` set, **unless `in_progress`** (so "Now producing" can show before the article exists; the Music page lists only finished songs) |
| `games` | platform, hours_played numeric, rating 1–10 (optional), play_status (`playing` / `finished` / `dropped`, default playing), finished_on | published ⇒ `post_id` set |
| `hobby_items` | category (e.g. Coffee), subtitle, note, image_style (`photo` / `cutout` / `none`), caption, url | published ⇒ `category` set |

- Other database rules: posts need a body to publish and get `published_at` automatically;
  an article can be linked from only one item across all tables (trigger); deleting an
  article that a published song/game needs is refused until the item is unpublished;
  books: rating 1–5, ISBN 10/13 digits, finished ≥ started; URLs must be `http(s)://`.
- **`home_feed` view** (`security_invoker = true`, so RLS still applies): published items
  with `show_on_home` from every table (not posts — the home page queries those itself),
  as one card shape: `section, id, title, label, href, image_path, image_alt, image_style,
  caption, state, badges, card_size, sort_order, sort_date`. Links to an article only once
  it's published; songs/games appear only when their article is live.
- **`reorder_items(section, ids)`**: saves a section's drag-and-drop order in one call
  (admin only, runs with the caller's rights).
- **`post_items` view**: for each article, the item that links to it (if any), so the
  article page can show its "about this" panel with one query.
- **Status cards come from data, not code:** "Now producing" = a track with
  `in_progress = true`; "Reading" = books with `reading_status = 'reading'`; "Learning" =
  hobby items in the `Learning` category. The placeholders in `lib/site.ts` go away.
- **Access:** an `admins` table (`user_id`) + `public.is_admin()` function. Every table
  gets two kinds of policy: "anyone reads published rows" and "admin does everything".
- **Storage:** one public-read `media` bucket, admin-only writes, folders per section
  (`writing/`, `projects/`, `books/`, `music/` for covers and audio snippets, `games/`,
  `hobbies/`). Allowed types: images (JPEG, PNG, WebP, AVIF) and audio (MP3, M4A);
  size limits enforced by the bucket.
- **Workflow:** migrations live in `supabase/migrations/` and are applied with the Supabase
  CLI (project linked; `npx supabase db push`, preview with `--dry-run`). Then run
  `npm run db:types`. Sample content: `supabase/seed.sql` (articles) and
  `supabase/seed-sections.sql` (section items; ids start `00000000-0000-4000-8000-`),
  both listed in `supabase/config.toml`. `supabase/tests/rls-check.sql` is a rolled-back
  security/rules check to paste into the SQL editor after schema changes.

## Accounts, comments, newsletter
- Accounts are **optional**. Anyone can read articles and comments.
- After a reader finishes an article, show a gentle, dismissible prompt to create an account
  (profile picture, Google or email). Don't show it again once dismissed or signed in. No popups on page load.
- Newsletter: anyone can subscribe with just an email (no account needed). Use double opt-in
  (confirmation email). Every email has an unsubscribe link. Newsletter = new article published.
- Comments: logged-in users only; shown to everyone at the bottom of the article, newest first.
  One level of replies. Users can edit/delete their own; admin can delete any. Basic rate limiting.
- Deleting an account: removes profile, avatar, and newsletter subscription; the user's
  comments remain but display as "deleted user".

## Visual design
- **Feel:** a lived-in digital garden (like chester.how), cozy in atmosphere —
  like reading in a warm, softly lit study at night. Warm neutrals, soft shadows,
  subtle paper/grain texture, gentle glow on accents. Calm and inviting, not corporate or flashy.
- **Colors:** University of Queensland palette. Primary accent: UQ Purple `#51247A`.
  (TODO: Ivan to add the rest from UQ brand guidelines.) Dark mode: warm near-black
  (around `#1C1B1A`) with warm off-white text and purple accents. Light mode: warm off-white
  (not pure white) with dark warm text. Use UQ colors only — never the UQ logo or crest.
- **Fonts:** Newsreader (serif) for headings, the home intro, and article body; Inter (sans)
  for UI and metadata. Loaded with `next/font`.
- **Already built, keep as is:** color tokens, UQ purple, fonts, paper grain, theme toggle.
- **Cards** (home and section pages), modelled on chester.how and adapted to our palette:
  - A **4-column grid** on desktop with **consistent row heights** (roughly square cells);
    cards span 1 or 2 columns (`card_size`). Small gaps (~8px). 2 columns on mobile.
  - Background: a very light raised tone just off the page color (warm light grey in
    light mode, a slightly lifted warm near-black in dark mode). **No border**, soft
    rounded corners, no heavy shadows.
  - A small muted label top-left (`Section · Name`) and a small ↗ top-right on every
    card that links anywhere.
  - **Framed screenshots** (Projects, Games): the screenshot sits inside a thin frame with
    a slim title bar and a soft shadow, centered in the lower half of the card, and is
    cropped by the card's bottom edge. **Covers** (Reading, Music) sit upright with a soft
    shadow, like an object on a shelf.
  - Content sits in the **lower half** of the card. Screenshots and images **bleed off the
    bottom edge**. Photo cards are **full-bleed** with a white caption bottom-left.
  - Titles in the serif, often large. Excerpts clamp to a few lines.
  - The grid is always full: no holes, no sparse boxes floating in empty space.
- **Badges**: small uppercase monospace labels on soft pastel backgrounds with a slightly
  darker outline of the same hue (like chester's `NOW BREWING`). Used for status
  (`NOW PRODUCING`, `READING`, `READ`, `TO READ`, `LEARNING`, `PLAYING`, `FINISHED`,
  `DROPPED`) and for article tags. They must work in
  both themes (low-alpha tints with light text in dark mode).
- **Layout rules — IMPORTANT:**
  - Cards are for the home and section grids. The article reading page and settings/admin
    forms are text-first: typography, spacing and alignment do the work.
  - NO sparse layouts: every grid is dense, every page feels full of content.
  - NO hero banners or giant centered headings. (Section titles are huge but left-aligned
    and sit in the normal flow, chester-style.)
  - Content aligns to one consistent container/grid: **max 1460px wide** (about 80% of a
    1920px screen, like chester.how), centered, with side padding of 16px / 24px / 40px
    (mobile / tablet / desktop). Set by `--page-max` and `--page-pad` in `globals.css`.
    Card grids use `--cell` (one column's width) as their row height, so cards stay square
    and grow with the screen instead of the gaps growing.
  - Article body: comfortable reading width (~65–75 characters per line).
- **Motion:** smooth page transitions between routes and a fade/slide-in for article content.
  Subtle and fast (200–400ms). Respect `prefers-reduced-motion`.
- Fully responsive; must look good on mobile.
- Screenshots of references live in `/design-refs/` (git-ignored).
- Do not use any Nintendo / Star Fox artwork or logos.

## Build phases (build ONE phase at a time)
1. **Foundation** — *done.* Design system, header/footer, Supabase + `posts`, home grid,
   Writing page, article page, link previews, 404s, README.
2. **Admin + content model** — everything Ivan needs to *enter* content for every section.
   1. Admin sign-in: magic link for Ivan only, `admins` + `is_admin()`, cookie-aware
      Supabase client, `/admin` protected on the server (and by RLS).
   2. Content schema: migrations for `projects`, `books`, `tracks`, `games`,
      `hobby_items`, the `home_feed` and `post_items` views, admin policies on every
      table including `posts`, and the `media` bucket with its policies.
   3. `/admin` shell (one tab per section) and the **Writing editor**: markdown with live
      preview, image paste/drag upload, drafts, publish, cache refresh.
   4. **Section forms** sharing one set of fields (image upload with in-browser resizing,
      badges, linked-article picker, show on home, card size, "Save and add another"),
      plus list views with one-click status changes and drag-to-reorder; one step per
      section. Books get Open Library autofill; Music gets the in-browser snippet cutter.
   Everything in `/admin` must work well on a phone.
3. **Section pages** — showing that content, one step per section: Projects, Reading,
   Music (including the custom audio player and the "about this" panel on song
   articles), Games, Hobbies; then the home grid from `home_feed` and status cards from
   data.
4. **Accounts + Settings** — reader sign-in (Google + email), profiles, profile pictures,
   Settings tabs, delete account.
5. **Comments** — comments and replies on articles, moderation.
6. **Newsletter** — subscribe (with or without account), double opt-in, send on publish, unsubscribe.
   **Before it goes live:** two-factor sign-in (authenticator app, Supabase MFA/TOTP) for
   the admin account, since it can publish and email every subscriber. `requireAdmin()` and
   the admin RLS policies then require a two-factor session (`aal2`).
7. **Ranks** — see rules below; show rank badges next to usernames and on profiles.
8. **YouTube + polish** — live YouTube video cards on home, ⌘K search, page transitions,
   SEO, RSS feed, sitemap.

## Rank rules (draft — Ivan to confirm)
Track *active days* and *articles read* (one read per article per user), not raw page views.
| Rank | Requirement |
|---|---|
| Initiate | Just joined |
| Regular | 5+ articles read |
| Veteran | Member 3+ months, 20+ articles read |
| Legend | Member 6+ months, 50+ articles read, at least 1 comment |
| Immortal | Member 12+ months, active in at least 8 of those 12 months |

## Rules for Claude
- Plan first. Propose a plan and wait for approval before writing code for a new phase.
- Ivan is learning: briefly explain *why* for important decisions and any git commands you run.
- Keep changes small; suggest a commit after each working step with a clear message.
- Never hardcode or commit secrets. Keys go in `.env.local` (and Vercel env vars).
  Keep `.env.example` updated with variable names only.
- Use Supabase Row Level Security on every table.
- Run `npm run build` and fix errors before saying a step is done.

## Where we left off (updated 2026-10-01)
### Done — Phase 1, complete (all on `main`, pushed)
1. Design system: warm light/dark tokens via `light-dark()`, UQ purple, Newsreader + Inter,
   paper grain, `prose` styles, flash-free theme script (Next 16 inline-script pattern).
2. Layout shell: header tab bar, footer, theme toggle.
3. Supabase `posts` table + RLS (public reads published only; verified with the
   publishable key: 7 visible, draft hidden, writes blocked), sample seed posts,
   `lib/posts.ts` data layer with `"use cache"` + `cacheTag("posts")`.
4. Home: chester-style 4-column grid, badges, status cards; page widened to 1460px.
5. Writing page (`/writing`): section header, card grid, search, tag filters, load more,
   lazily loaded body search index.
6. Article page (`/writing/[slug]`): reading layout, markdown via `lib/markdown.tsx`
   (Shiki code blocks with copy button, highlighted lines/words, line numbers, footnotes),
   click-to-play YouTube, older/newer links, comments placeholder, one fade-in; page
   metadata, canonical URLs, generated link-preview images (`lib/og.tsx`); friendly
   404s (`app/not-found.tsx`, `app/writing/[slug]/not-found.tsx`). `WRITING.md` lists
   every markdown feature.
7. README with screenshots (`docs/screenshots/`), architecture notes and setup steps.

### Now — Phase 2 (Admin + content model)
- Step 2.1 (admin sign-in): **done** and tested on laptop (email code via Resend SMTP).
- Step 2.2 (content schema): **done** — tables, rules, RLS, views, `media` bucket, sample
  section data, generated types. Visitor-side checks pass with the publishable key.
- Step 2.3 (`/admin` shell + Writing editor), in four parts:
  - **3a done:** admin tabs, Writing list (search, All/Drafts/Published, one-tap Publish /
    Unpublish / Delete with plain-language errors), placeholders for the other tabs.
  - **3b done** (tested by Ivan): the editor form at `/admin/writing/new` and
    `/admin/writing/[id]` (`app/admin/writing/post-editor.tsx`).
    - Rules shared by client and server live in `lib/admin/post-form.ts` (zod schema,
      `slugify`, `normalizeTag`, `firstSentence`, `statusAfter`). The `savePost` action is
      in `app/admin/writing/actions.ts`.
    - Slug: follows the title until edited or published; a warning shows when a live slug
      changes.
    - Summary: if left empty, the first sentence is saved as the summary.
    - Tags: chip input with suggestions (`components/admin/tag-input.tsx`, reusable for
      item badges).
    - Body: markdown toolbar and shortcuts (`components/admin/markdown-toolbar.tsx`).
      The "?" button opens WRITING.md in a dialog (`lib/admin/cheat-sheet.ts`, traced via
      `outputFileTracingIncludes`).
    - Save bar: Save draft / Publish / Update / Unpublish / Save and add another.
    - Safety: an `updated_at` check refuses to overwrite newer saves; unsaved text is
      backed up in localStorage with Restore / Discard (`components/admin/use-local-backup.ts`);
      a `beforeunload` warning covers closing the tab.
  - **3c done** (tested by Ivan): live preview in the editor.
    - Write / Split / Preview switch at the top right of the editor. Split (form + preview
      side by side) only on screens >= 1280 px; Write/Split is remembered per device.
      Full Preview shows the article at reading width and hides the admin bar and tabs
      (`data-admin-chrome` in `app/admin/layout.tsx`, rule in `globals.css`); Esc leaves it.
    - `components/article-view.tsx` draws the article for both the public page and the
      preview, so they can't drift.
    - The renderer is split at the HTML-tree stage: `lib/markdown.tsx` (server-only, Shiki;
      uncached `markdownToHast` and cached `renderMarkdown`) and `lib/markdown-react.tsx`
      (`hastToReact`, runs on server or browser).
    - `POST /admin/writing/preview` (`app/admin/writing/preview/route.ts`) returns the tree
      as JSON, admin only, uncached, max `LIMITS.preview` characters; the browser side is
      `lib/admin/fetch-preview.ts` and `app/admin/writing/live-preview.tsx` (0.3 s debounce,
      cancels superseded requests). **A route handler, not a server action**, because Next
      runs a page's server actions one at a time and previews would hold up Save (verified:
      saves start while previews are pending).
  - **3d next — image helper**: in-browser resize/compress (longest edge 2400 px, covers
    1200 px; WebP, or JPEG where WebP encoding isn't available; EXIF orientation applied,
    location data dropped), cover image upload, and images pasted or dragged into the
    body, stored in the `media` bucket (`writing/`). The cover then shows in the preview
    too (`ArticleView` already takes `coverImageUrl`). Plan it first, then build.
- Step 2.4 note: **Open Library covers must be downloaded into our own `media` bucket**
  (`books/`) when a book is picked, never hotlinked from covers.openlibrary.org.

### Still open
- **Placeholders for Ivan** (all marked `TODO(Ivan)`): home intro (`app/page.tsx`),
  Writing intro (`app/writing/page.tsx`), "Now producing" and "Learning" cards
  (`lib/site.ts`).
- **Sample content**: delete before launch — section items first (the statements at the top
  of `supabase/seed-sections.sql`), then `delete from public.posts where slug like 'sample-%';`
- **Vercel** (Ivan to confirm it's done): Production Branch = `main`; env vars
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable
  key, NOT `..._ANON_KEY` as first suggested); check the latest deploy succeeded.
- **Known dead links** until later steps: Projects / Reading / Music / Games / Hobbies tabs
  show the 404 page (it says they're still being built) until Phase 3; the newsletter
  line is plain text until Phase 6.
- UQ palette beyond purple is still a TODO (see Colors).
- **Two-factor sign-in for the admin** before the newsletter goes live (see Phase 6).
- **Scheduled publishing** (to-do, after the Writing editor): pick a future date and time
  and the article goes live then, so Ivan can write several daily posts in advance. Needs
  public queries to require `published_at <= now()`, and something to refresh the cache
  at that moment (e.g. a Vercel Cron job calling a route that runs `revalidateTag`).
- **Redirects for changed slugs** (to-do, later): the editor allows changing a published
  article's slug with a warning, but old links then 404. Fix: a `post_redirects` table
  (`old_slug` → `post_id`) filled when a published slug changes, checked by the article
  page before calling `notFound()` (permanent redirect to the current slug).

### Notes for the next session
- Next.js 16: read `node_modules/next/dist/docs/` before using an API (see AGENTS.md).
  Cache Components is on: anything using the clock, cookies or URL data must be
  cached (`"use cache"`) or wrapped in `<Suspense>`, or the build fails.
  Middleware is called **Proxy** in this version. `proxy.ts` only runs on `/admin`, `/login`
  and `/auth` (see its `matcher`), so public pages stay static; keep it that way.
- Auth: sign-in is email code + link (`signInWithOtp` with `shouldCreateUser: false` on the
  admin form only; sign-ups stay enabled project-wide for Phase 4 readers). The email
  template links to `/auth/confirm?token_hash=…`, which works in any browser.
- Known Next 16 behaviour: `notFound()` for a slug that wasn't prerendered returns a
  proper 404 with noindex, but the HTML body is empty and the 404 page is drawn by
  JavaScript. Wrapping the page in `<Suspense>` doesn't fix it (and turns the status
  into 200), so we keep the real 404. Browsers show the friendly page normally.
- Anything that reads files or the clock (Shiki, `next/og` fonts) must sit inside a
  `"use cache"` function, or the route silently becomes request-time / `no-store`.
- Any Client Component that calls `usePathname()` must sit inside `<Suspense>` (with a
  non-highlighted fallback), or pages with unknown URLs like `/admin/writing/<id>` fail
  the build. The header nav and admin tabs already do this.
- **Admin pages:** a client navigation inside `/admin` only re-renders below
  `app/admin/layout.tsx`, so the layout's `<Suspense>` and its `requireAdmin()` don't run
  again. Every admin page puts its request-time work (params, session, database) in a
  component behind its **own** `<Suspense>`, and that component calls `requireAdmin()`.
  Otherwise `next dev` reports "uncached data … outside of `<Suspense>`".
- Server actions: call `requireAdmin()` first, then `updateTag("posts")` (public pages)
  and `refresh()` (current admin page) after a successful change. Exception: the editor's
  `savePost` skips `refresh()`, which would re-render the form while Ivan types.
- Server actions run **one at a time** per browser tab. Anything frequent that doesn't
  change data (like the live preview) goes through a route handler instead.
- chester.how blocks automated fetches; use the screenshots in `design-refs/`.
- Visual checks were done with headless Edge + `puppeteer-core` installed in a temp
  folder (not a project dependency) at 1280 / 1440 / 1920 px, dark mode, and 390 px mobile.
