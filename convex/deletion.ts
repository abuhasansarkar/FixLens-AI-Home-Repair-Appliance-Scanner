import { internalMutationGeneric, makeFunctionReference, mutationGeneric, queryGeneric } from "convex/server";
import { v, type GenericId } from "convex/values";

import { requireIdentity, requireUser } from "./lib/auth";

const runDeletionBatch = makeFunctionReference<"mutation", { jobId: GenericId<"deletionJobs"> }, null>("deletion:runBatch");

const stages = [
  ["repairSteps", "by_owner"], ["aiMessages", "by_owner"], ["assistantAttachments", "by_owner"], ["maintenanceHistory", "by_owner"], ["maintenanceTasks", "by_owner_due"],
  ["diagnosisResults", "by_owner"], ["diagnosisImages", "by_owner"], ["aiUsage", "by_owner"], ["usageLedger", "by_owner"],
  ["repairs", "by_owner_updated"], ["diagnosisSessions", "by_owner_updated"], ["applianceDocuments", "by_owner"], ["appliances", "by_owner"], ["rooms", "by_owner"],
  ["homes", "by_owner"], ["pushTokens", "by_owner"], ["notificationPreferences", "by_owner"], ["subscriptionState", "by_owner"], ["rateLimits", "by_owner"],
] as const;

export const start = mutationGeneric({
  args: {},
  returns: v.id("deletionJobs"),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.query("deletionJobs").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).unique();
    if (existing) {
      if (existing.state !== "complete") await ctx.scheduler.runAfter(0, runDeletionBatch, { jobId: existing._id });
      return existing._id;
    }
    const now = Date.now();
    const jobId = await ctx.db.insert("deletionJobs", { ownerId: user._id, clerkId: user.clerkId, state: "running", stage: 0, deletedRows: 0, createdAt: now, updatedAt: now });
    await ctx.db.patch(user._id as GenericId<"users">, { deletionState: "in_progress", updatedAt: now });
    await ctx.scheduler.runAfter(0, runDeletionBatch, { jobId });
    return jobId;
  },
});

export const status = queryGeneric({
  args: { jobId: v.id("deletionJobs") },
  returns: v.union(v.null(), v.object({ state: v.string(), deletedRows: v.number(), error: v.optional(v.string()) })),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkId !== identity.subject) return null;
    return { state: job.state, deletedRows: job.deletedRows, error: job.error };
  },
});

export const current = queryGeneric({args:{},returns:v.union(v.null(),v.object({jobId:v.id("deletionJobs"),state:v.string()})),handler:async(ctx)=>{const identity=await requireIdentity(ctx);const job=await ctx.db.query("deletionJobs").withIndex("by_clerk_id",(q:any)=>q.eq("clerkId",identity.subject)).unique();return job?{jobId:job._id,state:job.state}:null;}});

export const retry = mutationGeneric({
  args: { jobId: v.id("deletionJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkId !== identity.subject) throw new Error("Deletion job not found");
    if (job.state === "complete") return null;
    await ctx.db.patch(job._id, { state: "running", error: undefined, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, runDeletionBatch, { jobId: job._id });
    return null;
  },
});

export const runBatch = internalMutationGeneric({
  args: { jobId: v.id("deletionJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.state === "complete") return null;
    try {
      const stage = stages[job.stage];
      if (!stage) {
        const user = await ctx.db.get(job.ownerId);
        if (user) await ctx.db.delete(user._id);
        const now = Date.now();
        await ctx.db.patch(job._id, { state: "complete", completedAt: now, updatedAt: now, error: undefined });
        return null;
      }
      const [table, index] = stage;
      const rows = await (ctx.db as any).query(table).withIndex(index, (q: any) => q.eq("ownerId", job.ownerId)).take(40);
      for (const row of rows) {
        if (table === "diagnosisImages" || table === "assistantAttachments") await ctx.storage.delete(row.storageId);
        if (table === "appliances") { if (row.imageStorageId) await ctx.storage.delete(row.imageStorageId); if (row.warrantyReminderId) await ctx.scheduler.cancel(row.warrantyReminderId); }
        if (table === "maintenanceTasks" && row.scheduledFunctionId) await ctx.scheduler.cancel(row.scheduledFunctionId);
        if (table === "repairs" && row.followUpScheduledFunctionId) await ctx.scheduler.cancel(row.followUpScheduledFunctionId);
        await ctx.db.delete(row._id);
      }
      const nextStage = rows.length < 40 ? job.stage + 1 : job.stage;
      await ctx.db.patch(job._id, { stage: nextStage, deletedRows: job.deletedRows + rows.length, state: "running", error: undefined, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, runDeletionBatch, { jobId: job._id });
    } catch (error) {
      await ctx.db.patch(job._id, { state: "failed", error: error instanceof Error ? error.message.slice(0, 300) : "Deletion batch failed", updatedAt: Date.now() });
    }
    return null;
  },
});
