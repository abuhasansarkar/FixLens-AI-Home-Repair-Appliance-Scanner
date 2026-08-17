import { describe, expect, it } from "vitest";

import { canUseDiagnosis, diagnosisLimit, nextUtcMonth, utcPeriodKey } from "../convex/lib/entitlements";

describe("entitlements", () => {
  it("uses lifetime Free and 15 monthly Pro diagnoses", () => { expect(diagnosisLimit("free")).toBe(3); expect(diagnosisLimit("pro")).toBe(15); expect(canUseDiagnosis({ entitlement: "free", used: 2 })).toBe(true); expect(canUseDiagnosis({ entitlement: "free", used: 3 })).toBe(false); });
  it("resets Pro usage on the first day of the next UTC month", () => { const time = Date.UTC(2026, 11, 31, 23, 59); expect(utcPeriodKey(time)).toBe("2026-12"); expect(new Date(nextUtcMonth(time)).toISOString()).toBe("2027-01-01T00:00:00.000Z"); });
});
