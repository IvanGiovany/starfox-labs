# Starfox Labs — Project Brief

## What this is
Personal blog for Ivan at starfoxlabs.org. Mostly software topics, some general posts.
Promotes Ivan's YouTube channel. Readers can optionally create accounts, comment on
articles, subscribe to a newsletter, and earn ranks for long-term loyalty (top rank: **Immortal**).

This is also a portfolio project for software engineering job applications, so
code quality, clear structure, and a good README matter.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres (posts, projects, books, releases, hobbies, profiles, comments,
  subscribers), Auth, Storage (images, covers, screenshots, avatars)
- ALL content (articles, projects, books, music, hobbies) lives in the database and is
  managed through `/admin` on the site (NOT files in the repo), so Ivan can add things
  without touching code.
- Resend: newsletter + account emails
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
Header tab bar: **Gvan · Projects · Writing · Reading · Music · Hobbies**
("Gvan" is the home link, like "Chester" on chester.how). The site itself is still
called Starfox Labs (page titles, footer, emails).

- **Home (`/`)** — the intro (with a one-line "subscribe to the newsletter" link) sits in
  the top-left of one dense grid that mixes cards from every section, each labelled
  `Section · Name` (e.g. `Writing · Article`, `Projects · NEON DRIFT`, `Music · Spektral`).
  Only items marked "Show on home" appear, plus the status cards. Latest YouTube videos
  join in the polish phase.
- **Projects (`/projects`)** — `projects.` Software projects as screenshot cards, e.g. the
  NEON DRIFT and NEON BREACH browser games. Cards link to the live project (↗).
- **Writing (`/writing`)** — `writing.` Articles as cards (label, tag badges, serif title,
  date, excerpt), newest first. Above the grid: search (title, summary, tags and body;
  updates as you type) and tag filters with counts. Filter state lives in the URL.
- **Article (`/writing/[slug]`)** — clean reading layout, NOT cards: title, date, reading
  time, tag badges, optional cover image, body, optional embedded YouTube video.
  Comments at the bottom.
- **Reading (`/reading`)** — `reading.` Books: cover image, title, author, and a
  `READING` / `READ` badge. Currently-reading books first.
- **Music (`/music`)** — `music.` Ivan's releases as Spektral: cover art, release type
  and date, an embedded player (Spotify / SoundCloud / Bandcamp / YouTube) or streaming links.
- **Hobbies (`/hobbies`)** — `hobbies.` Mixed cards: full-bleed photos, cut-out images,
  big serif names with badges, labelled by category (`Hobbies · Coffee`, ...).
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
- Ivan only: enforced server-side and by RLS (`public.is_admin()`), not just hidden in the UI.
- One tab per content type: **Writing, Projects, Reading, Music, Hobbies**. Each tab lists
  items (drafts included) with New / Edit / Delete, and a form for one item.
- Every form has: title, slug (auto from title), image upload (paste, drag or pick;
  stored in Supabase Storage), badges, **Show on home** toggle, **Card size**
  (small / wide), Save draft, Publish.
- Writing form extras: summary, tags, optional YouTube link, markdown body with
  side-by-side live preview, images pasted/dragged into the body. Publishing
  optionally sends the newsletter.
- Saving or publishing refreshes the cached pages (`revalidateTag`) so changes show at once.
- Moderation: delete any comment.

## Data model
One table per content type, not one generic table. Each type has different fields
(a book has an author and reading status, a release has streaming links and an embed,
a project has a live URL and a stack). Separate tables give real columns with
constraints and exact TypeScript types, simple per-table RLS, and admin forms that
map 1:1 to a table. The one place that needs everything together, the home grid,
reads from a Postgres view that unions the tables into one card shape.

Shared columns on every content table: `id`, `slug` (unique), `title`, `status`
(`draft` | `published`), `show_on_home` (bool), `card_size` (`small` | `wide`),
`sort_order`, `badges text[]`, `image_path` (Storage path), `created_at`, `updated_at`.

| Table | Extra columns |
|---|---|
| `posts` (exists) | summary, body_md, tags, cover_image_url, youtube_url, published_at |
| `projects` | summary, url, repo_url, stack text[], started_on |
| `books` | author, reading_status (`reading` / `read` / `want`), started_on, finished_on, rating, note, url |
| `releases` | release_type (`single` / `ep` / `album`), released_on, in_progress (bool), embed_url, links jsonb (spotify, soundcloud, bandcamp, youtube, apple), note |
| `hobby_items` | category (e.g. Coffee), subtitle, note, image_style (`photo` / `cutout` / `none`), caption, url |

- `home_feed` view (`security_invoker = true`, so RLS still applies): published items with
  `show_on_home` from every table, as `section, slug, title, label, href, image_path,
  image_style, caption, badges, card_size, sort_date`.
- **Status cards come from data, not code:** "Now producing" = a release with
  `in_progress = true`; "Reading" = books with `reading_status = 'reading'`;
  "Learning" = a hobby item in the `Learning` category.
- `admins` table (`user_id`) + `public.is_admin()` function. Every table gets two kinds of
  policy: "anyone reads published rows" and "admin does everything".
- Storage: one public-read `media` bucket, admin-only writes, folders per section
  (`projects/`, `books/`, `music/`, `hobbies/`, `writing/`).
- Migrations live in `supabase/migrations/` (Ivan runs them in the SQL editor).

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
  - Content sits in the **lower half** of the card. Screenshots and images **bleed off the
    bottom edge**. Photo cards are **full-bleed** with a white caption bottom-left.
  - Titles in the serif, often large. Excerpts clamp to a few lines.
  - The grid is always full: no holes, no sparse boxes floating in empty space.
- **Badges**: small uppercase monospace labels on soft pastel backgrounds with a slightly
  darker outline of the same hue (like chester's `NOW BREWING`). Used for status
  (`NOW PRODUCING`, `READING`, `READ`, `LEARNING`) and for article tags. They must work in
  both themes (low-alpha tints with light text in dark mode).
- **Layout rules — IMPORTANT:**
  - Cards are for the home and section grids. The article reading page and settings/admin
    forms are text-first: typography, spacing and alignment do the work.
  - NO sparse layouts: every grid is dense, every page feels full of content.
  - NO hero banners or giant centered headings. (Section titles are huge but left-aligned
    and sit in the normal flow, chester-style.)
  - Content aligns to one consistent container/grid.
  - Article body: comfortable reading width (~65–75 characters per line).
- **Motion:** smooth page transitions between routes and a fade/slide-in for article content.
  Subtle and fast (200–400ms). Respect `prefers-reduced-motion`.
- Fully responsive; must look good on mobile.
- Screenshots of references live in `/design-refs/` (git-ignored).
- Do not use any Nintendo / Star Fox artwork or logos.

## Build phases (build ONE phase at a time)
1. **Foundation** — design system, header/footer, Supabase + `posts`, chester-style Home
   (grid with writing and status cards), **Writing** page (cards, search, tag filters),
   **Article** page, README. Seed posts. *(Steps 1–4 done: design system, layout shell,
   posts table, home.)*
2. **Admin sign-in + Writing editor** — Ivan-only sign-in (magic link), `admins` table and
   `is_admin()`, admin RLS policies on `posts`, `/admin` shell with tabs, the Writing
   editor with image uploads, `media` bucket, cache refresh on save/publish.
   (Admin needs sign-in, so the admin part of auth comes before reader accounts.)
3. **Sections** — migrations for `projects`, `books`, `releases`, `hobby_items` and the
   `home_feed` view; admin forms for each; the Projects, Reading, Music and Hobbies pages;
   home grid mixes all sections; status cards from data. One step per section.
4. **Accounts + Settings** — reader sign-in (Google + email), profiles, profile pictures,
   Settings tabs, delete account.
5. **Comments** — comments and replies on articles, moderation.
6. **Newsletter** — subscribe (with or without account), double opt-in, send on publish, unsubscribe.
7. **Ranks** — see rules below; show rank badges next to usernames and on profiles.
8. **YouTube + polish** — live YouTube video cards on home, ⌘K search, page transitions,
   SEO, RSS feed, sitemap, OG images.

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
