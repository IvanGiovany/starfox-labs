# Starfox Labs — Project Brief

## What this is
Personal blog for Ivan at starfoxlabs.org. Mostly software topics, some general posts.
Promotes Ivan's YouTube channel. Readers can optionally create accounts, comment on
articles, subscribe to a newsletter, and earn ranks for long-term loyalty (top rank: **Immortal**).

This is also a portfolio project for software engineering job applications, so
code quality, clear structure, and a good README matter.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres (posts, profiles, comments, subscribers), Auth, Storage (images, avatars)
- Articles are stored in the database and written through an admin editor on the site
  (NOT markdown files in the repo) so Ivan can post daily without touching code.
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
study it (and the chester screenshot in `design-refs/`). Take its ideas and structure;
write our own code and content — do not copy its code, text, or assets.
(Note: chester.how sits behind Vercel bot protection, so automated fetches fail.
Rely on the screenshots in `design-refs/`; ask Ivan for more if something is unclear.)

Elements to take from chester.how:
- **"Digital garden" feel** — the site is a lived-in personal space, not a corporate blog.
- **Header**: nav links grouped on the left (site name first, then the page links), social
  links as small muted text on the right. Quiet and small, no big nav bar, no hero banner.
- **Friendly intro**: a few short sentences in a large, light serif. Most words are muted;
  the key words (YouTube, music, what Ivan builds) are in full-strength ink and are links.
- **Home = a dense grid of mixed cards** next to / below the intro:
  - Card types: latest articles, YouTube videos, **"Now producing"** (Ivan's music as
    Spektral), **"Currently learning"**.
  - Varied sizes (some cards span 2 columns or 2 rows), small gaps (~8px), soft rounded
    corners, a subtle raised background instead of borders.
  - Each card has a small muted label in the top-left (e.g. `Article · Next.js`,
    `Video`, `Now producing`) and a small ↗ arrow in the top-right when it links out.
  - Image cards can carry a short caption overlaid bottom-left (e.g. a date and place).
  - The grid must be DENSE and varied — never sparse boxes floating in empty space.

### Secondary reference: https://www.jmduke.com/
Used for the **Articles page** and search, not the home page:
- **Dense article list**: each row = title, date, and a one-line excerpt. No cards,
  no thumbnails in the list. Rows separated by spacing/thin lines, not boxes.
- **Tag filters with counts**, e.g. `nextjs (12)`, as plain text links, not pill buttons.
- **⌘K / Ctrl+K search** that opens a command-palette style search over all articles.
- **Collections** (later phases): e.g. bookmarks grouped by category with counts, and a
  shelf (books/tools/albums) with grid and list views and sort options.
- **Warm dark mode**: near-black with warm undertones (`#1C1B1A`), not cold blue-black.
- Light and dark both supported (`color-scheme: light dark`).

## Pages
- **Home (`/`)** — chester-style digital garden: a short friendly intro (with a one-line
  "subscribe to the newsletter" link) and a dense grid of mixed cards: latest articles,
  latest YouTube videos, "Now producing" (Spektral), "Currently learning".
  On mobile the grid collapses to one or two columns but stays dense.
- **Articles (`/articles`)** — every article, newest first, dense list (title, date, excerpt),
  tag filters with counts, and search (searches title, summary, tags, and body; updates as you type).
  ⌘K search works from any page.
- **Article (`/articles/[slug]`)** — clean, simple reading layout. Title, date, reading time,
  tags, optional cover image, body, optional embedded YouTube video. Comments at the bottom.
- **Settings (`/settings`)** — tabs:
  - *Profile*: display name, username, profile picture upload, linked sign-in methods
  - *Appearance*: light / dark / system theme
  - *Newsletter*: subscribe / unsubscribe
  - *Account*: delete account (with a typed confirmation step)
- **Sign in (`/login`)** — Google or email (magic link).
- **Admin (`/admin`)** — Ivan only. Write/edit/publish articles, delete comments.
- **Privacy (`/privacy`)** — what data is stored and why.
- Header (chester-style): on the left, site name + Home, Articles; on the right, small muted
  social links (YouTube, GitHub), RSS, theme toggle, and a small profile avatar button
  (opens menu → Settings, Sign out) or a "Sign in" text link if logged out.

## Writing articles (admin editor)
- `/admin/write`: title, slug (auto from title), summary, tags, optional cover image,
  optional YouTube video link, and a markdown body with side-by-side live preview.
- Images can be pasted or dragged into the editor and upload to Supabase Storage.
- Buttons: Save draft, Preview, Publish. Publishing optionally sends the newsletter.
- Only Ivan's account can access `/admin` (enforced server-side and by RLS, not just hidden in the UI).

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
- **Layout rules — IMPORTANT:**
  - Cards live on the **home page grid** only. Everywhere else is text-first: typography,
    spacing, and alignment do the work — not boxes, borders, or shadows.
  - The home grid is dense and varied (mixed sizes and card types, small gaps).
    NO small floating cards scattered with large empty gaps around them.
  - NO grids of identical boxes. On the Articles page, articles are always a list.
  - NO big hero banners or giant centered headings.
  - Content aligns to one consistent column/grid; the page should feel full of content.
  - Article body: comfortable reading width (~65–75 characters per line).
- **Motion:** smooth page transitions between routes and a fade/slide-in for article content.
  Subtle and fast (200–400ms). Respect `prefers-reduced-motion`.
- Fully responsive; must look good on mobile.
- Screenshots of references live in `/design-refs/` (git-ignored).
- Do not use any Nintendo / Star Fox artwork or logos.

## Build phases (build ONE phase at a time)
1. **Foundation** — Next.js setup, design system (colors, fonts, light/dark theme), header/footer,
   Supabase project + `posts` table, Home (intro + card grid with article cards and static
   "Now producing" / "Currently learning" cards), Articles (list, tags with counts, search),
   Article page using seed posts. Study chester.how (screenshots) before starting.
2. **Admin editor** — Ivan-only `/admin/write` to create, edit, and publish articles with images.
3. **Accounts + Settings** — Google + email login, profile pictures, Settings tabs, delete account.
4. **Comments** — comments and replies on articles, moderation.
5. **Newsletter** — subscribe (with or without account), double opt-in, send on publish, unsubscribe.
6. **Ranks** — see rules below; show rank badges next to usernames and on profiles.
7. **YouTube + polish** — live YouTube video cards on home, ⌘K search, page transitions,
   SEO, RSS feed, sitemap, OG images.
8. **Collections (optional)** — bookmarks and a shelf (e.g. tools, books, or albums in rotation).

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
