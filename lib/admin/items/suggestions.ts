/** Chips used so far (badges, stack…), most used first, for tap-to-add suggestions. */
export function chipSuggestions(lists: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const list of lists) for (const chip of list) counts.set(chip, (counts.get(chip) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([chip]) => chip);
}
