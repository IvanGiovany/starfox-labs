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
Built: sign-in, the Writing editor and every section form: Projects, Reading, Music,
Games, Hobbies (details in `docs/build-log.md`). The requirements below apply to every
section.
- Ivan only: enforced server-side (`requireAdmin()`) and by RLS (`public.is_admin()`), not
  just hidden in the UI.
- **Adding entries must be quick and easy** — Ivan does it often, frequently on his phone.
  Minimum required fields (everything else optional; drafts need only a title):

  | Type | To save a draft | To publish |
  |---|---|---|
  | Article | title | title, body (summary falls back to the first sentence) |
  | Project | title | title + one of live URL / repo / linked article |
  | Book | title | title (status defaults to `TO READ`) |
  | Song | title | title, audio snippet, linked article |
  | Game | title | title, linked review article (status defaults to `PLAYING`) |
  | Hobby item | title | title, category |

- **Works well on a phone:** single-column forms, large tap targets (44 px+), sticky Save
  bar at the bottom, the right keyboard for each field (URL, number), no hover-only controls.
- One tab per content type: **Writing, Projects, Reading, Music, Games, Hobbies**. Each
  lists its items (drafts included) with New / Edit / Delete, **one-click status changes**
  without opening the form (`TO READ → READING → READ`, `PLAYING → FINISHED / DROPPED`,
  draft ↔ published; setting READ fills `finished_on` with today), and **drag to reorder**
  (sets `sort_order`; a touch handle plus move up / move down and keyboard), except Reading,
  which is ordered automatically.
- Every item form: title, image (drag, paste, pick or an image URL; resized in the browser
  before upload — longest edge 2400 px, covers 1200 px, WebP or JPEG, EXIF orientation
  applied, location data dropped — or imported by the server; always our own copy in
  Storage), badges, **linked article** (a picker over published and draft posts, with a
  "Write the article" shortcut), **Show on home**, **Card size** (small / wide), Save
  draft, Publish, **"Save and add another"**.
- Per-section fields: see the Data model table. Books autofill from Open Library (cover
  copied into our Storage, never hotlinked). **Music:** an audio snippet (MP3/M4A, max
  30 s / 2 MB) made in the browser from the full track (the track stays on the device;
  waveform, drag to pick where the 30 s starts, preview, cut with short fades, encoded to
  MP3 in the browser), with manual upload of a ready-made snippet as a fallback; plus a
  full-track link. A song can only be published once its article exists (unless it's
  still in progress); games need their review article before publishing, too.
- Writing editor (built): publishing will optionally send the newsletter (a checkbox
  added in Phase 6, not before).
- Saving or publishing refreshes the cached pages (cache tags) so changes show at once.
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
Built in migrations `20260930100000`–`20260930140000` (plus `20261002100000`: `tracks.snippet_seconds`, also in `post_items`); `lib/database.types.ts` is generated
from the live schema (`npm run db:types`) — regenerate it after every migration.

| Table | Extra columns | Rules |
|---|---|---|
| `posts` (exists) | slug, summary, body_md, tags, cover_image_url, youtube_url, published_at | — |
| `projects` | summary, url, repo_url, stack text[], started_on | at least one of url / repo_url / post_id |
| `books` | author, reading_status (`to_read` / `reading` / `read`), started_on, finished_on, rating 1–5 (optional), url, isbn, open_library_key, published_year, page_count | — |
| `tracks` | released_on, in_progress (bool), snippet_path (audio), snippet_seconds (decoded length, saved at upload; null for older rows), full_track_url, links jsonb (spotify, soundcloud, bandcamp, youtube, apple), note | published ⇒ `post_id` and `snippet_path` set, **unless `in_progress`** (so "Now producing" can show before the article exists; the Music page lists only finished songs) |
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
2. **Admin + content model** — *done.* Everything Ivan needs to *enter* content for every section:
   2.1 admin sign-in, 2.2 content schema, 2.3 `/admin` shell + Writing editor, 2.4 section
   forms (one step per section). Everything in `/admin` must work well on a phone.
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
   **Also before it goes live:** browser tests must stop publishing on the shared database,
   because publishing will email subscribers. Either switch tests to a local Supabase
   (Docker, `npx supabase start`) or make it impossible for a test to send emails (e.g.
   sending refuses unless it's the production deployment, and test items can never trigger
   it). Decide and build this before the send-on-publish code is switched on.
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

## Where we left off (updated 2026-10-04)
Everything built so far, with file maps, decisions and how it was tested:
**`docs/build-log.md`**. Read the relevant part before changing that area.

- **Phase 1 (Foundation):** done.
- **Phase 2 (Admin + content model): done** (2026-10-04), every step tested by Ivan on
  laptop Firefox and phone, pushed. 2.1 admin sign-in; 2.2 content schema; 2.3 `/admin`
  shell + Writing editor (form, live preview, images); 2.4 section forms: a Projects,
  b Reading (Open Library autofill), c Music (manual snippet upload, then **the
  in-browser snippet cutter**: waveform, window on the loudest part, 20–30 s, 0.5 s / 2 s
  fades, MP3 at 320 kbps in a Web Worker with `@breezystack/lamejs`, LGPL-3.0), d Games
  (status toggle, one-tap Finished / Dropped, rating 1–10 as number buttons), e Hobbies
  (card style PHOTO / CUT-OUT / NONE, category spelling matched ignoring case, cut-outs
  keep their transparency). The `[section]` placeholder page is gone (all sections built).
  - Decisions (Ivan) that Phase 3 must honour: **several songs can be in progress**, "Now
    producing" shows the top one in the Music order; a published photo or cut-out hobby
    card always has an image (text cards are NONE); "Learning" = hobby items in the
    `Learning` category (no separate switch); DROPPED games keep no finish date.
  - *Rule kept for similar work:* changes to routing or URL handling start with a probe
    shaped like the real pages, and **if anything flickers or loses focus, stop and tell
    Ivan before touching the real code.**
- **Now: Phase 3, the public section pages** (plan approved 2026-10-04; progress:
  `docs/build-log.md`, "Phase 3"). Steps: (1) shared pieces + motion + Projects: **done,
  not yet committed**; (2) Reading; (3) Music + audio player (**propose a musical hover
  effect for song cards to Ivan before building**); (4) Games (**spell out an adapted
  "pop up" hover for the framed screenshots in the step plan**: chester has no games);
  (5) Hobbies; (6) home grid from `home_feed` + status cards from data (+ the pixel-art
  spot, see "Still open"). Decisions (Ivan): home order newest first; a short last row
  gets a quiet "more" card; section intros are `TODO(Ivan)` placeholders. Ivan wants the
  pages to look and feel a lot like chester.how: **re-read every chester screenshot in
  `design-refs/` before each step.**
  - **Motion, as chester.how does it** (confirmed by Ivan from its recording, its CSS and
    its scripts; recreated in our own CSS, no animation library):
    1. Header tab bar drops in from 50 px above, 0.5 s spring (`header-in`); the right
       side (socials, theme toggle) fades in after 1 s (`fade-in-late`).
    2. Cards drop in from 10 px above, 0.15 s apart, chester's default spring (stiffness
       100, damping 10 → `--spring-card`, 1.224 s) on page load / client navigation
       (`card-in`, `--card-index`). No separate image fade (chester has none).
    3. Card hover/focus: one step further from the page (`--bg-raised-hover`), and the ↗
       sits in a circle that lights up (page colour + `--shadow-skeuo`). No purple tint.
    4. Project (and game) screenshots grow to 105% on hover; book/song covers tilt −3°,
       grow to 110% with a deeper shadow; photo cards: the photo slides down 48 px; cut-out
       cards: text fades to 20%, the cut-out grows to 105% and comes forward. All 150 ms,
       `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind's default), `motion-safe:` only.
    5. A pill slides under the hovered header tab (mouse only); the header is sticky and
       frosted; its right side fades out past 20 px of scroll (`inert` while hidden).
    Reduced motion: no movement and no delays; colour changes and the sticky header stay.
    Not used: chester's leaf→maple GIF and footer avatar (Ivan's own pixel art instead).
  Things to carry in:
  - Pages use the cache tags the admin already updates (`projects`, `books`, `tracks`,
    `games`, `hobby_items`, plus `home` and `posts`); public pages stay static (Proxy
    only runs on `/admin`, `/login`, `/auth`).
  - Read `design-refs/` (chester's projects, reading and hobbies pages) before each page,
    and the "Cards" rules under Visual design. Ivan checks the looks himself; keep
    screenshots to diagnosing specific bugs.
  - Shared helpers already exist for the pages: `lib/reading.ts` (`compareBooks`, labels),
    `lib/games.ts`, `lib/hobbies.ts` (`IMAGE_STYLES`, `LEARNING_CATEGORY`).
  - Music: the snippet length to show is `tracks.snippet_seconds` (decoded at upload; the
    player's own figure can be wrong, e.g. in Firefox); older rows fall back to the player.
  - Spektral is Ivan's artist name: move it into `lib/site.ts` (e.g. `site.artist`; today
    it sits in the `now.producing` placeholder) and change the `home_feed` view (new
    migration) to label song cards `Music · <song title>` like the other sections, instead
    of the hard-coded `'Music · Spektral'`.
  - Sample data: "Monstera (sample)" is a published cut-out without an image (from before
    the image rule); give it an image or NONE, or leave it for the pre-launch cleanup.
  - The section links in the header stop being dead links as each page lands (see "Known
    dead links" under "Still open").

### How the admin is built (reference)
- **Adding an item section** = a definition file in `lib/admin/items/` (schema + publish
  rules + `toRow`/`fromRow` + empty form; see `projects.ts`, `books.ts`), a loader
  (`load-*.ts`), an `actions.ts` one-liner around `saveItem`, a form passing its own fields
  to `components/admin/item-editor.tsx`, three pages (list, `new`, `[id]`), and flipping
  `ready` in `lib/admin/sections.ts`. Lists use `components/admin/item-list.tsx`
  (optional `stateBadge` + `quickStep` for one-tap status steps, as Reading does).
- Items store image **paths**, articles store image **URLs** (`lib/media.ts`). Uploads and
  URL imports go to the section's media folder (`lib/admin/add-image.ts`).
- Saving an item updates the cache tags `home`, `posts` and the section's tag (`projects`,
  `books`, `tracks`, `games`, `hobby_items`). Phase 3 pages must use these tags.
- Decisions already made: Reading is ordered automatically, other sections are
  drag-to-reorder (`@dnd-kit`), new items go to the top; article covers are decorative
  (`alt=""`); going back to TO READ keeps a book's dates; the Open Library User-Agent is
  site only (no email).

### Still open
- **Placeholders for Ivan** (all marked `TODO(Ivan)`): home intro (`app/page.tsx`),
  Writing intro (`app/writing/page.tsx`), "Now producing" and "Learning" cards
  (`lib/site.ts`).
- **Sample content**: delete before launch — section items first (the statements at the top
  of `supabase/seed-sections.sql`), then `delete from public.posts where slug like 'sample-%';`
- **Vercel** (Ivan to confirm it's done): Production Branch = `main`; env vars
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable
  key, NOT `..._ANON_KEY` as first suggested); check the latest deploy succeeded.
- **Known dead links** until later steps: the public Reading / Music / Games / Hobbies
  pages show the 404 page (it says they're still being built) until their Phase 3 step
  (Projects is live; remove each from `app/not-found.tsx` as it lands); the newsletter
  line is plain text until Phase 6.
- UQ palette beyond purple is still a TODO (see Colors).
- **Two-factor sign-in for the admin** before the newsletter goes live (see Phase 6).
- **Browser tests must stop publishing on the shared database** before the newsletter goes
  live: local Supabase for tests, or emails impossible from tests (see Phase 6).
- **Scheduled publishing** (to-do): pick a future date and time and the article goes live
  then. Needs public queries to require `published_at <= now()`, and something to refresh
  the cache at that moment (e.g. a Vercel Cron job calling a route that runs
  `revalidateTag`).
- **Unused media** (to-do): images removed from an article body, and replaced or removed
  covers, stay in the `media` bucket. Deleting automatically is risky (a file may be used
  elsewhere, or the change undone), so build an admin view that lists files no article or
  item references, to delete by hand.
- **Redirects for changed slugs** (to-do): changing a published article's slug breaks old
  links. Fix: a `post_redirects` table (`old_slug` → `post_id`) filled when a published
  slug changes, checked by the article page before `notFound()` (permanent redirect).
- **Ivan's pixel art** (to-do, decided 2026-10-04): Ivan's own animated pixel art in the
  spot where chester.how has its leaf → maple GIF (a small image in the home intro that
  swaps to the animated version on hover, 0.5 s cross-fade), and possibly an animated
  footer avatar. Build the spot when doing the home page (Phase 3, step 6), then **ask
  Ivan for the art**. Never use placeholder art from anywhere else.

### Notes for the next session (gotchas — keep these)
**Next.js 16**
- Read `node_modules/next/dist/docs/` before using an API (see AGENTS.md). Middleware is
  called **Proxy**; `proxy.ts` only runs on `/admin`, `/login` and `/auth` (its `matcher`),
  so public pages stay static. Keep it that way.
- Cache Components is on: anything using the clock, cookies or URL data must be cached
  (`"use cache"`) or wrapped in `<Suspense>`, or the build fails. Anything that reads files
  or the clock (Shiki, `next/og` fonts) must sit inside a `"use cache"` function, or the
  route silently becomes request-time / `no-store`.
- `dynamicParams`, `dynamic`, `revalidate` and `fetchCache` don't exist with Cache
  Components. For a fixed set of params use `generateStaticParams`, and read `params`
  inside `<Suspense>` for the rest (see `app/admin/games/[id]/page.tsx`).
  `generateStaticParams` **must return at least one result**, or the build fails ("all
  `generateStaticParams` functions must return at least one result"); that's why the
  admin's placeholder page for unbuilt sections was deleted once all were built.
- **Admin pages:** a client navigation inside `/admin` only re-renders below
  `app/admin/layout.tsx`, so the layout's `<Suspense>` and `requireAdmin()` don't run again.
  Every admin page puts its request-time work (params, session, database) in a component
  behind its **own** `<Suspense>`, and that component calls `requireAdmin()`. Otherwise
  `next dev` reports "uncached data … outside of `<Suspense>`".
- Any Client Component that calls `usePathname()` must sit inside `<Suspense>` (with a
  non-highlighted fallback), or pages with unknown URLs like `/admin/writing/<id>` fail the
  build. The header nav and admin tabs already do this.
- `notFound()` for a slug that wasn't prerendered returns a proper 404 with noindex, but
  the HTML body is empty and the 404 page is drawn by JavaScript. Wrapping the page in
  `<Suspense>` doesn't fix it (and turns the status into 200), so we keep the real 404.
  `app/writing/[slug]/page.tsx` sets `export const instant = false` to tell the dev
  validation this wait is intended (it changes nothing else).
- Inline scripts (the theme script in `app/layout.tsx`) go through
  `components/inline-script.tsx`: `text/javascript` in the server HTML, inert `text/plain`
  when React renders in the browser, which avoids React's "Encountered a script tag" warning.
- **Never `history.replaceState` to a different route from a request-time page** (every
  admin page). Next patches `replaceState`, treats it as a "restore", refetches the new
  URL and, if that's another route segment (`/new` → `/[id]`), swaps the page subtree:
  the form remounts (state, focus and uploads lost; Firefox even flashed the loading
  fallback). It happened in 4 of 9 probe runs, whenever the router refetched. Same-route
  changes (query or hash) are safe. That's why a new item's first save goes to `new#<id>`
  (`useNewItemUrl` in `lib/admin/editor-url.ts`). Bypassing Next's patch doesn't work
  either: its `HistoryUpdater` writes its own URL back on the next router update.
- **Server actions run one at a time per browser tab.** Anything frequent or slow that
  shouldn't hold up Save (live preview, image imports, Open Library lookups) is a route
  handler instead.
- Server actions: call `requireAdmin()` first, then update the cache tags (`posts`, and the
  item tags above) and `refresh()` the current admin page. Exception: the editors' save
  skips `refresh()`, which would re-render the form while Ivan types.
- `react-dom/server` throws inside route handlers (they run in the React Server Components
  environment), so a route can't render components to HTML. The live preview sends the
  HTML tree as JSON instead and the browser turns it into React.

**Data and the browser**
- Admin lists must have a fully determined order: end every `.order()` chain (and JS sort)
  with `id`. Rows saved together tie on timestamps and can come back in any order.
- JavaScript date parsing is lenient (`2026-02-30` becomes 2 March). Check dates with a
  round trip, as `isRealDate` and `isPlausibleToday` do. "Today" for the admin is the
  browser's local date (`localToday` in `lib/format.ts`); the server runs on UTC.
- Use `crypto.getRandomValues` (`randomId()`), not `crypto.randomUUID`: browsers only offer
  the latter on https/localhost, not on the dev server opened from a phone.
- **Firefox form-state restore** (Ivan uses Firefox): after a reload or Back, Firefox gives
  a control that was disabled and then enabled again during the visit (e.g. Save while
  saving) its "enabled" state back, matched by its position in the *original* HTML, even
  when the reloaded HTML differs. That removes a `disabled` the server rendered (React:
  hydration mismatch, "won't be patched up", so the button stays clickable). It only
  restores *enabled*, and not for `no-store` pages (`next dev` sends `no-cache`). Rule:
  every control whose `disabled` changes sits inside the item/article editor forms
  (`autoComplete="off"` on the `<form>`) or has `autoComplete="off"` itself (allowed on
  buttons by `types/react-button-autocomplete.d.ts`). Edge doesn't do this, so test
  hydration in Firefox. Repro method: build log, 2.4b.
- Auth: sign-in is email code + link (`signInWithOtp` with `shouldCreateUser: false` on the
  admin form only; sign-ups stay enabled project-wide for Phase 4 readers). The email
  template links to `/auth/confirm?token_hash=…`, which works in any browser.

**Working in this repo**
- Ivan usually has `npm run dev` running on port 3000: don't stop it. Its log is
  `.next/dev/logs/next-development.log`. For production checks use `next start -p 3124`
  and stop it afterwards.
- `npm run build` needs network access (it queries Supabase while prerendering). A
  "fetch failed" or DNS error means the network or sandbox, not the code.
- Admin pages can't be checked without Ivan's sign-in (signed-out requests get a 307), so
  test logic and components in isolation (methods in the build log, "How things were
  tested"), then give Ivan a short browser checklist.
- Git: a `git add` that lists one path that no longer exists (e.g. after `git mv`) stages
  **nothing**. Never silence its errors; after committing, check `git show --stat HEAD`.
- Long multi-file shell heredocs sometimes fail to parse in this environment; write files
  with the file tool instead.
- chester.how blocks automated fetches; use the screenshots in `design-refs/`. Visual checks
  use headless Edge + `puppeteer-core` installed in a temp folder (not a project
  dependency) at 1280 / 1440 / 1920 px, dark mode, and 390 px mobile.

**Browser testing (Playwright MCP)**: **not by default.** Give Ivan a short browser
checklist and he tests it himself. Use the Playwright browser only when Ivan explicitly
asks for it: it's slow and uses a lot of tokens (Ivan's rule, 2026-10-02). When asked:
- The `playwright` MCP server (local scope, not in the repo) drives Playwright's Firefox
  build with a persistent profile where Ivan signed in once as admin. Config:
  `C:\Users\Ivan\AppData\Local\starfox-labs\playwright-mcp.json` (the profile folder sits
  next to it; it holds an admin session, so it never goes in the repo). Pinned to
  `@playwright/mcp@0.0.83`. Register from PowerShell, not Git Bash (Git Bash turns `/c`
  into `C:/`): `claude mcp add playwright --scope local -- cmd /c npx -y
  @playwright/mcp@0.0.83 --config <that file>`.
- **localhost only, never the live site.** The config allows only `localhost:3000`,
  `localhost:3124` / `127.0.0.1:3124` and the Supabase project, and blocks
  `starfoxlabs.org`. That list is a guardrail, not a security boundary, so the rule stands
  on its own. To test anything else, ask Ivan first.
- **Localhost shares the live database.** Test content is titled `[test] …`, stays a draft
  unless a check needs publishing (unpublish right after), and is deleted at the end of the
  check, with its uploaded files. Never publish a test article (it would show on the live
  `/writing`). This must change before the newsletter goes live (see Phase 6).
- Playwright's Firefox is a patched build, not Ivan's Firefox: for Firefox-specific bugs,
  also check real Firefox with `puppeteer-core` (`browser: "firefox"`, server-rendered +
  hydrated harness; see the build log, 2.4b).
