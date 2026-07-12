/*
  Hot Openings board — the live GAL USA "HOT List", grouped State -> Client -> role.
  Mirrors the GAL USA Master Tracker (HOT List tab). Static snapshot; update on request.
  Last synced from the Master Tracker: 2026-07-09.
*/

export interface HotOpening {
  position: string;
  pay: string;       // formatted, e.g. "$30-$38/hr", "$85K-$105K", or "" if TBD
  detail?: string;   // requirement / notes for the role
  qty?: number;      // seats, when the tracker specified more than one
  city?: string;     // override when a role sits in a different city than the client default
}

export interface HotClient {
  client: string;
  city: string;
  note?: string;     // submittal requirement or client-level flag
  hold?: boolean;    // client is currently on hold
  sales?: boolean;   // sourced from a sales request, not yet a firm req
  openings: HotOpening[];
}

export interface HotState {
  code: string;
  state: string;
  minWage: string;   // state minimum wage, straight off the tracker
  note?: string;     // state-level note (e.g. license premium)
  clients: HotClient[];
}

// Alphabetical by state. Straight from the HOT List tab.
export const HOT_OPENINGS: HotState[] = [
  {
    code: "AZ", state: "Arizona", minWage: "$15.15",
    clients: [
      {
        client: "MHI-RJ", city: "Tucson", note: "Questionnaire & RTR required for submittal",
        openings: [
          { position: "A&P", pay: "$30-$38/hr", detail: "Airframe license req. +5 yrs heavy maint. or CRJ" },
          { position: "Avionics", pay: "$30-$38/hr", detail: "Airframe license req. +5 yrs heavy maint. or CRJ" },
          { position: "Sheet Metal", pay: "$30-$38/hr", detail: "Airframe license req. +5 yrs heavy maint. or CRJ" },
        ],
      },
      {
        client: "Aviocraft", city: "Chandler",
        openings: [
          { position: "Electrical Bench Tech", pay: "$28/hr" },
        ],
      },
      {
        client: "Quest Defense", city: "Tucson", note: "Candidate form required for submittal",
        openings: [
          { position: "Electrical Engineer III", pay: "", detail: "Secret Clearance, U.S. Person, 3-5 yrs exp" },
          { position: "Electrical Engineer V", pay: "", detail: "Secret Clearance, U.S. Person, 5-8 yrs exp" },
        ],
      },
    ],
  },
  {
    code: "FL", state: "Florida", minWage: "$14.00",
    clients: [
      {
        client: "Avmax", city: "Jacksonville", hold: true,
        openings: [
          { position: "Avionics", pay: "$30-$38/hr", detail: "3+ yrs AV exp." },
        ],
      },
      {
        client: "TIC Aerospace", city: "Miami",
        openings: [
          { position: "Sr. A&P", pay: "" },
          { position: "Jr. A&P", pay: "" },
          { position: "Sr. Painter", pay: "" },
          { position: "Jr. Painter", pay: "" },
        ],
      },
      {
        client: "NAS MRO", city: "Miami", sales: true,
        openings: [
          { position: "QA Manager", pay: "$40-$45/hr", detail: "5+ yrs FAA QA management exp." },
        ],
      },
    ],
  },
  {
    code: "GA", state: "Georgia", minWage: "$7.25",
    clients: [
      {
        client: "SLATE", city: "Macon",
        openings: [
          { position: "A&P", pay: "$30-$40/hr", qty: 2, detail: "3+ yrs CRJ, Regional, and/or Corporate Jet" },
        ],
      },
      {
        client: "Aeroquest", city: "Lawrenceville",
        openings: [
          { position: "Program Manager", pay: "$85K-$105K", detail: "Direct hire, must have INT background" },
        ],
      },
    ],
  },
  {
    code: "MO", state: "Missouri", minWage: "$15.00",
    clients: [
      {
        client: "GoJet Airlines", city: "St. Louis",
        openings: [
          { position: "A&P", pay: "$30-$40/hr", detail: "1+ yrs A&P, heavy maintenance" },
          { position: "Sheet Metal", pay: "$30-$40/hr", detail: "3+ yrs, heavy structural maintenance" },
          { position: "Engine Tech", pay: "$30-$40/hr", detail: "A&P, 3+ yrs engine shop exp" },
        ],
      },
    ],
  },
  {
    code: "MT", state: "Montana", minWage: "$10.85",
    clients: [
      {
        client: "Avmax", city: "Great Falls",
        openings: [
          { position: "Quality Inspector, Dash 8 RTS", pay: "$45-$48/hr", qty: 2, detail: "5+ yrs A&P, Dash 8 exp" },
          { position: "A&P Lead, Dash 8 RTS", pay: "$45-$48/hr", detail: "5+ yrs A&P, Dash 8 exp" },
          { position: "Quality Inspector, CRJ line", pay: "$40-$45/hr" },
          { position: "Maintenance Tech, Dash 8 line", pay: "$32-$35/hr", qty: 2, detail: "Dash 8 exp preferred" },
        ],
      },
    ],
  },
  {
    code: "OK", state: "Oklahoma", minWage: "$7.25",
    clients: [
      {
        client: "King Aerospace", city: "Ardmore",
        openings: [
          { position: "Sheet Metal", pay: "$30-$38/hr", detail: "3+ yrs exp, Widebody, heavy maintenance" },
        ],
      },
    ],
  },
  {
    code: "PA", state: "Pennsylvania", minWage: "$7.25",
    clients: [
      {
        client: "AV Inc", city: "Pottstown",
        openings: [
          { position: "Production Tech II", pay: "$20-$24/hr", detail: "1-2 yrs manufacturing/production exp, electronics/mechanical assembly" },
        ],
      },
    ],
  },
  {
    code: "TN", state: "Tennessee", minWage: "$7.25", note: "+$2/hr per license (A&P)",
    clients: [
      {
        client: "AerSale", city: "Millington",
        openings: [
          { position: "A&P", pay: "$30-$36/hr", detail: "3+ yrs exp, Widebody, heavy maintenance" },
          { position: "Structures Tech", pay: "$30-$36/hr", detail: "3+ yrs exp, Widebody, heavy maintenance" },
          { position: "Avionics Tech", pay: "$30-$36/hr", detail: "3+ yrs exp, Widebody, heavy maintenance" },
          { position: "Interior Tech", pay: "$30-$36/hr", detail: "3+ yrs exp, Widebody, heavy maintenance" },
          { position: "QC Inspector", pay: "$35-$40/hr", detail: "5+ yrs exp, inspection exp." },
        ],
      },
    ],
  },
  {
    code: "TX", state: "Texas", minWage: "$7.25",
    clients: [
      {
        client: "Fly AeroGuard", city: "Georgetown",
        openings: [
          { position: "A&P", pay: "$30-$40/hr", qty: 2, detail: "3+ yrs general aviation maintenance experience" },
        ],
      },
      {
        client: "Greenpoint", city: "San Antonio",
        openings: [
          { position: "Cabinet Builder II", pay: "$30/hr", detail: "Exp building cabinets from scratch, drawings, or blueprints" },
          { position: "Avionics Tech I", pay: "$36/hr", detail: "Wire harness fabrication, mounting, and routing" },
          { position: "Avionics Tech II", pay: "$40/hr", detail: "3+ yrs wire harness fabrication, mounting, and routing" },
          { position: "Sr. Cabinet Builder", pay: "$38/hr", city: "Denton", detail: "4+ yrs cabinet fabrication experience" },
        ],
      },
    ],
  },
  {
    code: "WV", state: "West Virginia", minWage: "$8.75",
    clients: [
      {
        client: "MHI-RJ", city: "Bridgeport", note: "Questionnaire & RTR required for submittal",
        openings: [
          { position: "A&P", pay: "$30-$38/hr", detail: "Airframe license req. +2 yrs heavy maint. or CRJ" },
          { position: "Avionics", pay: "$30-$38/hr", detail: "Airframe license req. +2 yrs heavy maint. or CRJ" },
          { position: "Sheet Metal", pay: "$30-$38/hr", detail: "Airframe license req. +2 yrs heavy maint. or CRJ" },
        ],
      },
    ],
  },
];

/** Seats for one opening (respects an explicit qty, else 1). */
export const openingSeats = (o: HotOpening) => o.qty ?? 1;

/** Total seats for a client (sum across its openings). */
export const clientSeats = (c: HotClient) =>
  c.openings.reduce((n, o) => n + openingSeats(o), 0);

/** Total seats in a state (sum across its clients). */
export const stateSeats = (s: HotState) =>
  s.clients.reduce((n, c) => n + clientSeats(c), 0);

/** Grand total of open seats across every state. */
export const grandTotalSeats = (states: HotState[] = HOT_OPENINGS) =>
  states.reduce((n, s) => n + stateSeats(s), 0);

/** Distinct client count (by name) across all states. */
export const distinctClientCount = (states: HotState[] = HOT_OPENINGS) => {
  const set = new Set<string>();
  for (const s of states) for (const c of s.clients) set.add(c.client);
  return set.size;
};
