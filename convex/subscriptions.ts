import { internalMutationGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

const inactiveEventTypes = new Set(["EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED"]);

export const verificationContext = queryGeneric({
  args: {},
  returns: v.object({ appUserId: v.string(), shouldVerify: v.boolean() }),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const current = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).unique();
    return { appUserId: String(user.clerkId), shouldVerify: !current || Date.now() - Number(current.verifiedAt) > 15 * 60_000 };
  },
});

export const current = queryGeneric({
  args: {},
  returns: v.union(v.null(), v.object({ entitlement: v.string(), productId: v.optional(v.string()), active: v.boolean(), willRenew: v.optional(v.boolean()), environment: v.string(), expiresAt: v.optional(v.number()), verifiedAt: v.number() })),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const state = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).unique();
    if (!state) return null;
    return { entitlement: String(state.entitlement), productId: typeof state.productId === "string" ? state.productId : undefined, active: Boolean(state.active), willRenew: typeof state.willRenew === "boolean" ? state.willRenew : undefined, environment: String(state.environment), expiresAt: typeof state.expiresAt === "number" ? state.expiresAt : undefined, verifiedAt: Number(state.verifiedAt) };
  },
});

export const applyVerifiedCustomer = mutationGeneric({
  args: { active: v.boolean(), productId: v.optional(v.string()), expiresAt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).unique();
    const state = { revenueCatId: String(user.clerkId), entitlement: args.active ? "pro" : "free", productId: args.productId, active: args.active, environment: process.env.APP_ENV ?? "unknown", expiresAt: args.expiresAt, eventAt: now, verifiedAt: now, updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, state);
    else await ctx.db.insert("subscriptionState", { ownerId: user._id, ...state, createdAt: now });
    return null;
  },
});

export const applyRevenueCatEvent = internalMutationGeneric({
  args: {
    eventId: v.string(),
    appUserId: v.string(),
    type: v.string(),
    entitlementIds: v.array(v.string()),
    productId: v.optional(v.string()),
    expirationAt: v.optional(v.number()),
    environment: v.string(),
    eventAt: v.number(),
    payloadHash: v.string(),
  },
  returns: v.object({ duplicate: v.boolean(), userFound: v.boolean() }),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("webhookEvents").withIndex("by_provider_event", (q: any) => q.eq("provider", "revenuecat").eq("eventId", args.eventId)).unique();
    if (duplicate) return { duplicate: true, userFound: duplicate.status !== "unknown_user" };
    const now = Date.now();
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.appUserId)).unique();
    if (!user) {
      await ctx.db.insert("webhookEvents", { provider: "revenuecat", eventId: args.eventId, receivedAt: now, processedAt: now, status: "unknown_user", payloadHash: args.payloadHash });
      return { duplicate: false, userFound: false };
    }
    const hasPro = args.entitlementIds.includes("pro");
    const active = hasPro && !inactiveEventTypes.has(args.type) && (args.expirationAt === undefined || args.expirationAt > now);
    const existing = await ctx.db.query("subscriptionState").withIndex("by_owner", (q: any) => q.eq("ownerId", user._id)).unique();
    const state = { revenueCatId: args.appUserId, entitlement: active ? "pro" : "free", productId: args.productId, active, willRenew: active && args.type !== "CANCELLATION", environment: args.environment, expiresAt: args.expirationAt, eventAt: args.eventAt, verifiedAt: now, updatedAt: now };
    if (existing) {
      if (args.eventAt >= existing.eventAt) await ctx.db.patch(existing._id, state);
    } else {
      await ctx.db.insert("subscriptionState", { ownerId: user._id, ...state, createdAt: now });
    }
    await ctx.db.insert("webhookEvents", { provider: "revenuecat", eventId: args.eventId, receivedAt: now, processedAt: now, status: "processed", payloadHash: args.payloadHash });
    return { duplicate: false, userFound: true };
  },
});
