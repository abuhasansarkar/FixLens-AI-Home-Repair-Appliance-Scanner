import { internalMutationGeneric, internalQueryGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v, type GenericId } from "convex/values";

import { requireOwned, requireUser } from "./lib/auth";
import { consumeUserRateLimit } from "./lib/rateLimit";
import { diagnosisResultValidator, evidenceRequestValidator, followUpValidator, safetyLevelValidator } from "./validators";

export const createSession = mutationGeneric({
  args: { description: v.optional(v.string()), idempotencyKey: v.string() },
  returns: v.id("diagnosisSessions"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.query("diagnosisSessions").withIndex("by_owner_idempotency", (q: any) => q.eq("ownerId", user._id).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) { const owned = requireOwned(existing, user._id); if (owned.category === "appliance_profile") throw new Error("Idempotency key belongs to an appliance scan"); return owned._id; }
    const description = args.description?.trim();
    if (description && description.length > 300) throw new Error("Description is too long");
    await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "diagnosis_start_burst", limit: Number(process.env.DIAGNOSIS_START_BURST_LIMIT ?? 5), windowMs: 600_000 });
    await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "diagnosis_start_daily", limit: Number(process.env.DIAGNOSIS_DAILY_ATTEMPT_LIMIT ?? 20), windowMs: 86_400_000 });
    const now = Date.now();
    return ctx.db.insert("diagnosisSessions", { ownerId: user._id, status: "draft", description, clarificationCount: 0, imageCount: 0, promptVersion: "diagnosis-v2", schemaVersion: "diagnosis-response-v2", idempotencyKey: args.idempotencyKey, expiresAt: now + Number(process.env.DIAGNOSIS_SESSION_EXPIRY_HOURS ?? 24) * 3_600_000, createdAt: now, updatedAt: now });
  },
});

export const createApplianceScanSession = mutationGeneric({
  args: { idempotencyKey: v.string() },
  returns: v.id("diagnosisSessions"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.query("diagnosisSessions").withIndex("by_owner_idempotency", (q: any) => q.eq("ownerId", user._id).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) { const owned = requireOwned(existing, user._id); if (owned.category !== "appliance_profile") throw new Error("Idempotency key belongs to a diagnosis"); return owned._id; }
    await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "appliance_scan_burst", limit: Number(process.env.APPLIANCE_SCAN_BURST_LIMIT ?? 4), windowMs: 600_000 });
    const today = Date.now() - 86_400_000;
    const recent = await ctx.db.query("diagnosisSessions").withIndex("by_owner_updated", (q: any) => q.eq("ownerId", user._id).gte("updatedAt", today)).collect();
    if (recent.filter((session: any) => session.category === "appliance_profile").length >= Number(process.env.MAX_APPLIANCE_SCANS_PER_DAY ?? 10)) throw new Error("Daily appliance scan limit reached");
    const now = Date.now();
    return ctx.db.insert("diagnosisSessions", { ownerId: user._id, status: "draft", category: "appliance_profile", clarificationCount: 0, imageCount: 0, promptVersion: "appliance-extract-v1", schemaVersion: "appliance-extract-v1", idempotencyKey: args.idempotencyKey, expiresAt: now + 3_600_000, createdAt: now, updatedAt: now });
  },
});

export const getResult = queryGeneric({
  args: { sessionId: v.id("diagnosisSessions") },
  returns: v.union(v.null(), diagnosisResultValidator),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    const result = await ctx.db.query("diagnosisResults").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).unique();
    return result?.result ?? null;
  },
});

export const generateUploadUrl = mutationGeneric({
  args: { sessionId: v.id("diagnosisSessions") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    if (session.expiresAt <= Date.now()) throw new Error("Diagnosis session expired");
    if (!["draft", "needs_evidence"].includes(session.status)) throw new Error("This diagnosis no longer accepts images");
    if (session.imageCount >= Number(process.env.MAX_DIAGNOSIS_IMAGES ?? 3)) throw new Error("Image limit reached");
    await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "upload_url", limit: Number(process.env.UPLOAD_URL_BURST_LIMIT ?? 12), windowMs: 600_000 });
    return ctx.storage.generateUploadUrl();
  },
});

export const completeImageUpload = mutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), storageId: v.id("_storage"), purpose: v.union(v.literal("problem"), v.literal("label"), v.literal("evidence")), mime: v.union(v.literal("image/jpeg"), v.literal("image/png")), size: v.number(), width: v.number(), height: v.number(), checksum: v.string() },
  returns: v.id("diagnosisImages"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    const maxImages = Number(process.env.MAX_DIAGNOSIS_IMAGES ?? 3);
    const maxLongEdge = Number(process.env.MAX_IMAGE_LONG_EDGE ?? 2048);
    if (!["draft", "needs_evidence"].includes(session.status) || session.imageCount >= maxImages) throw new Error("This diagnosis cannot accept another image");
    if (args.size <= 0 || args.size > 8_000_000 || args.width < 1 || args.height < 1 || Math.max(args.width, args.height) > maxLongEdge || !/^[a-f0-9]{64}$/i.test(args.checksum)) throw new Error("Image metadata is outside accepted limits");
    const stored = await ctx.db.system.get(args.storageId);
    if (!stored || stored.size !== args.size || (stored.contentType && stored.contentType !== args.mime)) { if (stored) await ctx.storage.delete(args.storageId); throw new Error("Uploaded image metadata did not match storage"); }
    const now = Date.now();
    const imageId = await ctx.db.insert("diagnosisImages", { ownerId: user._id, sessionId: session._id, storageId: args.storageId, purpose: args.purpose, mime: args.mime, size: args.size, width: args.width, height: args.height, checksum: args.checksum, uploadState: "pending_processing", createdAt: now, updatedAt: now });
    await ctx.db.patch(session._id, { imageCount: session.imageCount + 1, updatedAt: now });
    return imageId;
  },
});

export const imageForNormalization = internalQueryGeneric({ args: { imageId: v.id("diagnosisImages") }, returns: v.object({ storageId: v.id("_storage"), uploadState: v.string() }), handler: async (ctx, args) => { const user = await requireUser(ctx); const image = requireOwned(await ctx.db.get(args.imageId), user._id); return { storageId: image.storageId, uploadState: String(image.uploadState) }; } });

export const finishImageNormalization = internalMutationGeneric({ args: { imageId: v.id("diagnosisImages"), storageId: v.id("_storage"), size: v.number(), width: v.number(), height: v.number(), checksum: v.string() }, returns: v.id("diagnosisImages"), handler: async (ctx, args) => { const user = await requireUser(ctx); const image = requireOwned(await ctx.db.get(args.imageId), user._id); const session = requireOwned(await ctx.db.get(image.sessionId), user._id); if (image.uploadState !== "pending_processing") { await ctx.storage.delete(args.storageId); return image._id; } const duplicates = await ctx.db.query("diagnosisImages").withIndex("by_checksum", (q: any) => q.eq("checksum", args.checksum)).collect(); const duplicate = duplicates.find((item: any) => item._id !== image._id && item.ownerId === user._id && item.sessionId === session._id && item.uploadState === "ready"); if (duplicate) { await ctx.storage.delete(image.storageId); await ctx.storage.delete(args.storageId); await ctx.db.delete(image._id); await ctx.db.patch(session._id, { imageCount: Math.max(0, session.imageCount - 1), updatedAt: Date.now() }); return duplicate._id; } await ctx.storage.delete(image.storageId); await ctx.db.patch(image._id, { storageId: args.storageId, mime: "image/jpeg", size: args.size, width: args.width, height: args.height, checksum: args.checksum, uploadState: "ready", updatedAt: Date.now() }); return image._id; } });

export const failImageNormalization = internalMutationGeneric({ args: { imageId: v.id("diagnosisImages") }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); const image = requireOwned(await ctx.db.get(args.imageId), user._id); const session = requireOwned(await ctx.db.get(image.sessionId), user._id); await ctx.storage.delete(image.storageId); await ctx.db.delete(image._id); await ctx.db.patch(session._id, { imageCount: Math.max(0, session.imageCount - 1), updatedAt: Date.now() }); return null; } });

export const removeImage = mutationGeneric({
  args: { imageId: v.id("diagnosisImages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const image = requireOwned(await ctx.db.get(args.imageId), user._id);
    const session = requireOwned(await ctx.db.get(image.sessionId), user._id);
    if (!["draft", "needs_evidence"].includes(session.status)) throw new Error("Images cannot be changed after analysis starts");
    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(image._id);
    await ctx.db.patch(session._id, { imageCount: Math.max(0, session.imageCount - 1), updatedAt: Date.now() });
    return null;
  },
});

export const getImageForDelivery = queryGeneric({
  args: { imageId: v.id("diagnosisImages") },
  returns: v.union(v.null(), v.object({ storageId: v.id("_storage"), mime: v.string() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const image = requireOwned(await ctx.db.get(args.imageId), user._id);
    return image.uploadState === "ready" ? { storageId: image.storageId, mime: image.mime } : null;
  },
});

export const analysisInput = internalQueryGeneric({
  args: { sessionId: v.id("diagnosisSessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    if (session.expiresAt <= Date.now()) throw new Error("Diagnosis session expired");
    const images = await ctx.db.query("diagnosisImages").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect();
    if (!images.length || images.some((image: any) => image.uploadState !== "ready")) throw new Error("Ready diagnosis images are required");
    return { session, diyLevel: user.diyLevel, images: images.map((image: any) => ({ storageId: image.storageId, mime: image.mime })) };
  },
});

export const markAnalyzing = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), clarification: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    const active = await ctx.db.query("diagnosisSessions").withIndex("by_owner_status", (q: any) => q.eq("ownerId", user._id).eq("status", "analyzing")).collect();
    if (active.some((candidate: any) => candidate._id !== session._id && candidate.updatedAt > Date.now() - 300_000)) throw new Error("Another diagnosis is already being analyzed");
    if (session.imageCount < 1 || session.imageCount > Number(process.env.MAX_DIAGNOSIS_IMAGES ?? 3)) throw new Error("Diagnosis requires one to three images");
    const clarification = args.clarification?.trim();
    if (clarification && clarification.length > 500) throw new Error("Clarification is too long");
    if (clarification) await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "clarification", limit: Number(process.env.CLARIFICATION_BURST_LIMIT ?? 4), windowMs: 60_000 });
    await ctx.db.patch(session._id, { status: "analyzing", clarificationAnswer: clarification || session.clarificationAnswer, updatedAt: Date.now() });
    return null;
  },
});

export const finalizeResult = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), ledgerId: v.id("usageLedger"), result: diagnosisResultValidator, safetyLevel: safetyLevelValidator },
  returns: v.id("diagnosisResults"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    const ledger = requireOwned(await ctx.db.get(args.ledgerId), user._id);
    if (ledger.sessionId !== session._id || ledger.state !== "reserved") throw new Error("Diagnosis usage reservation is invalid");
    const existing = await ctx.db.query("diagnosisResults").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).unique();
    const now = Date.now();
    if (existing) { await ctx.db.patch(ledger._id, { state: "released", reason: "duplicate_result", releasedAt: now, updatedAt: now }); return existing._id; }
    const resultId = await ctx.db.insert("diagnosisResults", { ownerId: user._id, sessionId: session._id, result: args.result, safetyLevel: args.safetyLevel, schemaVersion: "diagnosis-result-v2", createdAt: now, updatedAt: now });
    await ctx.db.patch(session._id, { status: "complete", followUp: undefined, updatedAt: now });
    await ctx.db.patch(ledger._id, { state: "consumed", consumedAt: now, updatedAt: now });
    return resultId;
  },
});

export const storeFollowUp = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), ledgerId: v.id("usageLedger"), outcome: v.union(v.literal("needs_evidence"), v.literal("needs_clarification"), v.literal("unsupported")), evidenceRequest: v.optional(evidenceRequestValidator), question: v.optional(v.string()), reason: v.optional(v.string()) },
  returns: v.object({ outcome: v.string(), followUp: followUpValidator }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    const ledger = requireOwned(await ctx.db.get(args.ledgerId), user._id);
    if (ledger.sessionId !== session._id || ledger.state !== "reserved") throw new Error("Diagnosis usage reservation is invalid");
    let outcome = args.outcome;
    let followUp: { reason: string; instructions?: string; purpose?: "problem" | "label" | "evidence"; remainingImages?: number } | { question: string };
    if ((outcome === "needs_evidence" && session.imageCount >= Number(process.env.MAX_DIAGNOSIS_IMAGES ?? 3)) || (outcome === "needs_clarification" && session.clarificationCount >= Number(process.env.MAX_CLARIFICATION_ROUNDS ?? 3))) {
      outcome = "unsupported";
      followUp = { reason: "FixLens could not reach a reliable assessment within the evidence limits." };
    } else if (outcome === "needs_evidence" && args.evidenceRequest) followUp = args.evidenceRequest;
    else if (outcome === "needs_clarification" && args.question) followUp = { question: args.question };
    else followUp = { reason: args.reason || "This object or problem is not supported." };
    const now = Date.now();
    await ctx.db.patch(session._id, { status: outcome, followUp, clarificationCount: outcome === "needs_clarification" ? session.clarificationCount + 1 : session.clarificationCount, updatedAt: now });
    await ctx.db.patch(ledger._id, { state: "released", reason: outcome, releasedAt: now, updatedAt: now });
    return { outcome, followUp };
  },
});

export const markFailed = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    if (session.status !== "complete") await ctx.db.patch(session._id, { status: "failed", updatedAt: Date.now() });
    return null;
  },
});

export const finishApplianceScan = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), status: v.union(v.literal("complete"), v.literal("failed")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = requireOwned(await ctx.db.get(args.sessionId), user._id);
    if (session.category !== "appliance_profile") throw new Error("Not an appliance scan");
    const images = await ctx.db.query("diagnosisImages").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect();
    if (args.status === "failed") for (const image of images) { await ctx.storage.delete(image.storageId); await ctx.db.delete(image._id); }
    await ctx.db.patch(session._id, { status: args.status === "complete" ? "awaiting_confirmation" : "failed", imageCount: args.status === "complete" ? images.length : 0, updatedAt: Date.now() });
    return null;
  },
});

export const cleanupExpiredSessions = internalMutationGeneric({
  args: {}, returns: v.number(), handler: async (ctx) => {
    const expired = await ctx.db.query("diagnosisSessions").withIndex("by_expiry", (q: any) => q.lt("expiresAt", Date.now())).take(50);
    let removed = 0;
    for (const session of expired) {
      if (["complete", "expired"].includes(session.status)) continue;
      const images = await ctx.db.query("diagnosisImages").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect();
      for (const image of images) { await ctx.storage.delete(image.storageId); await ctx.db.delete(image._id); removed += 1; }
      const ledgers = await ctx.db.query("usageLedger").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect();
      const now = Date.now(); for (const ledger of ledgers) if (ledger.state === "reserved") await ctx.db.patch(ledger._id, { state: "released", reason: "session_expired", releasedAt: now, updatedAt: now });
      await ctx.db.patch(session._id, { status: "expired", imageCount: 0, updatedAt: now });
    }
    return removed;
  },
});
