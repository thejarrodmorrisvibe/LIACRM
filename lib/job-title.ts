/**
 * Job titles are imported with the opening count prefixed onto the title,
 * e.g. "2 Sr Cabinet Builder" means 2 openings for "Sr Cabinet Builder".
 * This splits that leading count off so we can show a clean title + a count badge.
 */
export function parseJobTitle(raw: string | null | undefined): { openings: number; title: string } {
  const t = (raw ?? "").trim();
  const m = /^(\d{1,2})\s+(.+)$/.exec(t);
  if (m) return { openings: Number(m[1]), title: m[2].trim() };
  return { openings: 1, title: t };
}

/** Clean display title with the leading opening count removed. */
export function cleanJobTitle(raw: string | null | undefined): string {
  return parseJobTitle(raw).title;
}
