import type { ReactNode } from "react";

// A section page's card grid, chester-style: 4 columns on wide screens, 2 on
// phones and tablets, with square rows (a wide card is two cells across), so
// cards grow with the screen instead of the gaps. Dense placement lets small
// cards fill gaps left beside wide ones; lib/grid.ts makes sure nothing is
// left over at the end.
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-flow-dense auto-rows-(--cell-2) grid-cols-2 gap-(--grid-gap) pb-8 lg:auto-rows-(--cell) lg:grid-cols-4">{children}</div>
  );
}

/** A card's width in the grid. */
export const spanClass = (span: 1 | 2) => (span === 2 ? "col-span-2" : "");
