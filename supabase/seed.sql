-- SAMPLE CONTENT for local development and design work.
-- These are placeholder articles, not real ones. Delete them before launch:
--   delete from public.posts where slug like 'sample-%';
--
-- Safe to re-run: existing sample posts are replaced.

delete from public.posts where slug like 'sample-%';

insert into public.posts (slug, title, summary, tags, status, published_at, body_md) values

('sample-theme-flash-nextjs',
 'Dark mode without the flash',
 'Why a tiny inline script beats a theme library for avoiding the white flash on load.',
 array['nextjs', 'css'],
 'published', now() - interval '1 day',
$md$
Every site with a theme toggle has to answer one question: **what colors do you paint before JavaScript loads?**

## The problem

The server doesn't know which theme a reader picked, so it sends a default. If the reader chose dark, they see a white page for a split second, then it snaps to dark.

## The fix

Run a few lines of script in the `<head>`, before the page is drawn:

```js
const theme = localStorage.getItem("theme");
if (theme) document.documentElement.dataset.theme = theme;
```

Because the browser runs it while parsing the HTML, the right colors are there on the very first paint.

> The best loading state is the one nobody sees.

## What I'd do differently

- Keep "system" as the default, and only store a choice when the reader makes one.
- Put every color in a CSS variable, so switching themes is one attribute change.
$md$),

('sample-rls-explained',
 'Row Level Security, explained with a blog',
 'Postgres policies that decide who can read and write which rows, using this site as the example.',
 array['supabase', 'postgres'],
 'published', now() - interval '4 days',
$md$
Supabase exposes your database straight to the browser. That sounds terrifying until you meet **Row Level Security** (RLS).

## Deny by default

Once RLS is on, a table allows *nothing*. Every permission is a policy you write on purpose:

```sql
create policy "Published posts are readable by everyone"
  on public.posts for select
  using (status = 'published');
```

Drafts simply don't exist as far as a reader's query is concerned.

## Policies this blog will need

| Table | Who | Can |
| --- | --- | --- |
| posts | everyone | read published |
| posts | admin | read and write all |
| comments | signed-in users | write their own |

The nice part is that a bug in the frontend can't leak a draft. The database says no.
$md$),

('sample-tailwind-v4-tokens',
 'Design tokens in Tailwind v4',
 'Defining a warm light and dark palette once with CSS variables and light-dark().',
 array['css', 'tailwind'],
 'published', now() - interval '9 days',
$md$
Tailwind v4 moved configuration into CSS. For a small site that's a gift: the design system is one file.

## One variable, two values

```css
:root {
  color-scheme: light dark;
  --bg: light-dark(#f7f3ec, #1c1b1a);
}
```

The browser picks the value based on `color-scheme`, so there's no duplicated dark palette to keep in sync.

## Exposing tokens to Tailwind

```css
@theme inline {
  --color-bg: var(--bg);
}
```

Now `bg-bg` works everywhere, and changing a color means changing one line.
$md$),

('sample-typescript-generics',
 'TypeScript generics, slowly',
 'Notes from learning generics one small example at a time.',
 array['typescript'],
 'published', now() - interval '15 days',
$md$
Generics clicked for me when I stopped reading them as magic and started reading them as **parameters for types**.

## A function that keeps its type

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([1, 2, 3]); // number | undefined
```

`T` is filled in by whatever you pass. Nothing more.

## Constraints

Sometimes you need to know *something* about `T`:

```ts
function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}
```

1. Start with a concrete type.
2. Notice where you're copy-pasting it.
3. Replace it with `T`.
$md$),

('sample-git-glossary',
 'A tiny git glossary for future me',
 'The handful of git commands I actually use, and what each one really does.',
 array['git'],
 'published', now() - interval '23 days',
$md$
I keep forgetting these, so here they are in plain words.

- `git status`: what changed since the last commit.
- `git add -A`: stage everything, including deleted files.
- `git commit -m "..."`: save a snapshot with a message.
- `git push`: upload my commits to GitHub.
- `git branch -m old new`: rename a branch.

## The one that scares me

`git reset --hard` throws away uncommitted work. There's no undo, so I always run `git status` first.
$md$),

('sample-music-and-code',
 'What producing music taught me about code',
 'Loops, layers, and knowing when a track (or a feature) is finished.',
 array['music', 'life'],
 'published', now() - interval '34 days',
$md$
I make music as *Spektral*. The longer I do it, the more it feels like programming.

## Small loops first

A track starts with an eight-bar loop that sounds good on repeat. A feature starts with the smallest version that works. Both grow by adding layers, not by planning everything up front.

## Finishing is a skill

Neither a song nor an app is ever perfect. At some point you bounce the track, or ship the build, and start the next one.
$md$),

('sample-nextjs-server-components',
 'Server Components in plain words',
 'What runs on the server, what runs in the browser, and why it matters for a blog.',
 array['nextjs', 'react'],
 'published', now() - interval '48 days',
$md$
In the Next.js App Router, components run on the **server by default**. Only the ones marked `"use client"` ship JavaScript to the browser.

## Why a blog loves this

Most of a blog is text. Rendering it on the server means readers download HTML, not a JavaScript app that then builds the HTML.

## When you need the client

- Reading the current URL to highlight a nav link.
- A theme toggle button.
- Search that updates as you type.

Everything else can stay on the server.
$md$),

-- A draft: should NOT appear anywhere on the site. Useful for checking RLS.
('sample-draft-not-visible',
 'This draft should never be visible',
 'If you can see this on the site, Row Level Security is misconfigured.',
 array['nextjs'],
 'draft', null,
$md$
Drafts are hidden by the `select` policy on `posts`.
$md$);
