// Small uppercase monospace label on a soft pastel, like chester.how's
// "NOW BREWING". Status words get a fixed tone; anything else (e.g. article
// tags) gets a tone picked from its text, so a tag is always the same color.

const TONES = ["tone-green", "tone-blue", "tone-pink", "tone-lavender", "tone-yellow", "tone-peach"] as const;
type Tone = (typeof TONES)[number];

const STATUS_TONES: Record<string, Tone> = {
  "now producing": "tone-peach",
  reading: "tone-yellow",
  read: "tone-green",
  learning: "tone-lavender",
};

function toneFor(text: string): Tone {
  const status = STATUS_TONES[text.toLowerCase()];
  if (status) return status;
  // A tiny string hash: stable across server and browser, no randomness.
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/** `toneKey` picks the color when the text isn't the key itself, e.g. "nextjs 2" colored as "nextjs". */
export function Badge({ children, toneKey }: { children: string; toneKey?: string }) {
  return (
    <span
      className={`${toneFor(toneKey ?? children)} inline-block rounded-[3px] border border-(--tone-border) bg-(--tone-bg) px-1.5 py-px font-mono text-[0.6875rem] leading-5 tracking-wide text-(--tone-fg) uppercase`}
    >
      {children}
    </span>
  );
}

export function Badges({ items, className = "" }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </div>
  );
}
