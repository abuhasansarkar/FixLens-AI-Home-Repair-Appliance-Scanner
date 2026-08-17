const diagnosisResult = {
  type: "object",
  additionalProperties: false,
  required: ["identifiedItem", "issue", "observations", "assumptions", "confidence", "safety", "likelyCauses", "canContinueUsing", "professionalRequired", "difficulty", "estimatedMinutes", "estimatedCost", "repairSteps", "tools", "parts"],
  properties: {
    identifiedItem: { type: "object", additionalProperties: false, required: ["category", "brand", "model"], properties: { category: { type: "string" }, brand: { type: ["string", "null"] }, model: { type: ["string", "null"] } } },
    issue: { type: "string" },
    observations: { type: "array", maxItems: 12, items: { type: "string" } },
    assumptions: { type: "array", maxItems: 12, items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    safety: { type: "object", additionalProperties: false, required: ["level", "summary", "stopReasons"], properties: { level: { type: "string", enum: ["green", "yellow", "orange", "red"] }, summary: { type: "string" }, stopReasons: { type: "array", items: { type: "string" } } } },
    likelyCauses: { type: "array", maxItems: 6, items: { type: "object", additionalProperties: false, required: ["label", "confidence"], properties: { label: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 } } } },
    canContinueUsing: { type: "string" },
    professionalRequired: { type: "boolean" },
    difficulty: { type: "string", enum: ["easy", "moderate", "advanced", "professional"] },
    estimatedMinutes: { anyOf: [{ type: "object", additionalProperties: false, required: ["minimum", "maximum"], properties: { minimum: { type: "integer", minimum: 0 }, maximum: { type: "integer", minimum: 0 } } }, { type: "null" }] },
    estimatedCost: { anyOf: [{ type: "object", additionalProperties: false, required: ["minimum", "maximum", "currency", "isEstimate"], properties: { minimum: { type: "number", minimum: 0 }, maximum: { type: "number", minimum: 0 }, currency: { type: "string", minLength: 3, maxLength: 3 }, isEstimate: { type: "boolean", const: true } } }, { type: "null" }] },
    repairSteps: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["title", "instruction", "safetyNote"], properties: { title: { type: "string" }, instruction: { type: "string" }, safetyNote: { type: ["string", "null"] } } } },
    tools: { type: "array", maxItems: 12, items: { type: "string" } },
    parts: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["name", "compatibilityNote"], properties: { name: { type: "string" }, compatibilityNote: { type: "string" } } } },
  },
} as const;

export const diagnosisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "result", "evidenceRequest", "clarificationQuestion", "unsupportedReason"],
  properties: {
    outcome: { type: "string", enum: ["diagnosis", "needs_evidence", "needs_clarification", "unsupported"] },
    result: { anyOf: [diagnosisResult, { type: "null" }] },
    evidenceRequest: { anyOf: [{ type: "object", additionalProperties: false, required: ["reason", "instructions", "purpose", "remainingImages"], properties: { reason: { type: "string" }, instructions: { type: "string" }, purpose: { type: "string", enum: ["problem", "label", "evidence"] }, remainingImages: { type: "integer", minimum: 0, maximum: 2 } } }, { type: "null" }] },
    clarificationQuestion: { type: ["string", "null"] },
    unsupportedReason: { type: ["string", "null"] },
  },
} as const;

export const applianceExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["category", "name", "brand", "model", "serial", "confidence"],
  properties: {
    category: { type: "string" },
    name: { type: "string" },
    brand: { type: ["string", "null"] },
    model: { type: ["string", "null"] },
    serial: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;
