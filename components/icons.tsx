import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Gauge = (p: P) => (
  <svg {...base(p)}><path d="M12 14l4-4" /><path d="M3.5 18a9 9 0 1 1 17 0" /><circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" /></svg>
);
export const Kanban = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="6" height="14" rx="1.5" /><rect x="9" y="3" width="6" height="9" rx="1.5" transform="translate(6 0)" /><rect x="15" y="3" width="6" height="11" rx="1.5" /></svg>
);
export const Briefcase = (p: P) => (
  <svg {...base(p)}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg>
);
export const CheckSquare = (p: P) => (
  <svg {...base(p)}><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>
);
export const Award = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></svg>
);
export const Megaphone = (p: P) => (
  <svg {...base(p)}><path d="M3 11v2a1 1 0 0 0 1 1h2l4.5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M14 8a4 4 0 0 1 0 8" /><path d="M7 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2" /></svg>
);
export const Brain = (p: P) => (
  <svg {...base(p)}><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5 2.5 2.5 0 0 0 5 8a2.5 2.5 0 0 0 .5 4.9V14a3 3 0 0 0 4 2.8V20" /><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5 2.5 2.5 0 0 1 19 8a2.5 2.5 0 0 1-.5 4.9V14a3 3 0 0 1-4 2.8V20" /></svg>
);
export const Dollar = (p: P) => (
  <svg {...base(p)}><path d="M12 2v20" /><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.8 7 7s2 3 5 3.5 5 1.5 5 3.5-2.2 3.5-5 3.5S7 19.4 7 17.5" /></svg>
);
export const Star = (p: P) => (
  <svg {...base(p)}><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.3l1-5.9L3.5 9.2l5.9-.8z" /></svg>
);
export const Plus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const Search = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.6-3.6" /></svg>);
export const Phone = (p: P) => (<svg {...base(p)}><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v4a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 1-2z" /></svg>);
export const Mail = (p: P) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 12l8.5-5.5" /></svg>);
export const MapPin = (p: P) => (<svg {...base(p)}><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></svg>);
export const Calendar = (p: P) => (<svg {...base(p)}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>);
export const Shield = (p: P) => (<svg {...base(p)}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9.2 12l1.9 1.9 3.7-3.8" /></svg>);
export const Vial = (p: P) => (<svg {...base(p)}><path d="M9 3h6M10 3v8.5L6.8 17a3 3 0 0 0 2.6 4.5h5.2A3 3 0 0 0 17.2 17L14 11.5V3" /><path d="M8.5 14h7" /></svg>);
export const Logout = (p: P) => (<svg {...base(p)}><path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" /><path d="M10 12H3m0 0l3-3m-3 3l3 3" /></svg>);
export const Menu = (p: P) => (<svg {...base(p)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
export const Users = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.5-4.6" /></svg>);
export const Clock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>);
export const Sparkles = (p: P) => (<svg {...base(p)}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" /></svg>);
export const Trash = (p: P) => (<svg {...base(p)}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>);
export const Edit = (p: P) => (<svg {...base(p)}><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17z" /><path d="M14 6l3 3" /></svg>);
export const ArrowUpRight = (p: P) => (<svg {...base(p)}><path d="M7 17L17 7M8 7h9v9" /></svg>);
export const Send = (p: P) => (<svg {...base(p)}><path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8-8-4z" /></svg>);
export const Grid = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>);
export const Gift = (p: P) => (<svg {...base(p)}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8C12 8 11 3 8.5 3A2.5 2.5 0 0 0 8.5 8zM12 8s1-5 3.5-5a2.5 2.5 0 0 1 0 5z" /></svg>);
export const Book = (p: P) => (<svg {...base(p)}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H20" /></svg>);
export const Video = (p: P) => (<svg {...base(p)}><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10l6-3.5v11l-6-3.5z" /></svg>);
export const Activity = (p: P) => (<svg {...base(p)}><path d="M3 12h4l2.5-7 5 14 2.5-7H21" /></svg>);
export const CalendarClock = (p: P) => (<svg {...base(p)}><path d="M21 9.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6" /><path d="M3 9h18M8 3v3M16 3v3" /><circle cx="17.5" cy="16.5" r="4.5" /><path d="M17.5 14.5v2l1.4 1.4" /></svg>);
export const Flame = (p: P) => (<svg {...base(p)}><path d="M12 3c1 3-1.5 4.5-1.5 7A1.5 1.5 0 0 0 12 11c.8-1 1-2 1-2 1.5 1 3 3 3 5.5a4 4 0 0 1-8 0c0-2 1.5-3.5 1.5-5.5C9.5 6.5 11 5 12 3z" /></svg>);
