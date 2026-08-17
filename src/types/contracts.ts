import { z } from "zod";

export const diagnosisStatusSchema = z.enum(["draft", "uploading", "analyzing", "needs_evidence", "needs_clarification", "complete", "failed", "expired"]);
export const safetyLevelSchema = z.enum(["green", "yellow", "orange", "red"]);
export const diagnosisResultSchema = z.object({
  identifiedItem: z.object({ category: z.string(), brand: z.string().nullable().optional(), model: z.string().nullable().optional() }),
  issue: z.string(),
  observations: z.array(z.string()).max(12),
  assumptions: z.array(z.string()).max(12),
  confidence: z.number().min(0).max(1),
  safety: z.object({ level: safetyLevelSchema, summary: z.string(), stopReasons: z.array(z.string()) }),
  likelyCauses: z.array(z.object({ label: z.string(), confidence: z.number().min(0).max(1) })).max(6),
  canContinueUsing: z.string(),
  professionalRequired: z.boolean(),
  difficulty: z.enum(["easy", "moderate", "advanced", "professional"]),
  estimatedMinutes: z.object({ minimum: z.number().int().nonnegative(), maximum: z.number().int().nonnegative() }).nullable().optional(),
  estimatedCost: z.object({ minimum: z.number().nonnegative(), maximum: z.number().nonnegative(), currency: z.string().length(3), isEstimate: z.literal(true) }).nullable().optional(),
  repairSteps: z.array(z.object({ title: z.string(), instruction: z.string(), safetyNote: z.string().nullable().optional() })).max(10),
  tools: z.array(z.string()).max(12),
  parts: z.array(z.object({ name: z.string(), compatibilityNote: z.string() })).max(8),
});
export const evidenceRequestSchema = z.object({ reason: z.string(), instructions: z.string(), purpose: z.enum(["problem", "label", "evidence"]), remainingImages: z.number().int().min(0).max(2) });
export const diagnosisResponseSchema = z.object({ outcome: z.enum(["diagnosis", "needs_evidence", "needs_clarification", "unsupported"]), result: diagnosisResultSchema.nullable(), evidenceRequest: evidenceRequestSchema.nullable(), clarificationQuestion: z.string().nullable(), unsupportedReason: z.string().nullable() }).superRefine((value, context) => { if (value.outcome === "diagnosis" && !value.result) context.addIssue({ code: "custom", message: "Diagnosis outcome requires a result" }); if (value.outcome === "needs_evidence" && !value.evidenceRequest) context.addIssue({ code: "custom", message: "Evidence outcome requires a request" }); if (value.outcome === "needs_clarification" && !value.clarificationQuestion) context.addIssue({ code: "custom", message: "Clarification outcome requires a question" }); if (value.outcome === "unsupported" && !value.unsupportedReason) context.addIssue({ code: "custom", message: "Unsupported outcome requires a reason" }); });
export const subscriptionSchema = z.object({ entitlement: z.enum(["free", "pro"]), active: z.boolean(), productId: z.string().optional(), expiresAt: z.number().optional(), willRenew: z.boolean().optional(), verifiedAt: z.number() });
export const usageSummarySchema = z.object({ entitlement: z.enum(["free", "pro"]), used: z.number().int().nonnegative(), reserved: z.number().int().nonnegative().optional(), limit: z.number().int().positive(), periodKey: z.string(), resetsAt: z.number().optional() });
export const notificationPreferencesSchema = z.object({ maintenance: z.boolean(), warranty: z.boolean(), repairFollowUps: z.boolean(), quietHoursStart: z.string().optional(), quietHoursEnd: z.string().optional(), timezone: z.string() });

export type DiagnosisResult = z.infer<typeof diagnosisResultSchema>;
export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;
export type SafetyLevel = z.infer<typeof safetyLevelSchema>;
export type UsageSummary = z.infer<typeof usageSummarySchema>;
