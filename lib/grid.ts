// Keeps a card grid full: no holes on the 4-column desktop layout or the
// 2-column phone layout. Cards are small (1 cell) or wide (2 cells), placed by
// CSS grid's dense auto-placement (`grid-flow-dense`), which this simulates.
// Small cards are widened first (from the end); only if that can't work are
// filler cards (a quiet "more" card) added at the end.

export type Span = 1 | 2;

/**
 * Empty cells CSS dense auto-placement leaves for these spans in `columns`
 * columns. `block`: cells already taken at the top-left before the cards are
 * placed (the home page's intro: 2 × 2 on the 4-column layout).
 */
export function gridHoles(spans: Span[], columns: number, block?: { columns: number; rows: number }): number {
  const rows: boolean[][] = [];
  for (let row = 0; row < (block?.rows ?? 0); row++) rows[row] = Array.from({ length: columns }, (_, c) => c < block!.columns);
  const free = (row: number, col: number, span: number) => {
    for (let c = col; c < col + span; c++) if (rows[row]?.[c]) return false;
    return true;
  };
  for (const span of spans) {
    // Dense: each card takes the first place it fits, scanning from the top-left.
    for (let row = 0; ; row++) {
      rows[row] ??= Array(columns).fill(false);
      const col = Array.from({ length: columns - span + 1 }, (_, c) => c).find((c) => free(row, c, span));
      if (col !== undefined) {
        for (let c = col; c < col + span; c++) rows[row][c] = true;
        break;
      }
    }
  }
  return rows.reduce((empty, row) => empty + row.filter((taken) => !taken).length, 0);
}

/** The home intro: 2 × 2 cells at the top-left on 4 columns; on 2 columns it's a row of its own, outside the cells. */
const INTRO_BLOCK = { columns: 2, rows: 2 };

const isGridFull = (spans: Span[], intro: boolean) => gridHoles(spans, 4, intro ? INTRO_BLOCK : undefined) === 0 && gridHoles(spans, 2) === 0;

/** How far back to look for small cards to widen (they should be near the end). */
const WIDEN_WINDOW = 6;

/**
 * The spans to use so the grid comes out full, and any fillers (with their
 * spans) to add after the cards. Tries, in order: widening one, two or three
 * small cards (the later ones first); then one filler, with as few widened
 * cards as possible; then two fillers; then three. With `intro`, the grid
 * starts with the home page's intro block.
 */
export function fillGrid(spans: Span[], { intro = false }: { intro?: boolean } = {}): { spans: Span[]; fillers: Span[] } {
  const isFull = (candidate: Span[]) => isGridFull(candidate, intro);
  if (spans.length === 0 || isFull(spans)) return { spans, fillers: [] };

  const smalls = spans.flatMap((span, i) => (span === 1 ? [i] : [])).reverse().slice(0, WIDEN_WINDOW);
  const widenings = [1, 2, 3].flatMap((count) => combinations(smalls, count));
  const widen = (chosen: number[]) => spans.map((span, i): Span => (chosen.includes(i) ? 2 : span));

  for (const chosen of widenings) {
    if (isFull(widen(chosen))) return { spans: widen(chosen), fillers: [] };
  }
  for (const fillers of FILLER_OPTIONS) {
    for (const chosen of [[], ...widenings]) {
      if (isFull([...widen(chosen), ...fillers])) return { spans: widen(chosen), fillers };
    }
  }
  // Can't happen with spans of 1 and 2 (three small fillers fill any last row), but stay safe.
  return { spans, fillers: [] };
}

/** Fillers to try, fewest first; a wide one before two small ones. */
const FILLER_OPTIONS: Span[][] = [[1], [2], [2, 1], [1, 1], [2, 2], [2, 1, 1], [1, 1, 1]];

/** All ways to pick `count` items, in order of preference (earlier items first). */
function combinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), count - 1).map((rest) => [item, ...rest]));
}
