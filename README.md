# Starfox Labs

My personal site at **[starfoxlabs.org](https://starfoxlabs.org)**: a "digital garden" of
writing about software, projects, books, games and music (I make music as Spektral).
Everything on it, from articles to books, songs, games and hobbies, is written and
managed in an admin on the site itself and stored in Postgres, so posting never means
touching code.

![Home page in light mode](docs/screenshots/home-light.png)

| Dark mode | Writing | Article | Phone |
| --- | --- | --- | --- |
| ![Home page in dark mode](docs/screenshots/home-dark.png) | ![Writing page with search and tag filters](docs/screenshots/writing.png) | ![Article with a highlighted code block](docs/screenshots/article-dark.png) | ![Home page on a phone](docs/screenshots/home-mobile.png) |

## What's built

- **Home**: a short intro next to one dense grid that mixes every section: the latest
  writing, what I'm producing, reading and learning, items I pick for the front page, my
  newest YouTube videos, and the archive with tag counts.
- **Section pages**: Writing, Projects, Reading, Music, Games and Hobbies, each a card grid
  in its own style (framed screenshots, book covers on a shelf, record sleeves, game
  windows, full-bleed photos and cut-outs). Any item can link to an article about it, and
  that article then shows an "about this" panel (a book's cover and rating, a game's
  hours, a song's 30-second preview in a custom audio player).
- **Writing** (`/writing`): search as you type (titles, summaries, tags and full text), tag
  filters with counts, and "Load more"; filters live in the URL, so a view can be shared.
- **Articles** (`/writing/[slug]`): a reading layout with syntax-highlighted code blocks,
  footnotes, a click-to-play YouTube player, older/newer links, and **comments**: signed-in
  readers post, reply (one level), edit and delete their own; I can delete any.
- **Admin** (`/admin`, only me, with **two-factor sign-in**): an editor with live preview
  for articles, and quick, phone-friendly forms for every section (drag to reorder,
  one-tap status changes, image upload and import, Open Library autofill for books, and an
  in-browser tool that cuts a song's 30-second preview and encodes it to MP3), plus
  comment moderation.
- **Reader accounts** (optional): sign in with Google or an email code, a public profile
  with a picture, settings (profile, appearance, account deletion), and a gentle sign-up
  invitation at the end of articles.
- **For the open web**: an RSS feed (`/rss.xml`), a sitemap and `robots.txt`, link-preview
  images for every page, and structured data (JSON-LD) for the site and its articles.
- **Feel**: light and dark themes with no flash on load, chester.how-style motion (cards
  dropping in, gentle hovers), a quiet cross-fade between pages, a "Still growing" empty
  state with a pixel-art sprout, and `prefers-reduced-motion` respected throughout.

A newsletter (a weekly digest with double opt-in) is half-built: its database is ready.

## Tech stack

| | |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components), React 19, TypeScript |
| Styling | Tailwind CSS v4, design tokens in plain CSS, no animation library |
| Data | [Supabase](https://supabase.com): Postgres with Row Level Security, Auth (Google, email codes, TOTP two-factor) and Storage |
| Email | [Resend](https://resend.com) as Supabase Auth's SMTP |
| Markdown | unified / remark / rehype, [Shiki](https://shiki.style) via rehype-pretty-code |
| Images | `next/image`, link previews drawn with `next/og` |
| Hosting | Vercel, deployed from `main` |

## How it works

A few decisions worth explaining:

**Rendering and caching.** Public pages are prerendered and served from cache, using Next
16's Cache Components: data functions are marked `"use cache"` and tagged per section
(`posts`, `books`, `tracks`…). Saving anything in the admin refreshes the right tags, so a
change shows on the next request without rebuilding. Anything that depends on who's
reading (the account menu, comments, the sign-up invitation) loads in the browser, so the
pages themselves stay static.

**Security lives in the database.** Supabase exposes Postgres to the browser, so every
rule is enforced there, not in the UI: Row Level Security on every table, column-level
grants, and triggers for the rules a policy can't express (one level of comment replies,
a comment rate limit, a username that changes once every 30 days, reserved names).
Admin powers require a two-factor session: `public.is_admin()` checks for `aal2`, so even
a bug in the app couldn't let a stolen password publish. A rolled-back SQL script
([`supabase/tests/rls-check.sql`](supabase/tests/rls-check.sql)) checks all of it as a
visitor, a reader and the admin.

**Protecting the data.** `TRUNCATE` on the content tables is refused by a trigger unless
switched on for that transaction, and `npm run db:backup` saves every row (restores only
ever add missing rows back).

**Markdown on the server.** Articles are turned into React on the server: GitHub-flavored
markdown, heading anchors, and syntax highlighting in two themes that follow the site
theme through CSS variables. Readers download finished HTML; raw HTML in a post is dropped.

**Search that scales with daily posting.** The Writing page ships title, summary and tags
for every article, and the full text comes from a separate prerendered index downloaded
only once someone starts typing.

**Themes without a flash.** Every color is a CSS variable holding both values through
`light-dark()`; a tiny inline script applies a saved choice before the first paint.

**Accessibility and SEO.** Keyboard focus styles, a skip link, 44 px touch targets on
forms, screen-reader announcements, alt text throughout, one `h1` per page, and reduced
motion respected (including the page transitions). Lighthouse scores 100 for
accessibility, best practices and SEO on the main pages.

**Testing.** Pure logic is unit-tested; each feature is also checked on a production build
in headless Edge and Firefox with throwaway accounts that are deleted afterwards. The full
record of what was built, decided and tested is in [`docs/build-log.md`](docs/build-log.md).

## Project structure

```
app/                     Routes (App Router)
  page.tsx               Home grid
  writing/ projects/ reading/ music/ games/ hobbies/
                         Section pages and their preview images
  writing/[slug]/        Article page (with comments) and its preview image
  admin/                 The admin: editors, section forms, comment moderation
  settings/ login/ auth/ Reader accounts, sign-in (incl. two-factor), callbacks
  rss.xml/ sitemap.ts robots.ts
  globals.css            Design tokens, motion, prose and code-block styles
components/              UI pieces (cards, badges, header, comments, audio player…)
lib/                     Data loaders, rules, markdown, search, feeds, site config
supabase/
  migrations/            Schema, RLS policies, triggers and functions (SQL)
  tests/rls-check.sql    Security and rules check (rolled back)
  templates/             Sign-in email templates
scripts/                 Backups and restores, demo content
docs/build-log.md        What was built, decided and tested, step by step
CLAUDE.md                Project brief, design rules and build plan
```

## Running it locally

You'll need Node.js 20.9 or newer and a free [Supabase](https://supabase.com) project.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and **publishable**
   key (Supabase → Project Settings → API Keys).
3. Create the database schema with the Supabase CLI (installed as a dev dependency). On a
   fresh project, `--include-seed` adds sample content:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --include-seed
   ```
4. Start the dev server and open http://localhost:3000:
   ```bash
   npm run dev
   ```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (must pass before pushing) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenerate `lib/database.types.ts` from the linked database |
| `npm run db:backup` | Save every content row to `backups/` (needs the service key) |
| `npm run db:restore -- <file>` | List rows missing since a backup; `--apply` adds them back |

### Environment variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe in the browser; RLS decides access) |
| `NEXT_PUBLIC_SITE_URL` | Optional. Overrides `https://starfoxlabs.org` for canonical URLs and link previews |
| `SUPABASE_SERVICE_ROLE_KEY` | Local scripts only (backups, restores); never deployed |
| `NEWSLETTER_SECRET` | Server-only secret for the newsletter's sign-up functions |

## Roadmap

Built one phase at a time; the full plan is in [CLAUDE.md](CLAUDE.md#build-phases-build-one-phase-at-a-time).

- [x] **Foundation**: design system, home, writing, articles, link previews, 404s
- [x] **Admin**: sign-in for me only (with two-factor), and an editor for articles and every section
- [x] **Sections**: Projects, Reading, Music, Games, Hobbies
- [x] **Accounts and settings** for readers (optional)
- [x] **Comments**, with moderation
- [x] **Polish**: YouTube videos on home, RSS, sitemap, link previews, page transitions, SEO
- [ ] **Newsletter**: a weekly digest with double opt-in (database ready; paused)

## Credits

Design inspired by [chester.how](https://chester.how) (layout, card grid and motion) and
[jmduke.com](https://www.jmduke.com) (tag filters, warm dark mode). Code and writing are my
own. Fonts: [Newsreader](https://github.com/productiontype/Newsreader) and
[Inter](https://github.com/rsms/inter), both under the SIL Open Font License. Song previews
cut in the admin are encoded with [lamejs](https://github.com/shijinyu/lamejs) (the
`@breezystack/lamejs` package, a JavaScript port of the LAME MP3 encoder, LGPL-3.0), used
unmodified in its own Web Worker.
