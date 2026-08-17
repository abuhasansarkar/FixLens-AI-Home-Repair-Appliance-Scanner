import { httpActionGeneric, httpRouter, makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

const http = httpRouter();

const getImageForDelivery = makeFunctionReference<
  "query",
  { imageId: GenericId<"diagnosisImages"> },
  { storageId: GenericId<"_storage">; mime: string } | null
>("diagnoses:getImageForDelivery");
const getApplianceImageForDelivery = makeFunctionReference<"query", { applianceId: GenericId<"appliances"> }, { storageId: GenericId<"_storage">; mime: string } | null>("appliances:imageForDelivery");
const applyRevenueCatEvent = makeFunctionReference<"mutation", {
  eventId: string; appUserId: string; type: string; entitlementIds: string[]; productId?: string; expirationAt?: number; environment: string; eventAt: number; payloadHash: string;
}, { duplicate: boolean; userFound: boolean }>("subscriptions:applyRevenueCatEvent");
const applyClerkEvent = makeFunctionReference<"mutation", { eventId: string; type: string; clerkId: string; email?: string; name?: string; avatarUrl?: string; payloadHash: string }, { duplicate: boolean }>("users:applyClerkEvent");

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyRevenueCat(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2)));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${rawBody}`)));
  return constantTimeEqual(signature, parts.v1.toLowerCase());
}

async function verifyClerk(rawBody: string, eventId: string | null, timestamp: string | null, signatures: string | null) {
  const configured = process.env.CLERK_WEBHOOK_SECRET;
  if (!configured || !eventId || !timestamp || !signatures || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  try {
    const encoded = configured.startsWith("whsec_") ? configured.slice(6) : configured;
    const secret = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${eventId}.${timestamp}.${rawBody}`)));
    let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
    const expected = btoa(binary);
    return signatures.split(" ").some((part) => { const [version, signature] = part.split(",", 2); return version === "v1" && Boolean(signature) && constantTimeEqual(expected, signature); });
  } catch { return false; }
}

async function revenueCatPro(appUserId: string) {
  const apiKey = process.env.REVENUECAT_SECRET_KEY;
  if (!apiKey) return { entitlementIds: [] as string[], expirationAt: undefined as number | undefined, productId: undefined as string | undefined };
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`RevenueCat customer verification failed with status ${response.status}`);
  const payload = await response.json() as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }> } };
  const pro = payload.subscriber?.entitlements?.pro; const expirationAt = pro?.expires_date ? Date.parse(pro.expires_date) : undefined;
  return { entitlementIds: pro && (expirationAt === undefined || expirationAt > Date.now()) ? ["pro"] : [], expirationAt: Number.isFinite(expirationAt) ? expirationAt : undefined, productId: pro?.product_identifier };
}

http.route({
  path: "/diagnosis-image",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    const imageId = new URL(request.url).searchParams.get("id");
    if (!imageId) return new Response("Missing image id", { status: 400 });
    try {
      const record = await ctx.runQuery(getImageForDelivery, { imageId: imageId as GenericId<"diagnosisImages"> });
      if (!record) return new Response("Not found", { status: 404 });
      const blob = await ctx.storage.get(record.storageId);
      if (!blob) return new Response("Not found", { status: 404 });
      return new Response(blob, {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Content-Type": record.mime,
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }),
});

http.route({
  path: "/appliance-image",
  method: "GET",
  handler: httpActionGeneric(async (ctx, request) => {
    const applianceId = new URL(request.url).searchParams.get("id");
    if (!applianceId) return new Response("Missing appliance id", { status: 400 });
    try {
      const record = await ctx.runQuery(getApplianceImageForDelivery, { applianceId: applianceId as GenericId<"appliances"> });
      if (!record) return new Response("Not found", { status: 404 });
      const blob = await ctx.storage.get(record.storageId);
      if (!blob) return new Response("Not found", { status: 404 });
      return new Response(blob, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0", "Content-Type": record.mime, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
    } catch { return new Response("Not found", { status: 404 }); }
  }),
});

http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    if (Number(request.headers.get("content-length") ?? 0) > 1_000_000) return new Response("Payload too large", { status: 413 });
    const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;
    if (!expectedAuthorization || !constantTimeEqual(request.headers.get("Authorization") ?? "", `Bearer ${expectedAuthorization}`)) return new Response("Unauthorized", { status: 401 });
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return new Response("Payload too large", { status: 413 });
    if (!(await verifyRevenueCat(rawBody, request.headers.get("X-RevenueCat-Webhook-Signature")))) return new Response("Invalid signature", { status: 401 });
    let payload: unknown;
    try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (!payload || typeof payload !== "object" || !("event" in payload) || !payload.event || typeof payload.event !== "object") return new Response("Invalid event", { status: 400 });
    const event = payload.event as Record<string, unknown>;
    if (event.type === "TRANSFER" && typeof event.id === "string" && typeof event.event_timestamp_ms === "number") {
      const transferredFrom = Array.isArray(event.transferred_from) ? event.transferred_from.filter((value): value is string => typeof value === "string") : [];
      const transferredTo = Array.isArray(event.transferred_to) ? event.transferred_to.filter((value): value is string => typeof value === "string") : [];
      const payloadHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
      for (const appUserId of transferredFrom) await ctx.runMutation(applyRevenueCatEvent, { eventId: `${event.id}:from:${appUserId}`, appUserId, type: "EXPIRATION", entitlementIds: [], environment: typeof event.environment === "string" ? event.environment : "UNKNOWN", eventAt: event.event_timestamp_ms, payloadHash });
      for (const appUserId of transferredTo) { const verified = await revenueCatPro(appUserId); await ctx.runMutation(applyRevenueCatEvent, { eventId: `${event.id}:to:${appUserId}`, appUserId, type: "TRANSFER", ...verified, environment: typeof event.environment === "string" ? event.environment : "UNKNOWN", eventAt: event.event_timestamp_ms, payloadHash }); }
      return new Response("ok", { status: 200 });
    }
    if (typeof event.id !== "string" || typeof event.app_user_id !== "string" || typeof event.type !== "string" || typeof event.event_timestamp_ms !== "number") return new Response("Invalid event", { status: 400 });
    const payloadHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
    await ctx.runMutation(applyRevenueCatEvent, {
      eventId: event.id,
      appUserId: event.app_user_id,
      type: event.type,
      entitlementIds: Array.isArray(event.entitlement_ids) ? event.entitlement_ids.filter((value): value is string => typeof value === "string") : [],
      productId: typeof event.product_id === "string" ? event.product_id : undefined,
      expirationAt: typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : undefined,
      environment: typeof event.environment === "string" ? event.environment : "UNKNOWN",
      eventAt: event.event_timestamp_ms,
      payloadHash,
    });
    return new Response("ok", { status: 200 });
  }),
});

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    if (Number(request.headers.get("content-length") ?? 0) > 512_000) return new Response("Payload too large", { status: 413 });
    const rawBody = await request.text(); if (rawBody.length > 512_000) return new Response("Payload too large", { status: 413 }); const eventId = request.headers.get("svix-id");
    if (!(await verifyClerk(rawBody, eventId, request.headers.get("svix-timestamp"), request.headers.get("svix-signature")))) return new Response("Invalid signature", { status: 401 });
    let payload: unknown; try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (!payload || typeof payload !== "object") return new Response("Invalid event", { status: 400 });
    const event = payload as { type?: unknown; data?: unknown };
    if (typeof event.type !== "string" || !event.data || typeof event.data !== "object") return new Response("Invalid event", { status: 400 });
    if (!["user.created", "user.updated", "user.deleted"].includes(event.type)) return new Response("ignored", { status: 200 });
    const data = event.data as Record<string, unknown>;
    if (typeof data.id !== "string" || !eventId) return new Response("Invalid user event", { status: 400 });
    const emails = Array.isArray(data.email_addresses) ? data.email_addresses as Array<Record<string, unknown>> : [];
    const primary = emails.find((entry) => entry.id === data.primary_email_address_id) ?? emails[0];
    const email = typeof primary?.email_address === "string" ? primary.email_address : undefined;
    const name = [data.first_name, data.last_name].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(" ") || undefined;
    const payloadHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
    await ctx.runMutation(applyClerkEvent, { eventId, type: event.type, clerkId: data.id, email, name, avatarUrl: typeof data.image_url === "string" ? data.image_url : undefined, payloadHash });
    return new Response("ok", { status: 200 });
  }),
});

export default http;
