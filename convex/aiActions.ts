"use node";

import { actionGeneric, makeFunctionReference } from "convex/server";
import { v, type GenericId } from "convex/values";
import { createHash } from "node:crypto";
import sharp from "sharp";

import { diagnosisResponseSchema } from "../src/types/contracts";
import { requestApplianceExtraction, requestDiagnosis, requestRepairChat } from "./ai/openai";
import { classifyHazard, enforceSafeResult, permitsRepairSteps } from "./lib/safety";
import { evidenceRequestValidator } from "./validators";

type AnalysisInput = { session: { description?: string }; diyLevel?: string; images: Array<{ storageId: GenericId<"_storage">; mime: "image/jpeg" | "image/png" }> };
type ChatStart = { userMessageId: GenericId<"aiMessages">; assistantMessageId: GenericId<"aiMessages">; assessment: unknown; currentStep?: unknown; hazardLevel: "green" | "yellow" | "orange" | "red"; attachment?: { id: GenericId<"assistantAttachments">; storageId: GenericId<"_storage">; mime: string } };
type RevenueCatCustomer = { subscriber?: { entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }> } };

function encodeBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  return btoa(binary);
}

const reserve = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; idempotencyKey: string }, GenericId<"usageLedger">>("usage:reserve");
const transition = makeFunctionReference<"mutation", { ledgerId: GenericId<"usageLedger">; state: "consumed" | "released"; reason?: string }, null>("usage:transition");
const analysisInput = makeFunctionReference<"query", { sessionId: GenericId<"diagnosisSessions"> }, AnalysisInput>("diagnoses:analysisInput");
const markAnalyzing = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; clarification?: string }, null>("diagnoses:markAnalyzing");
const finalizeResult = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; ledgerId: GenericId<"usageLedger">; result: unknown; safetyLevel: "green" | "yellow" | "orange" | "red" }, GenericId<"diagnosisResults">>("diagnoses:finalizeResult");
const storeFollowUp = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; ledgerId: GenericId<"usageLedger">; outcome: "needs_evidence" | "needs_clarification" | "unsupported"; evidenceRequest?: { reason: string; instructions: string; purpose: "problem" | "label" | "evidence"; remainingImages: number }; question?: string; reason?: string }, { outcome: string; followUp: Record<string, unknown> }>("diagnoses:storeFollowUp");
const markFailed = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions"> }, null>("diagnoses:markFailed");
const recordUsage = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; requestType: string; model: string; inputTokens: number; outputTokens: number; latencyMs: number; providerRequestId?: string; status: string }, null>("aiUsage:record");
const beginChat = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; question: string; currentStep?: number; attachmentId?: GenericId<"assistantAttachments"> }, ChatStart>("assistant:beginChat");
const completeChat = makeFunctionReference<"mutation", { assistantMessageId: GenericId<"aiMessages">; text: string; model: string }, null>("assistant:completeChat");
const failChat = makeFunctionReference<"mutation", { assistantMessageId: GenericId<"aiMessages">; userMessageId: GenericId<"aiMessages"> }, null>("assistant:failChat");
const attachmentForNormalization = makeFunctionReference<"query", { attachmentId: GenericId<"assistantAttachments"> }, { storageId: GenericId<"_storage">; uploadState: string }>("assistant:attachmentForNormalization");
const finishAttachmentNormalization = makeFunctionReference<"mutation", { attachmentId: GenericId<"assistantAttachments">; storageId: GenericId<"_storage">; size: number; width: number; height: number }, GenericId<"assistantAttachments">>("assistant:finishAttachmentNormalization");
const failAttachmentNormalization = makeFunctionReference<"mutation", { attachmentId: GenericId<"assistantAttachments"> }, null>("assistant:failAttachmentNormalization");
const removeAttachment = makeFunctionReference<"mutation", { attachmentId: GenericId<"assistantAttachments"> }, null>("assistant:removeAttachment");
const subscriptionVerificationContext = makeFunctionReference<"query", Record<string, never>, { appUserId: string; shouldVerify: boolean }>("subscriptions:verificationContext");
const applyVerifiedCustomer = makeFunctionReference<"mutation", { active: boolean; productId?: string; expiresAt?: number }, null>("subscriptions:applyVerifiedCustomer");
const finishApplianceScan = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; status: "complete" | "failed" }, null>("diagnoses:finishApplianceScan");
const imageForNormalization = makeFunctionReference<"query", { imageId: GenericId<"diagnosisImages"> }, { storageId: GenericId<"_storage">; uploadState: string }>("diagnoses:imageForNormalization");
const finishImageNormalization = makeFunctionReference<"mutation", { imageId: GenericId<"diagnosisImages">; storageId: GenericId<"_storage">; size: number; width: number; height: number; checksum: string }, GenericId<"diagnosisImages">>("diagnoses:finishImageNormalization");
const failImageNormalization = makeFunctionReference<"mutation", { imageId: GenericId<"diagnosisImages"> }, null>("diagnoses:failImageNormalization");

async function refreshSubscriptionIfStale(ctx: any) {
  const apiKey = process.env.REVENUECAT_SECRET_KEY;
  if (!apiKey) return;
  const verification = await ctx.runQuery(subscriptionVerificationContext, {});
  if (!verification.shouldVerify) return;
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(verification.appUserId)}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`RevenueCat verification failed with status ${response.status}`);
  const customer = await response.json() as RevenueCatCustomer;
  const pro = customer.subscriber?.entitlements?.pro;
  const expiresAt = pro?.expires_date ? Date.parse(pro.expires_date) : undefined;
  const active = Boolean(pro && (expiresAt === undefined || expiresAt > Date.now()));
  await ctx.runMutation(applyVerifiedCustomer, { active, productId: pro?.product_identifier, expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined });
}

export const normalizeImage = actionGeneric({ args: { imageId: v.id("diagnosisImages") }, returns: v.id("diagnosisImages"), handler: async (ctx, args) => { const image = await ctx.runQuery(imageForNormalization, args); if (image.uploadState === "ready") return args.imageId; if (image.uploadState !== "pending_processing") throw new Error("Image is not ready for processing"); let normalizedStorageId: GenericId<"_storage"> | undefined; try { const blob = await ctx.storage.get(image.storageId); if (!blob) throw new Error("Uploaded image is missing"); const maxLongEdge = Number(process.env.MAX_IMAGE_LONG_EDGE ?? 2048); const result = await sharp(Buffer.from(await blob.arrayBuffer()), { limitInputPixels: 40_000_000, failOn: "warning" }).rotate().resize({ width: maxLongEdge, height: maxLongEdge, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true }); if (!result.info.width || !result.info.height || result.data.byteLength > 8_000_000) throw new Error("Normalized image is outside accepted limits"); normalizedStorageId = await ctx.storage.store(new Blob([result.data], { type: "image/jpeg" })); return await ctx.runMutation(finishImageNormalization, { imageId: args.imageId, storageId: normalizedStorageId, size: result.data.byteLength, width: result.info.width, height: result.info.height, checksum: createHash("sha256").update(result.data).digest("hex") }); } catch (error) { if (normalizedStorageId) await ctx.storage.delete(normalizedStorageId); await ctx.runMutation(failImageNormalization, args).catch(() => undefined); throw error; } } });

export const normalizeAssistantAttachment = actionGeneric({ args:{attachmentId:v.id("assistantAttachments")},returns:v.id("assistantAttachments"),handler:async(ctx,args)=>{const attachment=await ctx.runQuery(attachmentForNormalization,args);if(attachment.uploadState==="ready")return args.attachmentId;if(attachment.uploadState!=="pending_processing")throw new Error("Assistant photo is not ready");let normalizedStorageId:GenericId<"_storage">|undefined;try{const blob=await ctx.storage.get(attachment.storageId);if(!blob)throw new Error("Assistant photo is missing");const maxLongEdge=Math.min(Number(process.env.MAX_IMAGE_LONG_EDGE??2048),1600);const result=await sharp(Buffer.from(await blob.arrayBuffer()),{limitInputPixels:40_000_000,failOn:"warning"}).rotate().resize({width:maxLongEdge,height:maxLongEdge,fit:"inside",withoutEnlargement:true}).jpeg({quality:80,mozjpeg:true}).toBuffer({resolveWithObject:true});if(!result.info.width||!result.info.height||result.data.byteLength>6_000_000)throw new Error("Assistant photo is outside accepted limits");normalizedStorageId=await ctx.storage.store(new Blob([result.data],{type:"image/jpeg"}));return await ctx.runMutation(finishAttachmentNormalization,{attachmentId:args.attachmentId,storageId:normalizedStorageId,size:result.data.byteLength,width:result.info.width,height:result.info.height});}catch(error){if(normalizedStorageId)await ctx.storage.delete(normalizedStorageId);await ctx.runMutation(failAttachmentNormalization,args).catch(()=>undefined);throw error;}}});

export const analyze = actionGeneric({
  args: { sessionId: v.id("diagnosisSessions"), idempotencyKey: v.string(), clarification: v.optional(v.string()) },
  returns: v.object({ outcome: v.string(), resultId: v.optional(v.id("diagnosisResults")), safetyLevel: v.optional(v.string()), evidenceRequest: v.optional(evidenceRequestValidator), question: v.optional(v.string()), reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    await refreshSubscriptionIfStale(ctx).catch(() => undefined);
    const ledgerId = await ctx.runMutation(reserve, { sessionId: args.sessionId, idempotencyKey: args.idempotencyKey });
    try {
      await ctx.runMutation(markAnalyzing, { sessionId: args.sessionId, clarification: args.clarification });
      const input = await ctx.runQuery(analysisInput, { sessionId: args.sessionId });
      const images = await Promise.all(input.images.map(async (image) => { const blob = await ctx.storage.get(image.storageId); if (!blob) throw new Error("A diagnosis image is missing"); return { mime: image.mime, base64: encodeBase64(await blob.arrayBuffer()) }; }));
      const response = await requestDiagnosis({ description: input.session.description, clarification: args.clarification, diyLevel: input.diyLevel, images });
      const envelope = diagnosisResponseSchema.parse(response.result);
      if (envelope.outcome !== "diagnosis" || !envelope.result) {
        const stored = await ctx.runMutation(storeFollowUp, { sessionId: args.sessionId, ledgerId, outcome: envelope.outcome === "diagnosis" ? "unsupported" : envelope.outcome, evidenceRequest: envelope.evidenceRequest ?? undefined, question: envelope.clarificationQuestion ?? undefined, reason: envelope.unsupportedReason ?? undefined });
        void ctx.runMutation(recordUsage, { sessionId: args.sessionId, requestType: "diagnosis_follow_up", model: response.model, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: response.latencyMs, providerRequestId: response.providerRequestId, status: stored.outcome }).catch(() => undefined);
        if (stored.outcome === "needs_evidence") return { outcome: stored.outcome, evidenceRequest: stored.followUp as { reason: string; instructions: string; purpose: "problem" | "label" | "evidence"; remainingImages: number } };
        if (stored.outcome === "needs_clarification") return { outcome: stored.outcome, question: String(stored.followUp.question ?? "") };
        return { outcome: "unsupported", reason: String(stored.followUp.reason ?? "This problem is not supported.") };
      }
      const result = enforceSafeResult(envelope.result, (input.session.description ?? "") + " " + (args.clarification ?? ""));
      const resultId = await ctx.runMutation(finalizeResult, { sessionId: args.sessionId, ledgerId, result, safetyLevel: result.safety.level });
      void ctx.runMutation(recordUsage, { sessionId: args.sessionId, requestType: "diagnosis", model: response.model, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: response.latencyMs, providerRequestId: response.providerRequestId, status: "succeeded" }).catch(() => undefined);
      return { outcome: "diagnosis", resultId, safetyLevel: result.safety.level };
    } catch (error) {
      await Promise.allSettled([ctx.runMutation(transition, { ledgerId, state: "released", reason: "provider_or_system_failure" }), ctx.runMutation(markFailed, { sessionId: args.sessionId })]);
      throw error;
    }
  },
});

export const chat = actionGeneric({
  args: { sessionId: v.id("diagnosisSessions"), question: v.string(), currentStep: v.optional(v.number()), attachmentId: v.optional(v.id("assistantAttachments")) },
  returns: v.object({ text: v.string() }),
  handler: async (ctx, args) => {
    await refreshSubscriptionIfStale(ctx).catch(() => undefined);
    const start = await ctx.runMutation(beginChat, args);
    try {
      if (!permitsRepairSteps(start.hazardLevel)) {
        const text = start.hazardLevel === "red" ? "Stop the repair and move away from the hazard. If there is gas, smoke, fire, or immediate danger, leave the area and contact local emergency services or the relevant utility from a safe location." : "Stop the repair and do not continue troubleshooting. Keep clear of the hazard and contact a qualified professional.";
        await ctx.runMutation(completeChat, { assistantMessageId: start.assistantMessageId, text, model: "safety-policy" });
        if (start.attachment) await ctx.runMutation(removeAttachment,{attachmentId:start.attachment.id}).catch(()=>undefined);
        return { text };
      }
      const image = start.attachment ? await ctx.storage.get(start.attachment.storageId) : null;
      if (start.attachment && !image) throw new Error("Assistant photo is missing");
      const response = await requestRepairChat({ result: start.assessment, currentStep: start.currentStep, question: args.question, image: image && start.attachment ? { mime: start.attachment.mime, base64: encodeBase64(await image.arrayBuffer()) } : undefined });
      const detected = classifyHazard(`${args.question} ${response.text}`);
      const text = permitsRepairSteps(detected) ? response.text : "Stop the repair and do not continue troubleshooting. Keep clear of the hazard and contact a qualified professional. If there is immediate danger, contact local emergency services from a safe location.";
      await ctx.runMutation(completeChat, { assistantMessageId: start.assistantMessageId, text, model: response.model });
      void ctx.runMutation(recordUsage, { sessionId: args.sessionId, requestType: "repair_chat", model: response.model, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: response.latencyMs, providerRequestId: response.providerRequestId, status: "succeeded" }).catch(() => undefined);
      if (start.attachment) await ctx.runMutation(removeAttachment,{attachmentId:start.attachment.id}).catch(()=>undefined);
      return { text };
    } catch (error) {
      if (start.attachment) await ctx.runMutation(removeAttachment,{attachmentId:start.attachment.id}).catch(()=>undefined);
      await ctx.runMutation(failChat, { assistantMessageId: start.assistantMessageId, userMessageId: start.userMessageId });
      throw error;
    }
  },
});

export const extractAppliance = actionGeneric({
  args: { sessionId: v.id("diagnosisSessions") },
  returns: v.object({ category: v.string(), name: v.string(), brand: v.union(v.string(), v.null()), model: v.union(v.string(), v.null()), serial: v.union(v.string(), v.null()), confidence: v.number() }),
  handler: async (ctx, args) => {
    let status: "complete" | "failed" = "failed";
    try {
      const input = await ctx.runQuery(analysisInput, { sessionId: args.sessionId });
      if ((input.session as { category?: string }).category !== "appliance_profile" || input.images.length !== 1) throw new Error("A single appliance scan image is required");
      const source = input.images[0];
      const blob = await ctx.storage.get(source.storageId);
      if (!blob) throw new Error("The appliance image is missing");
      const response = await requestApplianceExtraction({ image: { mime: source.mime, base64: encodeBase64(await blob.arrayBuffer()) } });
      const result = response.result;
      if (!result.name.trim() || !result.category.trim() || result.confidence < 0 || result.confidence > 1) throw new Error("Appliance extraction was invalid");
      status = "complete";
      void ctx.runMutation(recordUsage, { sessionId: args.sessionId, requestType: "appliance_extraction", model: response.model, inputTokens: response.inputTokens, outputTokens: response.outputTokens, latencyMs: response.latencyMs, providerRequestId: response.providerRequestId, status: "succeeded" }).catch(() => undefined);
      return result;
    } finally {
      await ctx.runMutation(finishApplianceScan, { sessionId: args.sessionId, status });
    }
  },
});
