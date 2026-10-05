// The demo content itself (see demo-content.mjs). Images: Unsplash photo ids
// (free licence, our own copies), "isbn:…" for Open Library covers, "file:…"
// for generated assets. Placeholder writing in Ivan's voice: replace it with
// the real thing.

const yt = "https://www.youtube.com/watch?v=q7JCmGJeo-0";

export const ARTICLES = [
  {
    slug: "a-philosophy-of-software-design",
    title: "Deep modules, shallow regrets",
    summary: "A Philosophy of Software Design gave me one question I now ask of every function: how much does it hide?",
    tags: ["books", "design"],
    date: "2026-09-07T09:00:00Z",
    body: `
John Ousterhout's book is short, and almost every chapter changed how I write code a little.

## The one idea

A **deep module** does a lot behind a small interface. A shallow one makes you learn nearly as much as it saves you. Once you see it, you see it everywhere: the helper that wraps one line, the class with ten setters.

> A module is deep when what it hides is worth more than what it asks you to learn.

## What I changed

- I stopped splitting functions just because they were long.
- Comments now say *why*, and what the code can't say for itself.
- I write the interface comment first. If it's hard to write, the design isn't done.

It's not a perfect book (the take on tests is thin), but it's the one I'd hand a new developer first.
`,
  },
  {
    slug: "outer-wilds-review",
    title: "Outer Wilds: the best twenty-two minutes, again and again",
    summary: "A solar system in a time loop, and a game that trusts you to be curious. No spoilers.",
    tags: ["games", "review"],
    date: "2026-09-09T09:00:00Z",
    body: `
Outer Wilds gives you a ship, a tiny solar system and twenty-two minutes. Then the sun explodes and you wake up by the campfire again.

## Why it works

Nothing you find is ever taken away except what's in your head. There are no upgrades, no levels, no keys. The only progress is **knowing more**, which makes every loop feel like your own discovery rather than the designer's.

## What I'd tell a friend

- Go in knowing as little as possible.
- Read everything, and use the ship's log.
- If a planet frustrates you, fly somewhere else. The answer is often across the system.

It's the rare game I wish I could forget so I could play it again. **9/10.**
`,
  },
  {
    slug: "night-circuit",
    title: "Night Circuit: driving music for a city that doesn't exist",
    summary: "A synthwave sketch that grew up: an arpeggio, a four-on-the-floor kick and a lot of reverb.",
    tags: ["music", "spektral"],
    date: "2026-09-11T09:00:00Z",
    body: `
This one started as a test of a new arpeggiator pattern and wouldn't leave me alone.

## How it came together

The whole track sits on **A minor, F, C, G**: the most worn chord loop there is, which is exactly why it works for this style. The interest is in the movement: a square-wave arpeggio jumping an octave every few notes, panned left and right, over a plain saw bass.

I kept the drums simple on purpose: a kick on every beat, snare on two and four, off-beat hats. Anything busier fought the arpeggio.

## What I'd do differently

The pad is a bit loud in the chorus, and the snare could use more room. But I wanted to finish something rather than polish forever.

Have a listen to the preview above.
`,
  },
  {
    slug: "cutting-song-previews-in-the-browser",
    title: "Cutting a 30-second song preview in the browser",
    summary: "Decode, find the loudest part, fade, encode to MP3: all on the device, so the full track never leaves it.",
    tags: ["webaudio", "typescript"],
    date: "2026-09-12T09:00:00Z",
    body: `
Every song on this site has a short preview. I didn't want to upload whole tracks to make them, so the admin page cuts the snippet **in the browser**: the full song never leaves my laptop.

## Step 1: decode

The Web Audio API turns the file into raw samples:

\`\`\`ts title="lib/decode-track.ts" showLineNumbers
export async function decodeTrack(file: File): Promise<AudioBuffer> {
  const bytes = await file.arrayBuffer();
  const context = new OfflineAudioContext(2, 1, 44_100);
  return context.decodeAudioData(bytes);
}
\`\`\`

## Step 2: find a good 30 seconds

Songs are quiet at the start, so the cutter starts on the **loudest window**. It slides a window across the track and keeps the one with the highest energy:

\`\`\`ts title="lib/snippet-cut.ts" {4-7} showLineNumbers
export function loudestWindow(samples: Float32Array, rate: number, seconds: number): number {
  const size = Math.floor(rate * seconds);
  let energy = 0;
  for (let i = 0; i < size; i++) energy += samples[i] ** 2;
  let best = energy;
  let bestStart = 0;
  for (let start = 1; start + size < samples.length; start++) {
    energy += samples[start + size - 1] ** 2 - samples[start - 1] ** 2;
    if (energy > best) [best, bestStart] = [energy, start];
  }
  return bestStart / rate;
}
\`\`\`

The highlighted lines are the trick: instead of summing every window from scratch, add the sample coming in and drop the one going out. That makes it fast enough to run while you drag.

## Step 3: fade and encode

A 0.5 s fade in and a 2 s fade out stop the snippet from clicking. Then a Web Worker encodes MP3 with \`lamejs\`, so the page never freezes.

![A modular synthesizer covered in patch cables](img:photo-1600148272607-7bbf03a40d3b "Not my studio, sadly, but this is how the inside of an encoder feels.")

The result is a 20–30 second MP3 under 2 MB, ready to upload.
`,
  },
  {
    slug: "project-hail-mary-review",
    title: "Project Hail Mary made me cheer for a spider",
    summary: "Andy Weir's best book: science as problem solving, and the best friendship I've read in years.",
    tags: ["books", "review"],
    date: "2026-09-15T09:00:00Z",
    body: `
A man wakes up on a spaceship with no memory and two dead crewmates. That's the first page; the rest is a string of problems, each solved with real science and a lot of stubbornness.

## Why I loved it

- The science is the plot. Every chapter is an engineering puzzle, and you can follow the working.
- **Rocky.** I won't say more. You'll know.
- It's funny without ever undercutting the stakes.

> The best kind of science fiction: the kind that makes you want to open a physics textbook.

The flashbacks drag a little in the middle, and the ending is a touch neat. I didn't care. **5 stars**, and the book I've recommended most this year.
`,
  },
  {
    slug: "row-level-security-in-one-table",
    title: "Row Level Security, explained with one table",
    summary: "Who can read what, enforced by the database itself, with two policies and one function.",
    tags: ["postgres", "supabase"],
    date: "2026-09-16T09:00:00Z",
    body: `
On this site, anyone can read published articles, and only I can write them. That rule doesn't live in the page code; it lives in **Postgres**, as Row Level Security.[^rls]

## The setup

\`\`\`sql title="supabase/migrations/posts_rls.sql" showLineNumbers
alter table public.posts enable row level security;

create policy "anyone reads published posts"
  on public.posts for select
  using (status = 'published');

create policy "admin does everything"
  on public.posts for all
  using (public.is_admin())
  with check (public.is_admin());
\`\`\`

Once RLS is on, a table returns **nothing** until a policy allows it. Policies only ever add access.

## What each person sees

| Who | Published posts | Drafts | Can write |
|---|---|---|---|
| A visitor | yes | no | no |
| A signed-in reader | yes | no | no |
| Me (admin) | yes | yes | yes |

## The helper

\`is_admin()\` checks an \`admins\` table against the signed-in user:

\`\`\`sql {3}
create function public.is_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
\`\`\`

The highlighted line is the whole rule. \`security definer\` lets the function read \`admins\`, which visitors can't see.[^definer]

[^rls]: Supabase turns RLS on for new tables by default, which is a good habit to keep.
[^definer]: Pin the function's \`search_path\` too, or a malicious schema could shadow \`admins\`.
`,
  },
  {
    slug: "celeste-review",
    title: "Celeste is about climbing, until it isn't",
    summary: "Tight platforming, a kind story about anxiety, and the most generous assist mode in games.",
    tags: ["games", "review"],
    date: "2026-09-18T09:00:00Z",
    body: `
Celeste is a mountain, a dash button and about a thousand deaths. It's also one of the kindest games I've played.

## The climbing

Every screen is a small puzzle with one clean solution. Death costs you two seconds, so failing never stings. By the end, moves that felt impossible in chapter one are muscle memory.

## The mountain

The story is about Madeline's anxiety, and it never talks down to her or to you. The game's answer to "should I give up?" is the assist mode: slow the game, add dashes, skip screens. *No shame either way.*

> A game about being kind to yourself, disguised as a very hard platformer.

Twenty-one hours, every strawberry I could find, and the B-sides waiting for me. **10/10.**
`,
  },
  {
    slug: "dark-mode-without-the-flash",
    title: "Dark mode without the flash",
    summary: "Why pages flash white for a moment in dark mode, and the ten-line script that fixes it.",
    tags: ["nextjs", "css"],
    date: "2026-09-20T09:00:00Z",
    body: `
Open a site in dark mode, and for a split second it's white. That's the **flash**: the page paints before the code that knows your theme has run.

## Why it happens

If the theme is picked in React, nothing knows it until the JavaScript arrives. The browser has already painted by then.

## The fix: decide before the first paint

A tiny script in \`<head>\` runs while the HTML is still being read, before anything is drawn:

\`\`\`tsx title="app/layout.tsx" {3,5}
const themeScript = \`(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark")
      document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})()\`;
\`\`\`

With no saved choice, CSS follows the system on its own:

\`\`\`css
:root { color-scheme: light dark; }
:root[data-theme="dark"] { color-scheme: dark; }
body { background: light-dark(#f7f3ec, #1c1b1a); }
\`\`\`

> The best loading state is the one nobody sees.

Two details matter: the script must be **inline** (a separate file means another request), and it must never throw, since some browsers block \`localStorage\`.
`,
  },
  {
    slug: "ai-player-finder",
    title: "Describe a player, get a scouting list",
    summary: "How AI Player Finder matches a sentence like \"creative midfielder\" to real player statistics with a two-tower model.",
    tags: ["ml", "python"],
    date: "2026-09-22T09:00:00Z",
    body: `
For a hackathon in 2025 I built **AI Player Finder**: type a description like *"defensive midfielder good at passing"* or *"efficient 3-point shooter"*, and it finds the players whose stats fit. It works for Premier League football and NBA basketball.

## Two towers

The trick is to put text and statistics into the **same space**, so they can be compared directly.

| Tower | Input | Output |
|---|---|---|
| Text | the description | a 384-number vector (a frozen MiniLM model) |
| Player | normalised stats | a 384-number vector (a small network we trained) |

During training, matching description–player pairs are pulled together and mismatched ones pushed apart (a contrastive loss). Afterwards, any sentence can be compared with every player by cosine similarity.

## Keeping it honest

Pure similarity sometimes picked odd players, so the final score mixes in a simple rule-based prior:

\`\`\`python title="scoring.py"
def final_score(semantic: float, prior: float, w_sem=0.8, w_prior=0.2) -> float:
    return w_sem * semantic + w_prior * prior
\`\`\`

It's served with **FastAPI**, trained with **PyTorch**, and the code is on GitHub.
`,
  },
  {
    slug: "the-desk-the-tools-the-list",
    title: "The desk, the tools, the to-do list",
    summary: "What's on my desk this semester, what I actually use, and what's still on the wish list.",
    tags: ["setup"],
    date: "2026-09-24T09:00:00Z",
    body: `
People keep asking about the setup, so here it is, honestly: most of it is ordinary.

## The keyboard

![A compact mechanical keyboard on a marble desk](img:photo-1618384887929-16ec33fab9ef "Seventy-five percent layout: all the keys I use, none I don't.")

A compact board with tactile switches. I write a lot, and a smaller board means less reaching for the mouse.

## The rest

![A desk with a monitor, keyboard and two game controllers](img:photo-1587831990711-23ca6441447b "Work by day, games by night. The controllers are not decorative.")

- One monitor, raised to eye level. Two monitors made me worse at focusing.
- Headphones that are comfortable for hours, which matters more than how they sound.
- A notebook for anything that isn't code.

## The list

- [x] Raise the monitor
- [x] Move the laptop off the desk
- [ ] A proper desk lamp for night sessions
- [ ] Cable tray, so the floor stops looking like a server room
- [ ] Studio monitors for mixing music
`,
  },
  {
    slug: "cyberpunk-2077-dropped",
    title: "Why I put Cyberpunk 2077 down",
    summary: "A gorgeous city I didn't want to live in. Twelve hours in, I stopped, and that's fine.",
    tags: ["games", "review"],
    date: "2026-09-26T09:00:00Z",
    body: `
Night City is one of the most beautiful places I've seen in a game. I still stopped after twelve hours.

## What worked

- The city itself: every street looks lived in.
- The main story's opening hours, which move fast and look incredible.

## What didn't

The map filled up with icons faster than I could care about them, and every side job started to feel like the last one. I noticed I was playing to clear the map rather than because I wanted to.

> Dropping a game isn't failing at it. It's choosing what to do with your evenings.

Maybe I'll come back with the expansion. For now: **6/10**, dropped, no regrets.
`,
  },
  {
    slug: "glass-garden",
    title: "Glass Garden: a slow one for late nights",
    summary: "Soft keys, lazy drums and some tape hiss: a lo-fi piece made over a few quiet evenings.",
    tags: ["music", "spektral"],
    date: "2026-09-28T09:00:00Z",
    body: `
Some tracks come from an idea. This one came from a mood: late, rainy, nothing urgent.

## The chords

Four jazzy chords on a soft electric piano sound, **Dm9, G13, Cmaj9, Am7**, played slightly off the grid so they breathe. A small melody appears every other bar and then gets out of the way.

## The drums

Kick, snare and hats, all a little late, as if the drummer is tired too. Under everything there's a quiet hiss, the oldest trick in lo-fi, and it still works.

It's the track I put on when I'm writing. Maybe it works for you too.
`,
  },
  {
    slug: "learning-rust-from-typescript",
    title: "Learning Rust as a TypeScript developer",
    summary: "Notes from my first month: the borrow checker, enums that carry data, and errors as values.",
    tags: ["rust", "learning"],
    date: "2026-09-29T09:00:00Z",
    body: `
I'm learning Rust this semester. These are the things that surprised me coming from TypeScript.

## Ownership

Every value has one owner. Passing it to a function **moves** it, unless you lend it:

\`\`\`rust title="src/main.rs" showLineNumbers
fn shout(text: &str) -> String {
    text.to_uppercase()
}

fn main() {
    let name = String::from("spektral");
    let loud = shout(&name); // lend, don't move
    println!("{name} → {loud}");
}
\`\`\`

## Enums that carry data

TypeScript has discriminated unions; Rust builds them in, and \`match\` makes sure you handle every case:

\`\`\`rust {1-4}
enum Status {
    Playing { hours: f32 },
    Finished { rating: u8 },
    Dropped,
}
\`\`\`

## Errors are values

No exceptions: functions return \`Result\`, and \`?\` passes errors up. It's like every function telling you, in its type, how it can fail.[^errors]

## Progress

- [x] The Book, chapters 1–10
- [x] Rustlings, the first half
- [ ] Lifetimes, properly this time
- [ ] Something real: a tiny CLI for this site's media folder

[^errors]: After a month, going back to \`try\`/\`catch\` feels oddly loose.
`,
  },
  {
    slug: "hades-ii-first-impressions",
    title: "Hades II, thirty hours in",
    summary: "Still playing, still dying, still having a great time. First impressions of Supergiant's sequel.",
    tags: ["games", "review"],
    date: "2026-10-01T09:00:00Z",
    body: `
I'm thirty-four hours in and nowhere near done, so this is a first impression rather than a verdict.

## What's new

Melinoë fights differently from Zagreus: more spells, more positioning, less dashing through everything. The new **Omega moves** reward planning, and the witchcraft theme gives the whole game its own feel instead of being "Hades again".

## What's the same, in the best way

- Every death moves the story forward.
- The music is incredible. I've had the soundtrack on while writing this.
- One more run is always only twenty minutes. It's never only twenty minutes.

So far: **9/10**, and still playing.
`,
  },
  {
    slug: "games-are-not-the-same",
    title: "Games are not the same (and that's okay)",
    summary: "My video on why games feel different now, plus a few thoughts that didn't fit in it.",
    tags: ["games", "video"],
    date: "2026-10-03T09:00:00Z",
    youtube: yt,
    body: `
I made a video about something I keep hearing: *games aren't what they used to be.* It's embedded below.

## The short version

Games did change. They're bigger, longer and more often built to keep you playing than to be finished. But the games I loved as a kid still exist; they're just harder to find among everything else.

> Nostalgia remembers the great games and forgets the dozens of bad ones we rented that summer.

## What didn't make the cut

- **Indie games** are where a lot of that old feeling lives now: short, focused, finished.
- Playing *less* made me enjoy games more. One game at a time, no backlog guilt.
- Dropping a game is allowed (I wrote about that too).

Let me know what you think in the comments on YouTube.
`,
  },
  {
    slug: "why-i-keep-a-digital-garden",
    title: "Why I keep a digital garden",
    summary: "Not a blog, not a portfolio: a small place on the internet that grows a little every week.",
    tags: ["writing"],
    date: "2026-10-05T09:00:00Z",
    cover: "photo-1509226704106-8a5a71ffbfa4",
    body: `
A blog is a stream: newest first, oldest forgotten. A portfolio is a shop window. I wanted something in between.

## The idea

A **digital garden** is a personal site that's never finished. Notes grow into articles, projects get write-ups, and the books, songs and games I care about live next to the code.[^garden]

> Gardens are slow, and that's the point.

## What's here

- **Writing:** what I've learned, as I learn it.
- **Projects** and **Music:** things I've made, with the story behind them.
- **Reading**, **Games** and **Hobbies:** what I'm into, so the site feels like a person and not a CV.

## Why bother

Writing something down is how I find out whether I understand it. And it's nice to have a corner of the internet that's mine: no algorithm, no feed, just a garden that grows a little every week.

[^garden]: The idea isn't mine. I borrowed it, gladly, from many people who've kept gardens for years.
`,
  },
];

export const PROJECTS = [
  {
    key: "lol-voice-coach",
    title: "LoL Voice Coach",
    summary: "Describe what's happening in your League of Legends game, by voice or text, and get a plan for the next sixty seconds.",
    url: "https://lol-voice-coach.vercel.app",
    repo: "https://github.com/IvanGiovany/lol-voice-coach",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Electron"],
    image: "file:lol-voice-coach.png",
    imageAlt: "LoL Voice Coach: a form for champion, role and game phase, and a session timeline",
    wide: true,
    home: true,
  },
  {
    key: "ai-player-finder",
    title: "AI Player Finder",
    summary: "Type a description of a player and get the footballers or basketball players whose stats fit, with a two-tower model.",
    repo: "https://github.com/IvanGiovany/EzManager",
    article: "ai-player-finder",
    stack: ["Python", "PyTorch", "FastAPI", "MiniLM"],
    image: "file:player-finder.png",
    imageAlt: "A search for a creative midfielder and a ranked table of matching players",
    wide: true,
  },
  {
    key: "brainrot-authenticator",
    title: "Brainrot Authenticator",
    summary: "A parody biometric login: copy a meme face and pass a voice vibe check to get in.",
    url: "https://brainrotauthenticator.netlify.app/",
    repo: "https://github.com/IvanGiovany/Brainrot-Authenticator",
    stack: ["React", "Vite", "TensorFlow.js", "MediaPipe"],
    image: "file:brainrot.png",
    imageAlt: "Brainrot Authenticator's sign-in page with meme challenges",
    crop: { left: 640, top: 0, width: 1600, height: 1000 },
  },
];

export const BOOKS = [
  { key: "ddia", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", isbn: "9781449373320", status: "reading", startedOn: "2026-09-20", year: 2017, pages: 616, note: "Slowly, one chapter a week. Chapter 5 on replication is a gem." },
  { key: "pragmatic-programmer", title: "The Pragmatic Programmer", author: "David Thomas, Andrew Hunt", isbn: "9780135957059", status: "reading", startedOn: "2026-09-02", year: 2019, pages: 352 },
  { key: "project-hail-mary", title: "Project Hail Mary", author: "Andy Weir", isbn: "9780593135204", status: "read", startedOn: "2026-09-01", finishedOn: "2026-09-14", rating: 5, year: 2021, pages: 476, article: "project-hail-mary-review", note: "The book I've recommended most this year.", wide: true },
  { key: "philosophy-of-software-design", title: "A Philosophy of Software Design", author: "John Ousterhout", isbn: "9781732102200", status: "read", startedOn: "2026-08-18", finishedOn: "2026-08-30", rating: 4, year: 2018, pages: 190, article: "a-philosophy-of-software-design" },
  { key: "design-of-everyday-things", title: "The Design of Everyday Things", author: "Don Norman", isbn: "9780465050659", status: "read", startedOn: "2026-07-01", finishedOn: "2026-07-20", rating: 4, year: 2013, pages: 368, note: "You will never push a pull door again without thinking of this book." },
  { key: "thinking-fast-and-slow", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", isbn: "9780374533557", status: "to_read", year: 2011, pages: 499 },
  { key: "dune", title: "Dune", author: "Frank Herbert", isbn: "9780441172719", status: "to_read", year: 1990, pages: 535 },
];

export const SONGS = [
  { key: "glass-garden", title: "Glass Garden", releasedOn: "2026-09-27", snippet: true, snippetSeconds: 26, article: "glass-garden", note: "Soft keys and lazy drums for late nights.", home: true, badges: ["Lo-fi"] },
  { key: "night-circuit", title: "Night Circuit", releasedOn: "2026-09-10", snippet: true, snippetSeconds: 26, article: "night-circuit", note: "Synthwave for driving through a city that doesn't exist.", wide: true, badges: ["Synthwave"] },
  { key: "static-bloom", title: "Static Bloom", inProgress: true, note: "The drums are done; the pads still need work." },
];

export const GAMES = [
  { key: "hades-ii", title: "Hades II", platform: "PC", hours: 34.5, rating: 9, status: "playing", article: "hades-ii-first-impressions", image: "photo-1768449340545-90215319f9bb", imageAlt: "Streaks of red light on a dark background", badges: ["Roguelike"], home: true },
  { key: "celeste", title: "Celeste", platform: "PC", hours: 21.5, rating: 10, status: "finished", finishedOn: "2026-09-17", article: "celeste-review", image: "photo-1522124624696-7ea32eb9592c", imageAlt: "An icy mountain under a starry sky", badges: ["Platformer"], wide: true, home: true },
  { key: "outer-wilds", title: "Outer Wilds", platform: "PlayStation 5", hours: 18, rating: 9, status: "finished", finishedOn: "2026-08-17", article: "outer-wilds-review", image: "photo-1477840539360-4a1d23071046", imageAlt: "A snowy peak under a sky full of stars", badges: ["Exploration"] },
  { key: "cyberpunk-2077", title: "Cyberpunk 2077", platform: "PC", hours: 12, rating: 6, status: "dropped", article: "cyberpunk-2077-dropped", image: "photo-1616588589676-62b3bd4ff6d2", imageAlt: "A gaming desk lit in purple and pink neon", badges: ["RPG"] },
];

export const HOBBIES = [
  { key: "film", title: "Portra 400, roll 14", category: "Film", style: "photo", image: "photo-1570385404967-fe4e1b48454b", imageAlt: "Strips of 35 mm film negatives", caption: "Kodak Portra 400 · roll 14", home: true },
  { key: "haworthia", title: "Haworthia attenuata", category: "Plants", style: "cutout", image: "file:haworthia-cutout.png", imageAlt: "A zebra plant in a white pot", subtitle: "Zebra plant", badges: ["Asphodelaceae"], home: true },
  { key: "ethiopia-guji", title: "Ethiopia Guji", category: "Coffee", style: "none", subtitle: "Ethiopia · Natural process", note: "Blueberry, jasmine and honey", badges: ["Filter", "Now brewing"], home: true },
  { key: "climbing", title: "Thursday bouldering", category: "Climbing", style: "photo", image: "photo-1650819521156-d69c6a5a4564", imageAlt: "A climber on a bouldering wall with colourful holds", caption: "Thursday session @ the bouldering gym", wide: true },
  { key: "monstera", title: "Monstera deliciosa", category: "Plants", style: "cutout", image: "file:monstera-cutout.png", imageAlt: "Monstera leaves", subtitle: "Swiss cheese plant", badges: ["Araceae"] },
  { key: "colombia", title: "Colombia La Esperanza", category: "Coffee", style: "none", subtitle: "Colombia · Washed", note: "Red apple and cane sugar", badges: ["Espresso"] },
  { key: "rust", title: "Rust", category: "Learning", style: "none", subtitle: "Ownership · Lifetimes · Async", note: "One chapter of the Book a week, plus Rustlings.", article: "learning-rust-from-typescript" },
];
