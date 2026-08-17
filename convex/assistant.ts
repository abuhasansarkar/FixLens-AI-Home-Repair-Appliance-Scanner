import { internalMutationGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { GenericId } from "convex/values";

import { requireOwned, requireUser } from "./lib/auth";
import { classifyHazard, permitsRepairSteps } from "./lib/safety";
import { assistantReplyLimit } from "./lib/entitlements";
import { consumeUserRateLimit } from "./lib/rateLimit";

export const list = queryGeneric({ args: { sessionId: v.id("diagnosisSessions") }, returns: v.object({ messages: v.array(v.object({ role: v.string(), text: v.string(), createdAt: v.number() })), replyLimit: v.number() }), handler: async (ctx, args) => { const user = await requireUser(ctx); const session = requireOwned(await ctx.db.get(args.sessionId), user._id); const rows = await ctx.db.query("aiMessages").withIndex("by_session_created", (q: any) => q.eq("sessionId", session._id)).collect(); return { messages: rows.filter((row: any) => row.text).map((row: any) => ({ role: String(row.role), text: String(row.text), createdAt: Number(row.createdAt) })), replyLimit: assistantReplyLimit() }; } });

async function requireEligibleSession(ctx: any, sessionId: any, ownerId: any) { const session = requireOwned(await ctx.db.get(sessionId), ownerId); const subscription = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).unique(); if (!subscription?.active || subscription.entitlement !== "pro" || (subscription.expiresAt !== undefined && subscription.expiresAt <= Date.now())) throw new Error("FixLens Pro is required for the repair assistant"); const assessment = await ctx.db.query("diagnosisResults").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).unique(); if (!assessment || !permitsRepairSteps(assessment.safetyLevel as any) || assessment.result?.professionalRequired) throw new Error("The repair assistant is unavailable for this diagnosis"); return { session, assessment }; }

export const generateAttachmentUploadUrl = mutationGeneric({ args: { sessionId: v.id("diagnosisSessions") }, returns: v.string(), handler: async (ctx, args) => { const user = await requireUser(ctx); await requireEligibleSession(ctx, args.sessionId, user._id); return ctx.storage.generateUploadUrl(); } });
export const completeAttachmentUpload = mutationGeneric({ args: { sessionId: v.id("diagnosisSessions"), storageId: v.id("_storage"), mime: v.union(v.literal("image/jpeg"), v.literal("image/png")), size: v.number(), width: v.number(), height: v.number() }, returns: v.id("assistantAttachments"), handler: async (ctx, args) => { const user = await requireUser(ctx); const { session } = await requireEligibleSession(ctx, args.sessionId, user._id); if (!Number.isFinite(args.size) || args.size <= 0 || args.size > 12_000_000 || !Number.isInteger(args.width) || !Number.isInteger(args.height) || args.width < 1 || args.height < 1 || args.width * args.height > 40_000_000) { await ctx.storage.delete(args.storageId); throw new Error("Assistant photo is outside accepted limits"); } const pending = await ctx.db.query("assistantAttachments").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect(); for (const attachment of pending) { await ctx.storage.delete(attachment.storageId); await ctx.db.delete(attachment._id); } const now=Date.now(); return ctx.db.insert("assistantAttachments", { ownerId:user._id, sessionId:session._id, storageId:args.storageId, mime:args.mime, size:args.size, width:args.width, height:args.height, uploadState:"pending_processing", expiresAt:now+3_600_000, createdAt:now, updatedAt:now }); } });
export const attachmentForNormalization = queryGeneric({ args: { attachmentId: v.id("assistantAttachments") }, returns: v.any(), handler: async(ctx,args)=>{const user=await requireUser(ctx);return requireOwned(await ctx.db.get(args.attachmentId),user._id);} });
export const finishAttachmentNormalization = internalMutationGeneric({ args:{attachmentId:v.id("assistantAttachments"),storageId:v.id("_storage"),size:v.number(),width:v.number(),height:v.number()},returns:v.id("assistantAttachments"),handler:async(ctx,args)=>{const user=await requireUser(ctx);const attachment=requireOwned(await ctx.db.get(args.attachmentId),user._id);await ctx.storage.delete(attachment.storageId);await ctx.db.patch(attachment._id,{storageId:args.storageId,size:args.size,width:args.width,height:args.height,mime:"image/jpeg",uploadState:"ready",updatedAt:Date.now()});return attachment._id;} });
export const failAttachmentNormalization = internalMutationGeneric({ args:{attachmentId:v.id("assistantAttachments")},returns:v.null(),handler:async(ctx,args)=>{const user=await requireUser(ctx);const attachment=requireOwned(await ctx.db.get(args.attachmentId),user._id);await ctx.storage.delete(attachment.storageId);await ctx.db.delete(attachment._id);return null;} });
export const removeAttachment = internalMutationGeneric({ args:{attachmentId:v.id("assistantAttachments")},returns:v.null(),handler:async(ctx,args)=>{const user=await requireUser(ctx);const attachment=requireOwned(await ctx.db.get(args.attachmentId),user._id);await ctx.storage.delete(attachment.storageId);await ctx.db.delete(attachment._id);return null;} });
export const cleanupExpiredAttachments = internalMutationGeneric({args:{},returns:v.number(),handler:async(ctx)=>{const rows=await ctx.db.query("assistantAttachments").withIndex("by_expiry",(q:any)=>q.lt("expiresAt",Date.now())).take(50);for(const row of rows){await ctx.storage.delete(row.storageId);await ctx.db.delete(row._id);}return rows.length;}});

export const beginChat = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), question: v.string(), currentStep: v.optional(v.number()), attachmentId: v.optional(v.id("assistantAttachments")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const question = args.question.trim();
    if (!question || question.length > 500) throw new Error("Assistant questions must be 1 to 500 characters");
    const { session, assessment } = await requireEligibleSession(ctx, args.sessionId, user._id);
    await consumeUserRateLimit(ctx, { ownerId: user._id as GenericId<"users">, name: "assistant_reply", limit: Number(process.env.ASSISTANT_REPLY_BURST_LIMIT ?? 6), windowMs: 60_000 });
    const messages = await ctx.db.query("aiMessages").withIndex("by_session_created", (q: any) => q.eq("sessionId", session._id)).collect();
    if (messages.filter((message: any) => message.role === "assistant").length >= assistantReplyLimit()) throw new Error("Assistant reply limit reached");
    const attachment = args.attachmentId ? requireOwned(await ctx.db.get(args.attachmentId), user._id) : undefined;
    if (attachment && (attachment.sessionId !== session._id || attachment.uploadState !== "ready" || attachment.expiresAt <= Date.now())) throw new Error("Assistant photo is unavailable");
    const now = Date.now();
    const userMessageId = await ctx.db.insert("aiMessages", { ownerId: user._id, sessionId: session._id, role: "user", text: question, createdAt: now, updatedAt: now });
    const assistantMessageId = await ctx.db.insert("aiMessages", { ownerId: user._id, sessionId: session._id, role: "assistant", text: "", createdAt: now + 1, updatedAt: now });
    const currentStep = typeof args.currentStep === "number" ? assessment.result?.repairSteps?.[args.currentStep - 1] : undefined;
    return { userMessageId, assistantMessageId, assessment: assessment.result, currentStep, hazardLevel: classifyHazard(question), attachment: attachment ? { id: attachment._id, storageId: attachment.storageId, mime: attachment.mime } : undefined };
  },
});

export const completeChat = internalMutationGeneric({ args: { assistantMessageId: v.id("aiMessages"), text: v.string(), model: v.string() }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); const message = requireOwned(await ctx.db.get(args.assistantMessageId), user._id); await ctx.db.patch(message._id, { text: args.text, model: args.model, updatedAt: Date.now() }); return null; } });
export const failChat = internalMutationGeneric({ args: { assistantMessageId: v.id("aiMessages"), userMessageId: v.id("aiMessages") }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); const assistant = requireOwned(await ctx.db.get(args.assistantMessageId), user._id); const question = requireOwned(await ctx.db.get(args.userMessageId), user._id); await ctx.db.delete(assistant._id); await ctx.db.delete(question._id); return null; } });
