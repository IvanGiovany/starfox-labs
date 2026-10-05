import type { Book } from "./books";
import type { Game } from "./games-loader";
import { LEARNING_CATEGORY } from "./hobbies";
import type { Hobby } from "./hobbies-loader";
import type { PostSummary } from "./posts";
import type { Project } from "./projects";
import type { Song } from "./tracks";

// What the home grid shows, and in what order. Built from the same data as the
// section pages, so a card on home is exactly the card on its section page.
// Plain functions (no loading here), so the rules can be tested on their own.

/** Articles on home besides the latest (the wide card at the top). Ivan posts daily. */
export const MORE_ARTICLES = 4;

/** One card in the dated part of the grid. */
export type HomeEntry =
  | { kind: "post"; key: string; date: string; post: PostSummary }
  | { kind: "project"; key: string; date: string; project: Project }
  | { kind: "book"; key: string; date: string; book: Book }
  | { kind: "song"; key: string; date: string; song: Song }
  | { kind: "game"; key: string; date: string; game: Game }
  | { kind: "hobby"; key: string; date: string; hobby: Hobby };

export type HomeLayout = {
  /** The latest article: the wide card beside the intro. */
  featured: PostSummary | null;
  /** Status cards, always near the top: every book being read... */
  reading: Book[];
  /** ...and every item in the Learning category. */
  learning: Hobby[];
  /** Everything else, newest first: the next articles and the items marked "Show on home". */
  feed: HomeEntry[];
};

export const isLearning = (hobby: Pick<Hobby, "category">) => hobby.category?.trim().toLowerCase() === LEARNING_CATEGORY.toLowerCase();

/**
 * The home grid's contents. Status cards (books being read, Learning items)
 * show whether or not they're marked "Show on home", and never twice. Posts
 * come newest first already (as loaded).
 */
export function homeLayout(data: {
  posts: PostSummary[];
  projects: Project[];
  books: Book[];
  songs: Song[];
  games: Game[];
  hobbies: Hobby[];
}): HomeLayout {
  const [featured = null, ...rest] = data.posts;
  const reading = data.books.filter((book) => book.readingStatus === "reading");
  const learning = data.hobbies.filter(isLearning);

  const feed: HomeEntry[] = [
    ...rest.slice(0, MORE_ARTICLES).map((post) => ({ kind: "post" as const, key: `post-${post.id}`, date: post.publishedAt, post })),
    ...data.projects.filter((p) => p.showOnHome).map((project) => ({ kind: "project" as const, key: `project-${project.id}`, date: project.homeDate, project })),
    ...data.books
      .filter((b) => b.showOnHome && b.readingStatus !== "reading")
      .map((book) => ({ kind: "book" as const, key: `book-${book.id}`, date: book.homeDate, book })),
    ...data.songs.filter((s) => s.showOnHome).map((song) => ({ kind: "song" as const, key: `song-${song.id}`, date: song.homeDate, song })),
    ...data.games.filter((g) => g.showOnHome).map((game) => ({ kind: "game" as const, key: `game-${game.id}`, date: game.homeDate, game })),
    ...data.hobbies
      .filter((h) => h.showOnHome && !isLearning(h))
      .map((hobby) => ({ kind: "hobby" as const, key: `hobby-${hobby.id}`, date: hobby.homeDate, hobby })),
  ];
  // Newest first; the key settles ties, so the order never depends on loading order.
  feed.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.key.localeCompare(b.key));

  return { featured, reading, learning, feed };
}
