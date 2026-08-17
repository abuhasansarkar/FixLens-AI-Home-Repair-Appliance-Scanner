import { internalMutationGeneric, makeFunctionReference, mutationGeneric, queryGeneric } from "convex/server";
import type { GenericId } from "convex/values";
import { v } from "convex/values";

import { requireIdentity, requireUser } from "./lib/auth";

const runDeletionBatch = makeFunctionReference<"mutation", { jobId: GenericId<"deletionJobs"> }, null>("deletion:runBatch");

async function deleteOwnedData(ctx: any, user: any) {
  const ownerId = user._id as GenericId<"users">;
  const images = await ctx.db.query("diagnosisImages").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect();
  for (const image of images) await ctx.storage.delete(image.storageId);
  const assistantAttachments = await ctx.db.query("assistantAttachments").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect();
  for (const attachment of assistantAttachments) await ctx.storage.delete(attachment.storageId);
  const appliances = await ctx.db.query("appliances").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect();
  for (const appliance of appliances) { if (appliance.imageStorageId) await ctx.storage.delete(appliance.imageStorageId); if (appliance.warrantyReminderId) await ctx.scheduler.cancel(appliance.warrantyReminderId); }
  const tasks = await ctx.db.query("maintenanceTasks").withIndex("by_owner_due", (q: any) => q.eq("ownerId", ownerId)).collect();
  for (const task of tasks) if (task.scheduledFunctionId) await ctx.scheduler.cancel(task.scheduledFunctionId);
  const repairs = await ctx.db.query("repairs").withIndex("by_owner_updated", (q: any) => q.eq("ownerId", ownerId)).collect();
  for (const repair of repairs) if (repair.followUpScheduledFunctionId) await ctx.scheduler.cancel(repair.followUpScheduledFunctionId);
  const groups = [
    await ctx.db.query("repairSteps").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("aiMessages").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), assistantAttachments, await ctx.db.query("maintenanceHistory").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), tasks,
    await ctx.db.query("diagnosisResults").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), images, await ctx.db.query("aiUsage").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("usageLedger").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), repairs,
    await ctx.db.query("diagnosisSessions").withIndex("by_owner_updated", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("applianceDocuments").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), appliances, await ctx.db.query("rooms").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("homes").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(),
    await ctx.db.query("pushTokens").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("notificationPreferences").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(), await ctx.db.query("rateLimits").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).collect(),
  ];
  for (const rows of groups) for (const row of rows) await ctx.db.delete(row._id);
  await ctx.db.delete(ownerId);
}

export const ensureCurrent = mutationGeneric({ args: { email: v.string(), name: v.optional(v.string()), avatarUrl: v.optional(v.string()) }, returns: v.id("users"), handler: async (ctx, args) => { const identity = await requireIdentity(ctx); const existing = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject)).unique(); const deletionJob=await ctx.db.query("deletionJobs").withIndex("by_clerk_id",(q:any)=>q.eq("clerkId",identity.subject)).unique();if(deletionJob){if(existing)return existing._id;throw new Error("Account deletion is pending identity removal");} const now = Date.now(); if (existing) { await ctx.db.patch(existing._id, { email: args.email, name: args.name, avatarUrl: args.avatarUrl, updatedAt: now }); return existing._id; } return ctx.db.insert("users", { clerkId: identity.subject, email: args.email, name: args.name, avatarUrl: args.avatarUrl, onboardingComplete: false, interests: [], locale: "en", appearance: "system", units: "imperial", reducedMotion: false, deletionState: "active", createdAt: now, updatedAt: now }); } });
export const current = queryGeneric({ args: {}, returns: v.union(v.null(), v.any()), handler: async (ctx) => { try { return await requireUser(ctx); } catch { return null; } } });
export const completeOnboarding = mutationGeneric({ args: { interests: v.array(v.string()), diyLevel: v.string(), safetyPolicyVersion: v.string() }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); const now = Date.now(); await ctx.db.patch(user._id as GenericId<"users">, { interests: args.interests, diyLevel: args.diyLevel, safetyPolicyVersion: args.safetyPolicyVersion, safetyAcceptedAt: now, onboardingComplete: true, updatedAt: now }); return null; } });
export const updateSettings = mutationGeneric({ args: { appearance: v.union(v.literal("system"), v.literal("light"), v.literal("dark")), units: v.union(v.literal("imperial"), v.literal("metric")), reducedMotion: v.boolean(), diyLevel: v.union(v.literal("beginner"),v.literal("comfortable"),v.literal("experienced")) }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); await ctx.db.patch(user._id as GenericId<"users">, { ...args, updatedAt: Date.now() }); return null; } });
export const deleteCurrent = mutationGeneric({ args: {}, returns: v.null(), handler: async (ctx) => { await deleteOwnedData(ctx, await requireUser(ctx)); return null; } });

export const applyClerkEvent = internalMutationGeneric({
  args: { eventId: v.string(), type: v.string(), clerkId: v.string(), email: v.optional(v.string()), name: v.optional(v.string()), avatarUrl: v.optional(v.string()), payloadHash: v.string() }, returns: v.object({ duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("webhookEvents").withIndex("by_provider_event", (q: any) => q.eq("provider", "clerk").eq("eventId", args.eventId)).unique();
    if (duplicate) return { duplicate: true };
    const now = Date.now(); const user = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.clerkId)).unique();
    if (args.type === "user.deleted") {
      const deletionJob = await ctx.db.query("deletionJobs").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.clerkId)).unique();
      if (user) {
        const jobId = deletionJob?._id ?? await ctx.db.insert("deletionJobs", { ownerId: user._id, clerkId: user.clerkId, state: "running", stage: 0, deletedRows: 0, createdAt: now, updatedAt: now });
        if (deletionJob) await ctx.db.patch(deletionJob._id, { state: "running", error: undefined, updatedAt: now });
        await ctx.db.patch(user._id, { deletionState: "in_progress", updatedAt: now });
        await ctx.scheduler.runAfter(0, runDeletionBatch, { jobId });
      } else if (deletionJob?.state === "complete") await ctx.db.delete(deletionJob._id);
    }
    else if (user) await ctx.db.patch(user._id, { email: args.email ?? user.email, name: args.name, avatarUrl: args.avatarUrl, updatedAt: now });
    else if (args.email) await ctx.db.insert("users", { clerkId: args.clerkId, email: args.email, name: args.name, avatarUrl: args.avatarUrl, onboardingComplete: false, interests: [], locale: "en", appearance: "system", units: "imperial", reducedMotion: false, deletionState: "active", createdAt: now, updatedAt: now });
    await ctx.db.insert("webhookEvents", { provider: "clerk", eventId: args.eventId, receivedAt: now, processedAt: now, status: "processed", payloadHash: args.payloadHash });
    return { duplicate: false };
  },
});
