import { describe, it, expect } from "vitest";
import {
  weeksWorked,
  candidateCommission,
  quarterOf,
  rollupByQuarter,
  startOfQuarter,
  endOfQuarter,
} from "./commission";

// Local-time constructor: avoids `new Date("2026-05-01")` parsing as UTC
// midnight and landing on Apr 30 in a negative-offset timezone.
const dt = (y: number, m1: number, day: number) => new Date(y, m1 - 1, day);

describe("weeksWorked", () => {
  it("is 0 before the start date", () => {
    expect(weeksWorked("2026-07-01", null, new Date("2026-06-01"))).toBe(0);
  });
  it("counts full weeks to today when ongoing", () => {
    expect(weeksWorked("2026-06-01", null, new Date("2026-06-29"))).toBeCloseTo(4, 5);
  });
  it("stops at end_date when it is in the past", () => {
    expect(weeksWorked("2026-06-01", "2026-06-15", new Date("2026-06-29"))).toBeCloseTo(2, 5);
  });
  it("ignores a future end_date (still ongoing through today)", () => {
    expect(weeksWorked("2026-06-01", "2026-12-01", new Date("2026-06-29"))).toBeCloseTo(4, 5);
  });
});

describe("candidateCommission", () => {
  it("is $10 per full week (40h x $0.25)", () => {
    expect(candidateCommission("2026-06-01", null, new Date("2026-06-29"))).toBeCloseTo(40, 5);
  });
  it("is 0 before starting", () => {
    expect(candidateCommission("2026-07-01", null, new Date("2026-06-01"))).toBe(0);
  });
});

describe("quarterOf (fiscal year opens May 1)", () => {
  it("maps each quarter to its months", () => {
    expect(quarterOf(dt(2026, 5, 10))).toBe("2026-Q1"); // May
    expect(quarterOf(dt(2026, 7, 10))).toBe("2026-Q1"); // Jul
    expect(quarterOf(dt(2026, 8, 10))).toBe("2026-Q2"); // Aug
    expect(quarterOf(dt(2026, 10, 10))).toBe("2026-Q2"); // Oct
    expect(quarterOf(dt(2026, 11, 10))).toBe("2026-Q3"); // Nov
    expect(quarterOf(dt(2026, 2, 10))).toBe("2025-Q4"); // Feb -> prior fiscal year
  });

  it("keeps Q3 in one fiscal year across the calendar rollover", () => {
    expect(quarterOf(dt(2026, 12, 31))).toBe("2026-Q3");
    expect(quarterOf(dt(2027, 1, 1))).toBe("2026-Q3");
    expect(quarterOf(dt(2027, 1, 31))).toBe("2026-Q3");
    expect(quarterOf(dt(2027, 2, 1))).toBe("2026-Q4");
  });

  it("rolls to a new fiscal year on May 1", () => {
    expect(quarterOf(dt(2027, 4, 30))).toBe("2026-Q4");
    expect(quarterOf(dt(2027, 5, 1))).toBe("2027-Q1");
  });
});

describe("quarter boundaries", () => {
  it("bounds Q1 at May 1 -> Jul 31", () => {
    const mid = dt(2026, 7, 10);
    expect(startOfQuarter(mid).getTime()).toBe(dt(2026, 5, 1).getTime());
    const end = endOfQuarter(mid);
    expect(end.getMonth()).toBe(6); // July
    expect(end.getDate()).toBe(31);
    expect(end.getFullYear()).toBe(2026);
  });

  it("bounds Q3 at Nov 1 -> Jan 31 of the next calendar year", () => {
    const mid = dt(2026, 12, 15);
    expect(startOfQuarter(mid).getTime()).toBe(dt(2026, 11, 1).getTime());
    const end = endOfQuarter(mid);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0); // January
    expect(end.getDate()).toBe(31);
  });

  it("bounds Q4 at Feb 1 -> Apr 30", () => {
    const mid = dt(2027, 3, 15); // fiscal 2026 Q4
    expect(startOfQuarter(mid).getTime()).toBe(dt(2027, 2, 1).getTime());
    const end = endOfQuarter(mid);
    expect(end.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(30);
  });
});

describe("rollupByQuarter", () => {
  it("buckets a single candidate's earnings into the right quarter", () => {
    // June sits in fiscal Q1 (May-Jul).
    const r = rollupByQuarter(
      [{ start: "2026-06-01", end: null }],
      new Date("2026-06-29"),
    );
    expect(r["2026-Q1"]).toBeCloseTo(40, 5);
  });
  it("splits earnings across the Apr 30 / May 1 fiscal-year boundary", () => {
    // Mar 15 -> Jun 15 crosses from fiscal 2025-Q4 into fiscal 2026-Q1.
    const r = rollupByQuarter(
      [{ start: "2026-03-15", end: "2026-06-15" }],
      new Date("2026-12-01"),
    );
    expect(Object.keys(r).sort()).toEqual(["2025-Q4", "2026-Q1"]);
    // Total still equals weeks * $10
    const total = r["2025-Q4"] + r["2026-Q1"];
    expect(total).toBeCloseTo((92 / 7) * 10, 1);
  });
  it("keeps a Dec -> Jan span inside a single fiscal quarter", () => {
    const r = rollupByQuarter(
      [{ start: "2026-12-15", end: "2027-01-15" }],
      new Date("2027-03-01"),
    );
    expect(Object.keys(r)).toEqual(["2026-Q3"]);
  });
  it("sums multiple candidates in the same quarter", () => {
    const r = rollupByQuarter(
      [
        { start: "2026-06-01", end: null },
        { start: "2026-06-01", end: null },
      ],
      new Date("2026-06-29"),
    );
    expect(r["2026-Q1"]).toBeCloseTo(80, 5);
  });
});
