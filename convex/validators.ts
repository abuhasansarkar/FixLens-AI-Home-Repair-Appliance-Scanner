import { v } from "convex/values";

export const safetyLevelValidator = v.union(v.literal("green"), v.literal("yellow"), v.literal("orange"), v.literal("red"));
export const diagnosisResultValidator = v.object({
  identifiedItem: v.object({ category: v.string(), brand: v.optional(v.union(v.string(), v.null())), model: v.optional(v.union(v.string(), v.null())) }),
  issue: v.string(),
  observations: v.array(v.string()),
  assumptions: v.array(v.string()),
  confidence: v.number(),
  safety: v.object({ level: safetyLevelValidator, summary: v.string(), stopReasons: v.array(v.string()) }),
  likelyCauses: v.array(v.object({ label: v.string(), confidence: v.number() })),
  canContinueUsing: v.string(),
  professionalRequired: v.boolean(),
  difficulty: v.union(v.literal("easy"), v.literal("moderate"), v.literal("advanced"), v.literal("professional")),
  estimatedMinutes: v.optional(v.union(v.object({ minimum: v.number(), maximum: v.number() }), v.null())),
  estimatedCost: v.optional(v.union(v.object({ minimum: v.number(), maximum: v.number(), currency: v.string(), isEstimate: v.literal(true) }), v.null())),
  repairSteps: v.array(v.object({ title: v.string(), instruction: v.string(), safetyNote: v.optional(v.union(v.string(), v.null())) })),
  tools: v.array(v.string()),
  parts: v.array(v.object({ name: v.string(), compatibilityNote: v.string() })),
});
export const evidenceRequestValidator = v.object({ reason: v.string(), instructions: v.string(), purpose: v.union(v.literal("problem"), v.literal("label"), v.literal("evidence")), remainingImages: v.number() });
export const followUpValidator = v.union(evidenceRequestValidator, v.object({ question: v.string() }), v.object({ reason: v.string() }));
