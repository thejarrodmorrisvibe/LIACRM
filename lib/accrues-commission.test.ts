import { describe, it, expect } from "vitest";
import { accruesCommission, type Candidate } from "./types";

const base: Candidate = {
  id: "1", name: "Test", email: null, phone: null, role: null, client_company: null,
  pay_rate: null, stage: "Started", drug_tested: false, background_cleared: false,
  offer_accepted: false, start_date: "2026-06-01", end_date: null, job_id: null,
  notes: null, created_at: "", updated_at: "",
};

describe("accruesCommission", () => {
  it("counts a Started candidate with a start date", () => {
    expect(accruesCommission({ ...base, stage: "Started" })).toBe(true);
  });
  it("excludes a candidate with no start date", () => {
    expect(accruesCommission({ ...base, start_date: null })).toBe(false);
  });
  it("excludes an Inactive candidate that never logged an end date (no hours)", () => {
    expect(accruesCommission({ ...base, stage: "Inactive", end_date: null })).toBe(false);
  });
  it("still counts an Inactive candidate that has an end date (worked a period)", () => {
    expect(accruesCommission({ ...base, stage: "Inactive", end_date: "2026-06-20" })).toBe(true);
  });
});
