/*
  Pull US state(s) out of a free-text location string ("Tucson, AZ (Onsite)",
  "Bridgeport WV Tucson AZ", "St Louis MO"). Returns every distinct state found,
  so a multi-site opening shows under each state on the Job Openings page.
*/

const CODE_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington, D.C.", PR: "Puerto Rico",
};

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code]),
);

export interface USState { code: string; name: string; }

/** Bucket label for reqs whose location has no recognisable state. */
export const OTHER_STATE = "Other / Unspecified";

/**
 * True when a location belongs to the given state name. Locations with no
 * parseable state match only the OTHER_STATE bucket, mirroring how the Job
 * Openings page groups them.
 */
export function locationInState(location: string | null | undefined, stateName: string): boolean {
  const sts = statesOf(location);
  if (sts.length === 0) return stateName === OTHER_STATE;
  return sts.some((s) => s.name === stateName);
}

export function statesOf(location: string | null | undefined): USState[] {
  if (!location) return [];
  const codes = new Set<string>();
  // Uppercase 2-letter tokens that are valid state codes (avoids matching words like "in"/"or").
  for (const m of location.matchAll(/\b([A-Z]{2})\b/g)) {
    if (CODE_TO_NAME[m[1]]) codes.add(m[1]);
  }
  // Spelled-out state names.
  const low = location.toLowerCase();
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (low.includes(name)) codes.add(code);
  }
  return [...codes].map((code) => ({ code, name: CODE_TO_NAME[code] }));
}
