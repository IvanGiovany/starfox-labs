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
emails).

### Core idea: items and articles
- Every **item** (project, book, song, game, hobby) is a **card on its section page**.
- Any card can **link to an article** Ivan wrote about it. Reviews and write-ups are normal
  articles, so they also appear on `/writing` like any other post.
- When an article is linked from an item, the article shows a small **"about this"
  panel** near the top (e.g. a book's cover and author, a game's platform, hours and
  rating, or a song's audio snippet and full-track link).
- An item links to **at most one** article, and an article belongs to **at most one** item.

### Pages
- **Home (`/`)** — the intro (Ivan's own text, 2026-10-07: "Hey, I'm Gvan 👋 Welcome to my
  lab 🧪 …"; sized like chester's, see build log "Home intro") sits in
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
- **Footer** (every page), like chester.how's "Planted by Chester": Ivan's Shinx art
  centred above one line, **"Made in the lab by Gvan"**, nothing else (no copyright, no
  links: Ivan, 2026-10-06). Hovering the art or the line cross-fades the still into the
  wagging animation (0.5 s); reduced motion keeps the still.

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
Articles' "about this" panels read one Postgres **view** (`post_items`); the home grid
reads each section's own loader (step 6), so its cards are the section pages' cards.

Items don't have their own pages (they link to an article, a live site or a repo), so
item tables have no slug; only `posts` does.

Shared columns on every item table: `id`, `title`, `status` (`draft` | `published`),
`post_id` (→ `posts.id`, unique, `on delete set null`), `image_path` (Storage path),
`image_alt`, `badges text[]`, `show_on_home` (bool), `card_size` (`small` | `wide`),
`sort_order` (int, set by drag-to-reorder), `created_at`, `updated_at`.
Built in migrations `20260930100000`–`20260930140000` (plus `20261002100000`: `tracks.snippet_seconds`, also in `post_items`; `20261005120000`: hobby `image_style` + `note` in `post_items`; `20261005130000`: `home_feed` dropped); `lib/database.types.ts` is generated
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
- **Home grid** (no view since step 6; `home_feed` was dropped): `lib/home.ts` merges the
  section loaders' items marked `show_on_home` with the latest articles, newest first.
  Dates: projects and hobbies when added, books and games when finished (else added),
  songs when released (else added). Links to an article only once it's published.
- **`reorder_items(section, ids)`**: saves a section's drag-and-drop order in one call
  (admin only, runs with the caller's rights).
- **`post_items` view**: for each article, the item that links to it (if any), so the
  article page can show its "about this" panel with one query.
- **Status cards come from data, not code:** "Now producing" = a track with
  `in_progress = true`; "Reading" = books with `reading_status = 'reading'`; "Learning" =
  hobby items in the `Learning` category. They show on home whether or not "Show on
  home" is ticked, never twice (Ivan, 2026-10-05). Built in step 6.
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
- **Protecting the data** (since 2026-10-07, after every content table was emptied on
  2026-10-06):
  - **Truncate guard** (migration `20261007130000`): `TRUNCATE` on `posts`, the item
    tables and `admins` is refused, from the dashboard too, unless switched on for that
    transaction (`begin; set local app.allow_truncate = 'on'; truncate …; commit;`). The
    API roles have no `TRUNCATE`. **Every new table gets the guard** (and goes into
    `TABLES` in `scripts/db-backup.mjs`).
  - **`npm run db:backup`** saves every content row (drafts included) to
    `backups/<date-time>.json` (git-ignored). **`npm run db:restore -- <file>`** lists rows
    that are missing now; add `--apply` to put them back. Restore only adds missing rows,
    never changes or deletes. Rows only, not Storage files; `admins` is re-added by hand.
    Each backup run deletes backups older than 30 days (`/privacy` promises it: backups
    hold profiles, so a deleted account mustn't live on longer).
    (`supabase db dump` needs Docker, which isn't installed.)
  - **Rules:** back up before any risky database work. Never `supabase db reset --linked`,
    never "Truncate" or bulk deletes in the dashboard; demo content goes only through
    `npm run demo:remove`.

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
- Do not use any Nintendo / Star Fox artwork or logos. **One exception (Ivan, 2026-10-05):
  Ivan's own fan art is allowed in the footer's pixel-art spot and in the favicon** (his
  Shinx still and animation, and the pixel Shinx for the browser-tab icons; he made them
  himself and accepts that the character belongs to Nintendo). Nowhere else, and never
  art made by someone else.

## Build phases (build ONE phase at a time)
1. **Foundation** — *done.* Design system, header/footer, Supabase + `posts`, home grid,
   Writing page, article page, link previews, 404s, README.
2. **Admin + content model** — *done.* Everything Ivan needs to *enter* content for every section:
   2.1 admin sign-in, 2.2 content schema, 2.3 `/admin` shell + Writing editor, 2.4 section
   forms (one step per section). Everything in `/admin` must work well on a phone.
3. **Section pages** — showing that content, one step per section: Projects, Reading,
   Music (including the custom audio player and the "about this" panel on song
   articles), Games, Hobbies; then the home grid (from the section loaders) and status
   cards from data.
4. **Accounts + Settings** — *done (2026-10-07).* Reader sign-in (Google + email), profiles,
   profile pictures, Settings tabs, delete account, the sign-up prompt (built, off until
   Phase 5).
5. **Comments** — comments and replies on articles, moderation. *In progress (plan
   approved 2026-10-08, see "Start here").*
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

## Where we left off (updated 2026-10-07, after Phase 4)
Everything built so far, with file maps, decisions and how it was tested:
**`docs/build-log.md`**. Read the relevant part before changing that area.

### Start here (next session)
- **State:** **Phases 1–4 are done** (Phase 4 finished 2026-10-07, every step tested by
  Ivan, all pushed). The **demo content is live** (16 articles and items in every
  section; remove it all with **`npm run demo:remove`**, see "Demo content" in "Still
  open"). The working tree is clean except `GIFS/` (Ivan's originals, untracked, safe for
  him to delete). Readers can sign up (Google or email), have a profile and picture,
  change settings and delete their account; the live Google app is published.
- **Now: Phase 5 (Comments), plan approved 2026-10-08.** Comments load in the browser
  (article pages stay static) and are written straight from it with the publishable
  key; **every rule is in the database** (RLS + triggers), since anyone can call the
  API directly. Steps: **5.1 schema** (migration `20261008100000_comments.sql`:
  `comments` table, `delete_comment()`, rate limit, username-change limit,
  `next_username_change()`; **applied 2026-10-08** with Ivan's OK, `db:types`
  regenerated; **done**: Ivan ran `rls-check.sql`, all passed), 5.2 comments on articles (read, post, reply, edit, delete own; plain text;
  `#comment-<id>` links; first 30 then "Show more"; **done 2026-10-08**: 45 browser
  checks, then Ivan's checklist 1–9; build log "Phase 5, Step 2"), 5.3 moderation (Delete on every
  comment for the admin + an admin **Comments** tab of the latest across articles), 5.4
  wrap-up (Settings shows when the username can change again; Account + `/privacy`
  wording; sign-up prompt on).
  - **Ivan's decisions (2026-10-08):** comments go live at once (no approval queue;
    "approve before publishing" is a to-do in "Still open"); a deleted comment with
    replies becomes a "This comment was deleted." placeholder (text and author
    cleared), removed with its last reply; deleting an article deletes its comments;
    plain text, links not clickable; max 2000 characters; 1 comment every 20 s and 30 a
    day per account, admin exempt (code `PT429` → HTTP 429); editing any time, marked
    "edited"; username: the first change any time, then once every 30 days (admin
    exempt; `username_changed_at` isn't publicly readable: `profiles` select is granted
    column by column now); blocking readers later if needed; the admin Comments tab: yes.
    Replies sit under their comment oldest first; top-level comments newest first.
  - **Testing comments:** comments only work on published articles, so browser checks
    post `[test] …` comments on a live demo article (Ivan's OK, 2026-10-08) and delete
    them; **delete test comments before deleting a throwaway account**, or they stay as
    "deleted user".
  Carried in from Phase 4 (all covered by the steps above):
  - **Switch the sign-up prompt on** (`SIGN_UP_PROMPT` in `lib/features.ts`) once
    comments work, and add its browser memory to `/privacy` (`lib/sign-up-memory.ts`).
  - **A username-change limit** (e.g. once a month), so nobody dodges moderation by
    renaming (Ivan, 2026-10-07).
  - **Deleted accounts:** comments stay and show "deleted user"
    (`comments.user_id … on delete set null`); `delete_my_account()` and Settings →
    Account already delete the profile and picture. Update the Account tab's and
    `/privacy`'s wording ("your comments stay as 'deleted user'").
  - Comments show the author's `display_name`, `@username` and picture
    (`components/avatar.tsx`, `profiles` is public); the admin's comments can carry an
    "author" badge (Ivan's profile is `gvan` / "Gvan").
  - The new table gets RLS, the truncate guard, a place in `db:backup`'s `TABLES`, and a
    part in `rls-check.sql`. The article page's `#comments` section is the placeholder
    to replace (`app/writing/[slug]/page.tsx`); public article pages must stay static
    (comments load in the browser or behind `<Suspense>`).
  - Rank rules (Phase 7) will count from `profiles.created_at` ("member since").
- **How Phase 4 was tested** (build log, "Phase 4"): unit tests with tsx; production
  build on :3124 with `puppeteer-core` in Edge, using **throwaway reader accounts** made
  with the service key and signed in without any email (`admin.generateLink` →
  `verifyOtp` in Node, cookies handed to the browser), deleted afterwards with their
  files. Check scripts (rebuild them from the build log when needed): sign-in (29),
  Settings (30), Account (19), prompt (18). Ivan keeps two test reader accounts of his
  own for checklists.
- **Phase 4 (Accounts + Settings): done 2026-10-07.** Steps:
  4.0 guards (truncate guard + `db:backup` / `db:restore`, see "Protecting the data";
  **done 2026-10-07**: migration applied with Ivan's OK, `db:types` unchanged; Ivan ran
  `rls-check.sql` (all passed) and the dashboard's Truncate button was blocked); 4.1 schema
  (migration `20261007140000_profiles.sql`, **applied 2026-10-07** with Ivan's OK,
  `db:types` regenerated; **done**: Ivan ran `rls-check.sql`, all passed): `profiles` (id =
  auth user, `username` `^[a-z0-9_]{3,20}$` unique, `display_name` 1–40 trimmed,
  `avatar_path` inside `<id>/`, `created_at` = member since, not editable; everyone
  reads, owners edit those three columns, the admin edits any; no insert/delete through
  the API; truncate guard; in `db:backup`), a sign-up trigger on `auth.users` (username
  `reader_` + 6 random digits; display name: Google sign-ups get only the first name,
  `given_name` else the first word of the full name, provider read from
  `raw_app_meta_data`; everyone else "Reader"; never from the email), reserved names
  (`is_reserved_name`: containing gvan / starfox / spektral, or exactly ivan, admin, …;
  only the admin's profile may use them; Ivan is `gvan` / "Gvan"), the public `avatars`
  bucket (1 MB, WebP/JPEG/PNG, writes only in `avatars/<own id>/`, the admin can delete
  any), `delete_my_account()` (signed-in only, refuses admins); 4.2 sign-in for everyone on `/login` (Google + email code/link,
  `/auth/callback`, links return to the page you came from, header avatar menu / "Sign
  in" as a client component so pages stay static) **plus `/privacy`** (moved here from
  4.4: it must be live before the Google app is published; **done 2026-10-07**: tested by
  Ivan, checklist 1–8, privacy text approved; both email templates pasted into Supabase
  before testing (safe with the old code); pushed `c1badb0`, live. Ivan
  **published the Google app; live Google sign-in works** (2026-10-07). **Domain:**
  `starfoxlabs.org` is Vercel's primary domain and www redirects to it (checked
  2026-10-07: www → 301 to the apex, canonical links match `site.url`). The www
  addresses stay in Supabase's Redirect URLs and Google's origins as a backup; details in the build log, "Step 2"; Ivan's answers: contact
  `starfoxlabs.contact@gmail.com`, Supabase region Tokyo, his admin email is his Gmail so
  Google signs him into the admin, signing out stays on the page and signs out this
  browser only, the menu's Admin link only for him); 4.3 Settings: Profile
  (display name, username, picture, linked sign-in methods) + Appearance (plan approved
  2026-10-07; Ivan's answers: automatic centred square crop, Google picture copied only
  at sign-up, appearance saved per browser, no username-change limit for now; **done
  2026-10-07**: tested by Ivan, checklist 1–8; details in the build log, "Step 3";
  shared image code moved from `lib/admin/` to `lib/images/`); 4.4 delete
  account (typed confirmation; avatar removed by the server, then the RPC; no service key
  on Vercel; plus "Sign out everywhere"; **done 2026-10-07**: tested by Ivan, checklist
  1–7; build log "Step 4"; **profile pictures are cached for an hour only**
  (`AVATAR_CACHE_SECONDS`): deleting a file doesn't clear Supabase's CDN or Vercel's image
  cache, and with a year a deleted picture stayed public); 4.5 the end-of-article sign-up
  prompt (plan approved 2026-10-07: wording as drafted, just above Comments, short
  articles after 15 s, never again once signed in on this browser; **done 2026-10-07,
  switched off** (`SIGN_UP_PROMPT` in `lib/features.ts`); tested by Ivan with
  `NEXT_PUBLIC_SIGN_UP_PROMPT=on` in `.env.local`, checklist 1–8; build log "Step 5"). Newsletter tab: Phase 6.
  - **Ivan's decisions:** Google sign-in is allowed on his admin account (his Google
    account has 2-step verification); **the sign-up prompt is built in 4.5 but stays
    switched off until comments arrive in Phase 5**; 4.0 has both guards.
  - **Google / Supabase setup order:** before 4.2: Google Cloud project, Branding (no
    logo, so no review), Audience External **in Testing** with Ivan's Gmail and his
    test-reader email as test users, scopes `openid email profile`, Web OAuth client
    (redirect URI `https://cdnkflqqledvxqfayztm.supabase.co/auth/v1/callback`); Supabase:
    Google provider, manual identity linking, URL Configuration. During 4.2: test on
    localhost with the test users. **Right after 4.2 deploys:** check `/privacy` is live,
    paste the new Magic link + Confirm signup templates (written to work with the old and
    new code), then publish the Google app at once.
- **What comes next:** the later phases, one at a time (see "Build phases"): 5 Comments
  (next), 6 Newsletter, 7 Ranks, 8 YouTube + polish. The standing rules still apply:
  - **Plan first** for every phase and step; wait for Ivan's OK before building.
  - **Ivan runs the browser checklists** himself; give him a short checklist each step.
    Playwright only when he explicitly asks, and then localhost only (see "Browser
    testing").
  - **Phase 6 test-data rule:** before the newsletter can send, browser tests must stop
    publishing on the shared database (local Supabase for tests, or sending impossible
    from tests), and the admin needs two-factor sign-in.
- **Open to-dos (Ivan, 2026-10-07)** (details in "Still open"):
  1. ~~Rotate the Supabase secret key~~: **done 2026-10-07** (new key in `.env.local`,
     old one deleted).
  2. ~~Find out how every content table got emptied~~: **investigated 2026-10-07**, see
     "Still open"; guarded since Phase 4 step 0.
  3. **Re-add Ivan's song "speki"** (it went with the rest) through the admin, when he's
     ready.
  4. **Link Polacrity** in the home intro once it's public (`TODO(Ivan)` in
     `app/page.tsx`).
  5. **Fill in the `TODO(Ivan)` section intros** (`app/*/page.tsx`).
  6. **Replace the demo content with Ivan's real content before sharing the site widely**
     (`npm run demo:remove` first).
  - Also open: where the newsletter's subscribe link goes (Phase 6; the intro no longer
    has it); Ivan to skim the demo articles (placeholder writing in his voice).
- **Checks live in a temporary scratchpad** (gone after each session). Their methods are
  in the build log: Phase 3's fit check ("Step 6": every card's text inside its cell and
  titles not squeezed, at 360–1920 px), the demo check ("Demo content + favicon"), the
  intro measurements ("Home intro"), and Phase 4's account checks (above). Rebuild them
  the same way when needed.

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
- **Phase 3 (Section pages): done** (2026-10-06, every step tested by Ivan, pushed). Plan approved 2026-10-04; details, file maps
  and test methods: `docs/build-log.md`, "Phase 3". Steps:
  1. Shared pieces + chester-style motion + **Projects: done** (tested by Ivan on laptop
     and phone, pushed `a55f081`).
  2. **Reading: done** (tested by Ivan, checklist 1–8, pushed). Book titles in the sans,
     `Reading · Shelf` filler, ratings only on wide cards and in the "about this" panel
     (Ivan's choices).
  3. **Music: done** (tested by Ivan, checklist 1–7, pushed). Record hover as proposed;
     non-link "More on the way." filler; songs show once their article is published;
     sample songs only (Ivan's music isn't public yet).
  4. **Games: done** (tested by Ivan, checklist 1–8, pushed). Pop-up hover as approved;
     **PRESS START as approved by Ivan:** our own 5×7 SVG pixel letters
     (`components/press-start.tsx`, no font), cream `#fff4dc` with a hard `#1c1b1a`
     shadow, same in both themes, centred at 60% of the visible screen, appears 250 ms in,
     blinks 1 s (0.6 on / 0.4 off, hard cuts), steady with reduced motion.
  5. **Hobbies: done** (tested by Ivan, checklist 1–7, pushed). Ivan's choices: automatic LEARNING badge (never
     twice), `Hobbies · All` filler, cut-outs `object-contain`; the migration
     `20261005120000_post_items_hobby_style.sql` is **applied** to the live database
     (Ivan's OK, 2026-10-05; `db:types` unchanged, the fields are inside `details`). Effects use chester's
     real CSS (read in headless Edge); the photo slide is a `translate`, so reduced motion
     can skip it.
  6. **Home grid + status cards: done** (tested by Ivan, checklist 1–8, pushed). Ivan's choices: home is built from
     the **section loaders**; `home_feed` dropped (migration `20261005130000`, **applied**
     with Ivan's direct OK); status cards automatic, never twice; the latest article + 4
     more. **Pixel-art spot:** Ivan's own Shinx fan art (allowed, see "Visual design").
     Ivan chose the animation with its own first frame as the still: `public/art/
     shinx-still.webp` + `shinx-wag.webp` (190 × 120, white background removed, 8 frames,
     0.72 s loop); the pixel-art still is kept, unused, as `public/art/shinx-pixel.png`.
     Originals stay in `GIFS/` (untracked, Ivan's; he can delete it). The art moved to
     the footer afterwards (below).
- **Shinx moved to the footer: done** (tested by Ivan, checklist 1–5, pushed; build log,
  "After Phase 3: Shinx in the footer"). Chester's real
  footer (read in headless Edge; screenshot `design-refs/Screenshot 2026-10-06 060359`):
  `flex justify-center pt-36 pb-20`, the art and line one hover group, 0.5 s cross-fade,
  line `text-sm tracking-tight` muted. Ours (Ivan's choices): "Made in the lab by Gvan",
  no copyright or links, Shinx 60 px tall (95 × 60, the files are exactly 2×).
  `components/site-footer.tsx` (no longer cached: no clock), `components/pixel-art.tsx`
  (fixed size, hover on the parent `group/art`); the intro no longer has the art.
- **Rule for every Phase 3 step: re-read all the chester screenshots in `design-refs/`
  first** (chester: `Screenshot 2026-09-26 184223` home, `234546` home grid, `234621`
  projects, `234654` writing, `234716` hobbies, `2026-09-30 205309` reading,
  `2026-10-06 060359` footer; the other three are other references), plus "Pages" and "Visual design" above. Ivan wants the
  pages to look and feel a lot like chester.how. `design-refs/Chester Recording.mp4` shows
  its motion (the watch plugin, Gemini engine, is set up; its key lives only in
  `~/.config/watch/.env`). chester.how blocks plain fetches (HTTP 429) but loads in
  headless Edge with `puppeteer-core` if its CSS/JS needs checking again.
- **Decisions (Ivan):** home order newest first; a short last row gets a quiet "more" card
  (widen a card first); section intros are `TODO(Ivan)` placeholders; earlier ones:
  several songs can be in progress ("Now producing" = the top one in the Music order),
  published photo/cut-out hobby cards always have an image, "Learning" = hobby items in
  the `Learning` category, DROPPED games have no finish date.
- **Motion and effects: chester's, exactly as confirmed by Ivan** (numbers as he confirmed
  them; recreated in our own CSS, no animation library; all hover effects also on
  keyboard focus via `group-focus-within`, transforms only `motion-safe:`):
  1. Header tab bar drops in from 50 px above, 0.5 s spring (`header-in`); the right side
     fades in after 1 s (`fade-in-late`). *Built.*
  2. Cards drop in from 10 px above, 0.15 s apart, chester's default spring (`card-in`,
     `--spring-card`, 1.224 s; `Card index`). *Built.*
  3. (Images fading in: chester has no separate effect; it's the card drop-in.)
  4. Card hover: **chester's plain one step further from the page** (`--bg-raised-hover`;
     darker in light mode, lighter in dark), no purple tint or glow. *Built.*
  5. **The ↗ in a small circle that lights up** on hover (page colour + `--shadow-skeuo`),
     not a nudge. *Built.*
  6. Project screenshots grow to 105% on hover (150 ms ease-out). *Built for projects.*
     Games: Ivan's own "pop up" + PRESS START (step 4, built).
  7. Book (and song) covers tilt −3°, grow to 110%, deeper shadow (`rotate-[-3deg]
     scale-110` + bigger shadow, 150 ms). *Step 2 / 3* (songs: Ivan may pick a musical
     effect instead, step 3).
  8. Photo cards: the photo slides down 48 px (`mt-12`) revealing the label row; the white
     caption gets a dark see-through background. *Built (step 5).*
  9. Cut-out cards: the text block (gradient from the card colour) fades to 20%; the cut-out
     grows to 105% and comes in front. *Built (step 5).*
  10. A soft pill slides under the hovered header tab (mouse only). *Built.*
  11. Sticky, frosted header; its right side fades out past 20 px of scroll (`inert`).
     *Built.*
  Reduced motion: no movement and no delays; colour changes and the sticky header stay.
  Chester's leaf → maple footer art: Ivan's Shinx instead (footer, built 2026-10-06).
- **Pieces to reuse** (step 1): `Card` (`index`, `links` for small extra links,
  `playedMs`), `CardGrid` + `spanClass`, `fillGrid` (`lib/grid.ts`), `FramedScreenshot`,
  `SectionHeader`, the cached-loader pattern in `lib/projects.ts` (`"use cache"`,
  `cacheLife("hours")`, `cacheTag(section tag, "posts")`, `supabasePublic`, link only to
  published articles), `getPostItem` + `AboutItem` (add a `case` per section).
  Step 2 added `lib/books.ts` (`getPublishedBooks`, `bookLinks`) and
  `components/book-card.tsx` (`BookCard`, `BookCover` with the typed cover and `tilt`,
  `Stars`) for the home grid in step 6. Step 3 added `lib/tracks.ts`
  (`getPublishedSongs`, `songHref`, `TRACK_LINK_LABELS`), `components/song-card.tsx`
  (`SongCard`, `RecordSleeve` with the record), `components/cover.tsx` (`TypedCover`, shared
  by books and songs) and `components/audio-player.tsx`. Step 4 added
  `lib/games-loader.ts` (`getPublishedGames`), `components/game-card.tsx` (`GameCard`),
  `components/press-start.tsx`, `FramedScreenshot`'s `hover="pop"` + `TitleBar`, and
  `Card`'s `meta` slot (lines right under the label). Step 5 added `lib/hobbies-loader.ts`
  (`getPublishedHobbies`), `components/hobby-card.tsx` (`HobbyCard`, all three styles) and
  `BadgeRow` (`components/badge.tsx`). **Card text must fit its cell:** titles are
  `shrink-0` (a `line-clamp` element can otherwise be squeezed by the flex column and
  clipped silently); measure titles against their line count at 360–1920 px.
  Shared helpers: `lib/reading.ts` (`compareBooks`, `READING_STATUS_LABELS`),
  `lib/games.ts` (`gameDetails`, `gameHref`, `hoursSummary`) and `lib/hobbies.ts`
  (`hobbyHref`, `hobbyBadges`, `hobbyCaption`, `hobbiesSummary`): the admin forms load
  these in the browser, so keep server-only code out; loaders go in their own file.
- **Testing a step** (build log, Phase 3 step 1): unit tests with tsx for pure logic;
  production build on :3124 driven by `puppeteer-core` in Edge and real Firefox (cards,
  links, no holes at 390/800/1280/1920 px, no sideways scroll, hover values via computed
  styles, `document.getAnimations()` for timings, reduced motion: Edge emulated, Firefox
  via `extraPrefsFirefox: { "ui.prefersReducedMotion": 1 }`). Headless browsers run in
  dark mode. Console noise to expect: none since step 5 (every section page exists).
  **No screenshots** for looks (Ivan checks them); give Ivan a checklist each step.
- Things to carry in:
  - Pages use the cache tags the admin already updates (`projects`, `books`, `tracks`,
    `games`, `hobby_items`, plus `home` and `posts`); public pages stay static (Proxy
    only runs on `/admin`, `/settings`, `/login`, `/auth`).
  - Music: the snippet length to show is `tracks.snippet_seconds` (decoded at upload; the
    player's own figure can be wrong, e.g. in Firefox); older rows fall back to the player.
  - Spektral is Ivan's artist name: `site.artist` in `lib/site.ts`. Song cards on home are
    labelled `Music · <song title>` (`SongCard`'s `label`); "Now producing" keeps
    `Music · Spektral`.
  - **Live data is the demo set** (2026-10-06; see "Demo content" in "Still open"). The
    old samples and Ivan's checklist items are gone. Checks must follow the live data, not
    assume particular items.

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
- **Placeholders for Ivan** (all marked `TODO(Ivan)`): the section intros
  (`app/*/page.tsx`). (The home intro is Ivan's own now; the status-card placeholders are
  data now.)
- **Polacrity link** (to-do, Ivan 2026-10-07): "Polacrity" in the home intro is ink text
  without a link until it has a site (`TODO(Ivan)` in `app/page.tsx`).
- **Newsletter link needs a new home** (Phase 6): the intro used to end with "A newsletter
  for new writing is on its way."; Ivan's new intro (2026-10-07) doesn't have it. Decide
  where the subscribe link goes when building the newsletter (e.g. under the intro, or in
  the footer).
- **Demo content** (live since 2026-10-06, for showing the site): 16 articles, 3 projects
  (Ivan's real ones), 7 books, 2 songs + 1 in progress, 4 games, 7 hobby items, all
  published. Every demo row's id starts `de300000-`; every demo file is in a `demo/`
  folder in its section's Storage folder. **Remove it all with `npm run demo:remove`**
  (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Made by `scripts/demo-content.mjs`
  (`add` needs the generated assets; content in `scripts/demo-content-data.mjs`; build
  log, "Demo content"). The writing is placeholder text in Ivan's voice.
- **Before the demo content went in, every content table was already empty** (0 rows,
  drafts included): the samples, Ivan's checklist items and his own song "speki" went.
  Re-adding "speki" is to-do 3. Its uploaded files (and the old samples' files) are still
  in Storage, outside the `demo/` folders (see "Unused media"). **Investigated
  2026-10-07** (details: build log, "Phase 4, step 0"): emptied between 06:09 and 06:33
  AEST on 2026-10-06, while Ivan was in the dashboard getting the secret key. Not the
  repo (no migration, script or app code can do it; no `db reset`: the `admins` row
  dates from 2026-09-30) and not a Claude session (transcripts: no database writes in
  that window). Most likely a `TRUNCATE posts … CASCADE` (empties exactly those six
  tables, skips the row rules, leaves `admins` and Storage); Ivan doesn't remember it and
  the SQL editor history has nothing. Now guarded (see "Protecting the data").
- The Supabase secret key was rotated on 2026-10-07 (the old one was pasted into a chat).
  It lives only in `.env.local`, never in the repo or Vercel.
- `supabase/seed.sql` and `seed-sections.sql` (the old samples) still exist for a local
  database; the live one doesn't use them.
- **Vercel** (Ivan to confirm it's done): Production Branch = `main`; env vars
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable
  key, NOT `..._ANON_KEY` as first suggested); check the latest deploy succeeded.
- **Known dead links**: none (all sections live since step 5).
- **Username changes: once every 30 days** (Ivan, 2026-10-07/08), so nobody dodges
  moderation by renaming: in the 5.1 migration; Settings explains it in 5.4.
- **Approve comments before publishing** (to-do, Ivan 2026-10-08): only if spam becomes a
  problem. Comments go live at once for now. (Also "later if needed": blocking a reader
  from commenting.)
- **Switch the sign-up prompt on in Phase 5** (built in 4.5, off): set
  `SIGN_UP_PROMPT` to on in `lib/features.ts`, and add to `/privacy` that the browser
  remembers a dismissed prompt and that someone was signed in (`lib/sign-up-memory.ts`).
- UQ palette beyond purple is still a TODO (see Colors).
- **Two-factor sign-in for the admin** before the newsletter goes live (see Phase 6).
- **Browser tests must stop publishing on the shared database** before the newsletter goes
  live: local Supabase for tests, or emails impossible from tests (see Phase 6). Local
  Supabase needs Docker Desktop, which isn't installed (found 2026-10-07).
- **Scheduled publishing** (to-do): pick a future date and time and the article goes live
  then. Needs public queries to require `published_at <= now()`, and something to refresh
  the cache at that moment (e.g. a Vercel Cron job calling a route that runs
  `revalidateTag`).
- **Unused media** (to-do): images removed from an article body, and replaced or removed
  covers, stay in the `media` bucket. Deleting automatically is risky (a file may be used
  elsewhere, or the change undone), so build an admin view that lists files no article or
  item references, to delete by hand. **It should also list orphaned profile pictures**
  (Ivan, 2026-10-07): `avatars/<id>/` folders of accounts that no longer exist (deleted
  in the Supabase dashboard, which doesn't know about our folders; Settings → Account
  deletes its own files first) and files no profile points to.
- **Redirects for changed slugs** (to-do): changing a published article's slug breaks old
  links. Fix: a `post_redirects` table (`old_slug` → `post_id`) filled when a published
  slug changes, checked by the article page before `notFound()` (permanent redirect).
- **Music filler → Spektral profile** (to-do, decided 2026-10-04): the Music page's
  filler is a quiet non-link "More on the way." card while Ivan's music isn't public. Once
  it is, link it to his Spektral profile (`MoreCard` in `app/music/page.tsx`, marked
  `TODO(Ivan)`; the profile URL belongs in `lib/site.ts`).
- `public/art/shinx-pixel.png` (Ivan's pixel-art Shinx) is kept, unused, in case it's
  wanted somewhere later.

### Notes for the next session (gotchas — keep these)
**Next.js 16**
- Read `node_modules/next/dist/docs/` before using an API (see AGENTS.md). Middleware is
  called **Proxy**; `proxy.ts` only runs on `/admin`, `/settings`, `/login` and `/auth`
  (its `matcher`), so public pages stay static. Keep it that way: signed-in bits on public
  pages (the header's account menu, the sign-up prompt) read the session in the browser.
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
- Auth (since Phase 4): one `/login` for readers and the admin: Google, or an email code +
  link (`signInWithOtp`, new emails get an account). The email templates (Magic Link and
  Confirm signup, `supabase/templates/`) link to `/auth/confirm?token_hash=…&next=
  {{ .RedirectTo }}`, which works in any browser; Google returns through `/auth/callback`
  (PKCE). Redirects only to paths on this site (`lib/next-path.ts`). Being the admin is
  only a row in `admins`, never decided by signing in. Reader pages use `requireUser()`,
  admin pages `requireAdmin()`.

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
