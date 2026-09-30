# Writing cheat sheet

Markdown that article bodies support on Starfox Labs. Copy an example, change the words.

Title, summary, tags, cover image and YouTube video are **separate fields** in the editor,
not part of the body.

## Headings

````md
## A section
### A smaller section
````

Hovering a heading shows a `#` link to it. Don't use a single `#`: the article title is the
page's only top-level heading, so `# Heading` is turned into `## Heading` automatically.

## Text

````md
**bold**, *italic*, ~~crossed out~~, `inline code`

A [link](https://starfoxlabs.org), and a bare URL becomes a link: https://nextjs.org
````

Highlighted inline code: add `{:language}` at the end.

````md
Call `useState(0){:ts}` inside the component.
````

## Code blocks

Always name the language, so the block gets syntax highlighting and a label.

````md
```ts
const answer = 42;
```
````

Common languages: `ts`, `tsx`, `js`, `jsx`, `css`, `html`, `sql`, `bash`, `json`, `md`,
`diff`, `python`. No language shows as plain text.

### File name

The title replaces the language label in the bar above the code.

````md
```ts title="lib/posts.ts"
export const POSTS_TAG = "posts";
```
````

### Highlighted lines

Line numbers or ranges in braces.

````md
```ts {2,4-5}
const a = 1;
const b = 2; // highlighted
const c = 3;
const d = 4; // highlighted
const e = 5; // highlighted
```
````

### Highlighted words

The word between slashes is marked everywhere it appears in the block.

````md
```ts /cacheTag/
cacheTag("posts");
```
````

### Line numbers

````md
```sql showLineNumbers
select slug, title
from public.posts
order by published_at desc;
```
````

Start counting from another number (handy for excerpts):

````md
```ts showLineNumbers{42}
return data.map(toSummary);
```
````

### All together

````md
```tsx title="app/page.tsx" {2} showLineNumbers
export default function Page() {
  return <h1>Hello</h1>;
}
```
````

### Diffs

````md
```diff
- const theme = "light";
+ const theme = localStorage.getItem("theme") ?? "light";
```
````

Every code block gets a **Copy** button automatically. Long lines scroll sideways
instead of wrapping.

## Lists

````md
- A point
- Another point
  - A nested point

1. First step
2. Second step
````

### Task lists

````md
- [x] Done
- [ ] Not yet
````

## Quotes

````md
> The best loading state is the one nobody sees.
````

## Tables

Colons in the divider row set the alignment.

````md
| Command       | What it does            |  Speed |
| :------------ | :---------------------- | -----: |
| `git status`  | Show what changed       |   fast |
| `git push`    | Upload commits          | slower |
````

## Images

Upload images in the editor (paste or drag them into the body). Always write alt text:
it's read aloud to people who can't see the image.

````md
![A laptop on a desk at night](https://example.com/desk.jpg)
````

With a caption: add it in quotes after the URL.

````md
![A laptop on a desk at night](https://example.com/desk.jpg "My setup, September 2026")
````

## Footnotes

````md
Postgres checks the policy on every row.[^rls]

[^rls]: That's Row Level Security, covered in its own article.
````

Footnotes are collected at the end of the article, with links back to where they were used.

## Dividers

````md
---
````

## Not supported

- **Raw HTML** (`<div>`, `<script>`, `<iframe>` …) is removed, for safety.
- **Videos inside the body**: use the YouTube field instead. It shows a click-to-play
  player under the title.
