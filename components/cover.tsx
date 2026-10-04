import { toneFor } from "@/components/badge";

// A plain typed cover for a book or song without cover art: the title and a
// smaller line (author, artist) on a soft colour picked from the title, the
// same tones as the badges. Decorative (`aria-hidden`): the real title sits
// next to it. Sized with container units, so the text scales with the cover.
// Books are 2:3 with a darker spine; songs are square, like a record sleeve.
export function TypedCover({ title, byline, shape }: { title: string; byline: string | null; shape: "book" | "square" }) {
  const book = shape === "book";
  return (
    <div
      aria-hidden="true"
      className={`${toneFor(title)} @container flex w-full flex-col justify-between border border-(--tone-border) bg-(--tone-bg) text-(--tone-fg) ${book ? "aspect-[2/3] p-[10%] shadow-[inset_0.3rem_0_0_var(--tone-border)]" : "aspect-square p-[9%]"}`}
    >
      <p className={`${book ? "line-clamp-5" : "line-clamp-3"} font-serif text-[length:15cqw] leading-[1.1] break-words`}>{title}</p>
      {byline && <p className="line-clamp-2 text-[length:8cqw] leading-tight tracking-wide uppercase">{byline}</p>}
    </div>
  );
}
