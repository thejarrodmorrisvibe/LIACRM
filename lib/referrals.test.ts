import { describe, it, expect } from "vitest";
import { nthWorkingDay, referralStatus } from "./referrals";

// 2024-01-01 is a Monday — handy anchor for working-day math.
describe("nthWorkingDay (Mon–Fri)", () => {
  it("counts the start date as day 1", () => {
    expect(nthWorkingDay("2024-01-01", 1, false)).toBe("2024-01-01");
  });
  it("reaches Friday on day 5", () => {
    expect(nthWorkingDay("2024-01-01", 5, false)).toBe("2024-01-05");
  });
  it("skips the weekend to the next Monday on day 6", () => {
    expect(nthWorkingDay("2024-01-01", 6, false)).toBe("2024-01-08");
  });
  it("hits 30 working days six weeks out (Friday)", () => {
    expect(nthWorkingDay("2024-01-01", 30, false)).toBe("2024-02-09");
  });
});

describe("nthWorkingDay (Mon–Sat)", () => {
  it("reaches 30 days sooner when Saturdays count", () => {
    expect(nthWorkingDay("2024-01-01", 30, true)).toBe("2024-02-03");
  });
});

describe("referralStatus", () => {
  it("is not achieved before the M-F bonus date", () => {
    const s = referralStatus("2024-01-01", "2024-02-01");
    expect(s.mfDate).toBe("2024-02-09");
    expect(s.satDate).toBe("2024-02-03");
    expect(s.achieved).toBe(false);
    expect(s.achievedIfSat).toBe(false);
  });
  it("is achieved once the M-F date passes", () => {
    const s = referralStatus("2024-01-01", "2024-02-10");
    expect(s.achieved).toBe(true);
  });
  it("flags Saturday-eligibility in the gap window", () => {
    const s = referralStatus("2024-01-01", "2024-02-05");
    expect(s.achieved).toBe(false);
    expect(s.achievedIfSat).toBe(true);
  });
});
