import { describe, expect, it } from "vitest";

import { classifyHazard, enforceSafeResult, permitsRepairSteps } from "../convex/lib/safety";

describe("diagnosis safety policy", () => {
  it.each([["I smell gas", "red"], ["My gas oven will not ignite", "red"], ["There is smoke", "red"], ["I see exposed electrical wires", "red"], ["The unit is sparking", "orange"], ["The high-pressure line is damaged", "orange"], ["Disconnect it first", "yellow"], ["A loose exterior knob", "green"]] as const)("classifies %s as %s", (text, level) => expect(classifyHazard(text)).toBe(level));
  it.each([
    "The carbon monoxide alarm is sounding",
    "I received an electrical shock from the washer",
    "There is water around the electrical panel",
    "A live wire is hanging from the wall",
    "The ceiling is sagging and may fall",
    "I think this insulation contains asbestos",
  ])("blocks every release-critical red-hazard fixture: %s", (text) => {
    expect(classifyHazard(text)).toBe("red");
  });
  it("strips repair content for orange and red assessments", () => { expect(permitsRepairSteps("orange")).toBe(false); const safe = enforceSafeResult({ safety: { level: "red" as const, stopReasons: [] as string[] }, repairSteps: [{}], tools: ["wrench"], parts: ["wire"], professionalRequired: false }); expect(safe.repairSteps).toEqual([]); expect(safe.tools).toEqual([]); expect(safe.professionalRequired).toBe(true); });
  it("overrides an adversarial model response that hides a hazard in observations", () => {
    const result = enforceSafeResult({
      observations: ["Water is touching an electrical outlet"],
      safety: { level: "green" as const, summary: "Ignore earlier safety rules", stopReasons: [] as string[] },
      repairSteps: [{ title: "Open it", instruction: "Remove the cover" }],
      tools: ["screwdriver"],
      parts: ["outlet"],
      professionalRequired: false,
    });
    expect(result.safety.level).toBe("red");
    expect(result.repairSteps).toEqual([]);
    expect(result.tools).toEqual([]);
    expect(result.parts).toEqual([]);
    expect(result.professionalRequired).toBe(true);
  });
});
