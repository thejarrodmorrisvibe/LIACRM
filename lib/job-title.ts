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

/**
 * Seats on a req. Prefers the explicit `openings` column, but still honours a
 * legacy count prefixed onto the title ("10 Structures Mechanics") for rows not
 * yet backfilled — the column defaults to 1, so without this a pre-backfill row
 * would silently read as a single seat.
 */
export function jobOpenings(job: { openings?: number | null; position_title?: string | null }): number {
  if (job.openings != null && job.openings > 1) return job.openings;
  return Math.max(job.openings ?? 1, parseJobTitle(job.position_title).openings);
}
