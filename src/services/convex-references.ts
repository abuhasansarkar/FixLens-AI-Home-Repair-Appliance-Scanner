import { makeFunctionReference } from "convex/server";

import type { DiagnosisResult, UsageSummary } from "@/types/contracts";

export const convexApi = {
  users: {
    current: makeFunctionReference<"query", Record<string, never>, { onboardingComplete?: boolean; interests?: string[]; diyLevel?: string; appearance?: string; units?: string; reducedMotion?: boolean } | null>("users:current"),
    ensureCurrent: makeFunctionReference<"mutation", { email: string; name?: string; avatarUrl?: string }, string>("users:ensureCurrent"),
    completeOnboarding: makeFunctionReference<"mutation", { interests: string[]; diyLevel: string; safetyPolicyVersion: string }, null>("users:completeOnboarding"),
    updateSettings: makeFunctionReference<"mutation", { appearance: "system" | "light" | "dark"; units: "imperial" | "metric"; reducedMotion: boolean; diyLevel: "beginner"|"comfortable"|"experienced" }, null>("users:updateSettings"),
    deleteCurrent: makeFunctionReference<"mutation", Record<string, never>, null>("users:deleteCurrent"),
  },
  deletion: {
    start: makeFunctionReference<"mutation", Record<string, never>, string>("deletion:start"),
    current: makeFunctionReference<"query",Record<string,never>,{jobId:string;state:string}|null>("deletion:current"),
    status: makeFunctionReference<"query", { jobId: string }, { state: string; deletedRows: number; error?: string } | null>("deletion:status"),
    retry: makeFunctionReference<"mutation", { jobId: string }, null>("deletion:retry"),
  },
  usage: {
    summary: makeFunctionReference<"query", Record<string, never>, UsageSummary>("usage:summary"),
  },
  subscriptions: {
    current: makeFunctionReference<"query", Record<string, never>, { entitlement: string; productId?: string; active: boolean; willRenew?: boolean; environment: string; expiresAt?: number; verifiedAt: number } | null>("subscriptions:current"),
  },
  diagnoses: {
    createSession: makeFunctionReference<"mutation", { description?: string; idempotencyKey: string }, string>("diagnoses:createSession"),
    generateUploadUrl: makeFunctionReference<"mutation", { sessionId: string }, string>("diagnoses:generateUploadUrl"),
    completeImageUpload: makeFunctionReference<"mutation", { sessionId: string; storageId: string; purpose: "problem" | "label" | "evidence"; mime: "image/jpeg" | "image/png"; size: number; width: number; height: number; checksum: string }, string>("diagnoses:completeImageUpload"),
    normalizeImage: makeFunctionReference<"action", { imageId: string }, string>("aiActions:normalizeImage"),
    getResult: makeFunctionReference<"query", { sessionId: string }, DiagnosisResult | null>("diagnoses:getResult"),
    analyze: makeFunctionReference<"action", { sessionId: string; idempotencyKey: string; clarification?: string }, { outcome: string; resultId?: string; safetyLevel?: string; evidenceRequest?: { reason: string; instructions: string; purpose: "problem" | "label" | "evidence"; remainingImages: number }; question?: string; reason?: string }>("aiActions:analyze"),
    chat: makeFunctionReference<"action", { sessionId: string; question: string; currentStep?: number; attachmentId?: string }, { text: string }>("aiActions:chat"),
    normalizeAssistantAttachment: makeFunctionReference<"action", { attachmentId: string }, string>("aiActions:normalizeAssistantAttachment"),
    createApplianceScanSession: makeFunctionReference<"mutation", { idempotencyKey: string }, string>("diagnoses:createApplianceScanSession"),
    extractAppliance: makeFunctionReference<"action", { sessionId: string }, { category: string; name: string; brand: string | null; model: string | null; serial: string | null; confidence: number }>("aiActions:extractAppliance"),
  },
  notifications: {
    currentPreferences: makeFunctionReference<"query", Record<string, never>, { maintenance: boolean; warranty: boolean; repairFollowUps: boolean; permissionStatus: string } | null>("notifications:currentPreferences"),
    savePreferences: makeFunctionReference<"mutation", { maintenance: boolean; warranty: boolean; repairFollowUps: boolean; timezone: string; permissionStatus: string }, null>("notifications:savePreferences"),
    registerPushToken: makeFunctionReference<"mutation", { token: string; platform: "ios" | "android"; deviceId?: string; environment: string }, null>("notifications:registerPushToken"),
    unregisterPushTokens: makeFunctionReference<"mutation", Record<string, never>, null>("notifications:unregisterPushTokens"),
  },
  appliances: {
    list: makeFunctionReference<"query", Record<string, never>, { appliances: Record<string, unknown>[]; tasks: Record<string, unknown>[]; history: Record<string,unknown>[]; canAddAppliance: boolean }>("appliances:list"),
    add: makeFunctionReference<"mutation", { name: string; brand: string; model: string; serial?: string; room: string; scanSessionId?: string }, string>("appliances:add"),
    update: makeFunctionReference<"mutation", { applianceId: string; name: string; brand: string; model: string; serial?: string; room: string; purchaseDate?: number; warrantyEndsAt?: number; notes?: string }, null>("appliances:update"),
    remove: makeFunctionReference<"mutation", { applianceId: string }, null>("appliances:remove"),
    completeTask: makeFunctionReference<"mutation", { taskId: string }, null>("appliances:completeTask"),
    rescheduleTask: makeFunctionReference<"mutation", { taskId: string; nextDueAt: number }, null>("appliances:rescheduleTask"),
  },
  homes: {
    current: makeFunctionReference<"query", Record<string, never>, { id: string; name: string; rooms: { id: string; name: string; applianceCount: number }[] } | null>("homes:current"),
    rename: makeFunctionReference<"mutation", { homeId: string; name: string }, null>("homes:rename"),
    addRoom: makeFunctionReference<"mutation", { homeId: string; name: string }, string>("homes:addRoom"),
    renameRoom: makeFunctionReference<"mutation", { roomId: string; name: string }, null>("homes:renameRoom"),
    removeRoom: makeFunctionReference<"mutation", { roomId: string }, null>("homes:removeRoom"),
  },
  documents: {
    list: makeFunctionReference<"query", { applianceId: string }, { _id: string; title: string; url: string }[]>("documents:list"),
    add: makeFunctionReference<"mutation", { applianceId: string; title: string; url: string }, string>("documents:add"),
    remove: makeFunctionReference<"mutation", { documentId: string }, null>("documents:remove"),
  },
  repairs: {
    list: makeFunctionReference<"query", { paginationOpts: { numItems: number; cursor: string | null; id?: number } }, { page: Record<string, unknown>[]; isDone: boolean; continueCursor: string }>("repairs:list"),
    begin: makeFunctionReference<"mutation", { sessionId: string }, string>("repairs:begin"),
    completeStep: makeFunctionReference<"mutation", { sessionId: string; step: number }, null>("repairs:completeStep"),
    finish: makeFunctionReference<"mutation", { sessionId: string; fixed: boolean; notes?: string; actualCost?: number; actualMinutes?: number }, null>("repairs:finish"),
    save: makeFunctionReference<"mutation", { sessionId: string }, null>("repairs:save"),
  },
  assistant: {
    list: makeFunctionReference<"query", { sessionId: string }, { messages: { role: string; text: string; createdAt: number }[]; replyLimit: number }>("assistant:list"),
    generateAttachmentUploadUrl: makeFunctionReference<"mutation", { sessionId: string }, string>("assistant:generateAttachmentUploadUrl"),
    completeAttachmentUpload: makeFunctionReference<"mutation", { sessionId: string; storageId: string; mime: "image/jpeg" | "image/png"; size: number; width: number; height: number }, string>("assistant:completeAttachmentUpload"),
  },
} as const;
