import { makeFunctionReference, mutationGeneric, queryGeneric } from "convex/server";
import { v, type GenericId } from "convex/values";

import { requireOwned, requireUser } from "./lib/auth";
import { applianceLimit } from "./lib/entitlements";

const sendMaintenanceReminder = makeFunctionReference<"action", { taskId: GenericId<"maintenanceTasks"> }, null>("notificationActions:sendMaintenanceReminder");
const sendWarrantyReminder = makeFunctionReference<"action", { applianceId: GenericId<"appliances"> }, null>("notificationActions:sendWarrantyReminder");
async function isPro(ctx: any, ownerId: GenericId<"users">) { const state = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId)).unique(); return Boolean(state?.active && state.entitlement === "pro" && (state.expiresAt === undefined || state.expiresAt > Date.now())); }

export const list = queryGeneric({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const pro = await isPro(ctx, user._id as GenericId<"users">);
    const [appliances, tasks, history] = await Promise.all([ctx.db.query("appliances").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).collect(), pro ? ctx.db.query("maintenanceTasks").withIndex("by_owner_due", (q: any) => q.eq("ownerId", user._id)).collect() : Promise.resolve([]),pro?ctx.db.query("maintenanceHistory").withIndex("by_owner_completed",(q:any)=>q.eq("ownerId",user._id)).order("desc").take(20):Promise.resolve([])]);
    const withRooms = await Promise.all(appliances.map(async (appliance: any) => ({ ...appliance, roomName: appliance.roomId ? (await ctx.db.get(appliance.roomId))?.name : "Home" })));
    return { appliances: withRooms, tasks, history, canAddAppliance: appliances.length < applianceLimit(pro ? "pro" : "free") };
  },
});

export const add = mutationGeneric({
  args: { name: v.string(), brand: v.string(), model: v.string(), serial: v.optional(v.string()), room: v.string(), scanSessionId: v.optional(v.id("diagnosisSessions")) },
  returns: v.id("appliances"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (![args.name, args.brand, args.model, args.room].every((value) => value.trim())) throw new Error("Required appliance fields cannot be empty");
    const existing = await ctx.db.query("appliances").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).collect();
    const pro = await isPro(ctx, user._id as GenericId<"users">);
    if (existing.length >= applianceLimit(pro ? "pro" : "free")) throw new Error("Free accounts support one appliance");
    const now = Date.now();
    let home = await ctx.db.query("homes").withIndex("by_owner_default", (q: any) => q.eq("ownerId", user._id).eq("isDefault", true)).unique();
    if (!home) { const homeId = await ctx.db.insert("homes", { ownerId: user._id, name: "My Home", timezone: "UTC", isDefault: true, createdAt: now, updatedAt: now }); home = await ctx.db.get(homeId); }
    if (!home) throw new Error("Could not create home");
    let room = (await ctx.db.query("rooms").withIndex("by_home", (q: any) => q.eq("homeId", home!._id)).collect()).find((item: any) => item.name.toLowerCase() === args.room.trim().toLowerCase());
    if (!room) { const roomId = await ctx.db.insert("rooms", { ownerId: user._id, homeId: home._id, name: args.room.trim(), sortOrder: 0, createdAt: now, updatedAt: now }); room = await ctx.db.get(roomId); }
    let imageStorageId: GenericId<"_storage"> | undefined;
    let scannedImageId: GenericId<"diagnosisImages"> | undefined;
    if (args.scanSessionId) { const session = requireOwned(await ctx.db.get(args.scanSessionId), user._id); if (session.category !== "appliance_profile" || session.status !== "awaiting_confirmation") throw new Error("Appliance scan is unavailable"); const images = await ctx.db.query("diagnosisImages").withIndex("by_session", (q: any) => q.eq("sessionId", session._id)).collect(); const image = images.length === 1 ? images[0] : undefined; if (!image || image.uploadState !== "ready") throw new Error("Appliance image is unavailable"); imageStorageId = image.storageId; scannedImageId = image._id; }
    const applianceId = await ctx.db.insert("appliances", { ownerId: user._id, homeId: home._id, roomId: room?._id, name: args.name.trim(), category: args.name.trim().toLowerCase(), brand: args.brand.trim(), model: args.model.trim(), serial: args.serial?.trim() || undefined, imageStorageId, status: "active", createdAt: now, updatedAt: now });
    if (scannedImageId && args.scanSessionId) { await ctx.db.delete(scannedImageId); await ctx.db.patch(args.scanSessionId, { status: "complete", imageCount: 0, updatedAt: now }); }
    if (pro) {
      const nextDueAt = now + 90 * 86_400_000;
      const taskId = await ctx.db.insert("maintenanceTasks", { ownerId: user._id, applianceId, title: "Review manufacturer maintenance schedule", instructions: ["Read the model-specific manual.", "Inspect only accessible exterior components.", "Record wear or damage and contact a professional when needed."], cadenceDays: 90, nextDueAt, status: "scheduled", createdAt: now, updatedAt: now });
      const scheduledFunctionId = await ctx.scheduler.runAt(nextDueAt - 86_400_000, sendMaintenanceReminder, { taskId });
      await ctx.db.patch(taskId, { scheduledFunctionId });
    }
    return applianceId;
  },
});

export const imageForDelivery = queryGeneric({ args: { applianceId: v.id("appliances") }, returns: v.union(v.null(), v.object({ storageId: v.id("_storage"), mime: v.string() })), handler: async (ctx, args) => { const user = await requireUser(ctx); const appliance = requireOwned(await ctx.db.get(args.applianceId), user._id); return appliance.imageStorageId ? { storageId: appliance.imageStorageId, mime: "image/jpeg" } : null; } });

export const update = mutationGeneric({
  args: { applianceId: v.id("appliances"), name: v.string(), brand: v.string(), model: v.string(), serial: v.optional(v.string()), room: v.string(), purchaseDate: v.optional(v.number()), warrantyEndsAt: v.optional(v.number()), notes: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const appliance = requireOwned(await ctx.db.get(args.applianceId), user._id);
    if (![args.name, args.brand, args.model, args.room].every((value) => value.trim())) throw new Error("Required appliance fields cannot be empty");
    if (args.notes && args.notes.length > 2000) throw new Error("Appliance notes are too long");
    if (!appliance.homeId) throw new Error("Appliance home is unavailable");
    let room = (await ctx.db.query("rooms").withIndex("by_home", (q: any) => q.eq("homeId", appliance.homeId)).collect()).find((item: any) => item.name.toLowerCase() === args.room.trim().toLowerCase());
    const now = Date.now();
    if (!room) { const roomId = await ctx.db.insert("rooms", { ownerId: user._id, homeId: appliance.homeId, name: args.room.trim(), sortOrder: 0, createdAt: now, updatedAt: now }); room = await ctx.db.get(roomId); }
    if (appliance.warrantyReminderId) await ctx.scheduler.cancel(appliance.warrantyReminderId);
    const reminderAt = args.warrantyEndsAt && args.warrantyEndsAt > now ? Math.max(now + 60_000, args.warrantyEndsAt - 30 * 86_400_000) : undefined;
    const warrantyReminderId = reminderAt ? await ctx.scheduler.runAt(reminderAt, sendWarrantyReminder, { applianceId: appliance._id }) : undefined;
    await ctx.db.patch(appliance._id, { roomId: room?._id, name: args.name.trim(), category: args.name.trim().toLowerCase(), brand: args.brand.trim(), model: args.model.trim(), serial: args.serial?.trim() || undefined, purchaseDate: args.purchaseDate, warrantyEndsAt: args.warrantyEndsAt, warrantyReminderId, notes: args.notes?.trim() || undefined, updatedAt: now });
    return null;
  },
});

export const remove = mutationGeneric({
  args: { applianceId: v.id("appliances") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const appliance = requireOwned(await ctx.db.get(args.applianceId), user._id);
    const tasks = await ctx.db.query("maintenanceTasks").withIndex("by_appliance", (q: any) => q.eq("applianceId", appliance._id)).collect();
    for (const task of tasks) { if (task.scheduledFunctionId) await ctx.scheduler.cancel(task.scheduledFunctionId); await ctx.db.delete(task._id); }
    const histories = await ctx.db.query("maintenanceHistory").withIndex("by_appliance_completed", (q: any) => q.eq("applianceId", appliance._id)).collect();
    for (const history of histories) await ctx.db.patch(history._id, { applianceId: undefined, updatedAt: Date.now() });
    const repairs = await ctx.db.query("repairs").withIndex("by_appliance", (q: any) => q.eq("applianceId", appliance._id)).collect();
    for (const repair of repairs) await ctx.db.patch(repair._id, { applianceId: undefined, updatedAt: Date.now() });
    const documents = await ctx.db.query("applianceDocuments").withIndex("by_appliance", (q: any) => q.eq("applianceId", appliance._id)).collect();
    for (const document of documents) await ctx.db.delete(document._id);
    if (appliance.warrantyReminderId) await ctx.scheduler.cancel(appliance.warrantyReminderId);
    if (appliance.imageStorageId) await ctx.storage.delete(appliance.imageStorageId);
    await ctx.db.delete(appliance._id);
    return null;
  },
});

export const completeTask = mutationGeneric({
  args: { taskId: v.id("maintenanceTasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!(await isPro(ctx, user._id as GenericId<"users">))) throw new Error("FixLens Pro is required for maintenance");
    const task = requireOwned(await ctx.db.get(args.taskId), user._id);
    const now = Date.now();
    if (task.scheduledFunctionId) await ctx.scheduler.cancel(task.scheduledFunctionId);
    await ctx.db.insert("maintenanceHistory", { ownerId: user._id, applianceId: task.applianceId, taskTitle: task.title, completedAt: now, createdAt: now, updatedAt: now });
    const nextDueAt = now + task.cadenceDays * 86_400_000;
    const scheduledFunctionId = await ctx.scheduler.runAt(nextDueAt - 86_400_000, sendMaintenanceReminder, { taskId: task._id });
    await ctx.db.patch(task._id, { status: "scheduled", nextDueAt, scheduledFunctionId, updatedAt: now });
    return null;
  },
});

export const rescheduleTask = mutationGeneric({ args: { taskId: v.id("maintenanceTasks"), nextDueAt: v.number() }, returns: v.null(), handler: async (ctx, args) => { const user = await requireUser(ctx); if (!(await isPro(ctx, user._id as GenericId<"users">))) throw new Error("FixLens Pro is required for maintenance"); const task = requireOwned(await ctx.db.get(args.taskId), user._id); const now = Date.now(); if (!Number.isFinite(args.nextDueAt) || args.nextDueAt < now + 60_000 || args.nextDueAt > now + 5 * 365 * 86_400_000) throw new Error("Maintenance due date is invalid"); if (task.scheduledFunctionId) await ctx.scheduler.cancel(task.scheduledFunctionId); const scheduledFunctionId = await ctx.scheduler.runAt(Math.max(now + 60_000, args.nextDueAt - 86_400_000), sendMaintenanceReminder, { taskId: task._id }); await ctx.db.patch(task._id, { nextDueAt: args.nextDueAt, scheduledFunctionId, updatedAt: now }); return null; } });
