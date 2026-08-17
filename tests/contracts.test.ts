import { describe, expect, it } from "vitest";

import { diagnosisResultSchema, diagnosisResponseSchema } from "../src/types/contracts";

const valid = { identifiedItem: { category: "washer", brand: null, model: null }, issue: "No fill", observations: ["A hose is visible"], assumptions: ["The photo shows the affected appliance"], confidence: 0.6, safety: { level: "yellow", summary: "Disconnect power first", stopReasons: [] }, likelyCauses: [{ label: "Restricted supply", confidence: 0.6 }], canContinueUsing: "Do not run until checked", professionalRequired: false, difficulty: "easy", repairSteps: [{ title: "Read the manual", instruction: "Find the model-specific safety section", safetyNote: null }], tools: ["Manufacturer manual"], parts: [] };

describe("AI contracts", () => {
  it("accepts a complete structured diagnosis", () => expect(diagnosisResultSchema.parse(valid).issue).toBe("No fill"));
  it("rejects invalid confidence and safety", () => expect(() => diagnosisResultSchema.parse({ ...valid, confidence: 2, safety: { ...valid.safety, level: "critical" } })).toThrow());
  it("requires matching payloads for follow-up outcomes", () => { expect(diagnosisResponseSchema.parse({ outcome: "needs_clarification", result: null, evidenceRequest: null, clarificationQuestion: "What code is displayed?", unsupportedReason: null }).outcome).toBe("needs_clarification"); expect(() => diagnosisResponseSchema.parse({ outcome: "needs_evidence", result: null, evidenceRequest: null, clarificationQuestion: null, unsupportedReason: null })).toThrow(); });
});
