import { internalMutationGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOwned, requireUser } from "./lib/auth";

export const record = internalMutationGeneric({
  args: { sessionId: v.id("diagnosisSessions"), requestType: v.string(), model: v.string(), inputTokens: v.number(), outputTokens: v.number(), latencyMs: v.number(), providerRequestId: v.optional(v.string()), status: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireOwned(await ctx.db.get(args.sessionId), user._id);
    const inputRate = Number(process.env.OPENAI_INPUT_USD_PER_MILLION ?? 0);
    const outputRate = Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION ?? 0);
    const estimatedCostUsd = (args.inputTokens * inputRate + args.outputTokens * outputRate) / 1_000_000;
    const now = Date.now();
    await ctx.db.insert("aiUsage", { ownerId: user._id, sessionId: args.sessionId, requestType: args.requestType, model: args.model, inputTokens: args.inputTokens, outputTokens: args.outputTokens, estimatedCostUsd, latencyMs: args.latencyMs, status: args.status, providerRequestId: args.providerRequestId, createdAt: now, updatedAt: now });
    return null;
  },
});
