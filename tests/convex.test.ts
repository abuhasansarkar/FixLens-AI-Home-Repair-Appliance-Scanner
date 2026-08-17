// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const ensureCurrent = makeFunctionReference<"mutation", { email: string; name?: string }, GenericId<"users">>("users:ensureCurrent");
const createSession = makeFunctionReference<"mutation", { description?: string; idempotencyKey: string }, GenericId<"diagnosisSessions">>("diagnoses:createSession");
const getResult = makeFunctionReference<"query", { sessionId: GenericId<"diagnosisSessions"> }, unknown>("diagnoses:getResult");
const reserve = makeFunctionReference<"mutation", { sessionId: GenericId<"diagnosisSessions">; idempotencyKey: string }, GenericId<"usageLedger">>("usage:reserve");
const transition = makeFunctionReference<"mutation", { ledgerId: GenericId<"usageLedger">; state: "consumed" | "released"; reason?: string }, null>("usage:transition");
const deleteCurrent = makeFunctionReference<"mutation", Record<string, never>, null>("users:deleteCurrent");
const applyRevenueCatEvent = makeFunctionReference<"mutation", { eventId: string; appUserId: string; type: string; entitlementIds: string[]; productId?: string; expirationAt?: number; environment: string; eventAt: number; payloadHash: string }, { duplicate: boolean; userFound: boolean }>("subscriptions:applyRevenueCatEvent");
const addAppliance = makeFunctionReference<"mutation", { name: string; brand: string; model: string; room: string }, GenericId<"appliances">>("appliances:add");
const usageSummary = makeFunctionReference<"query", Record<string, never>, { entitlement: string; used: number; limit: number; periodKey: string }>("usage:summary");
const currentHome = makeFunctionReference<"query", Record<string, never>, { id: GenericId<"homes">; rooms: { id: GenericId<"rooms">; name: string; applianceCount: number }[] } | null>("homes:current");
const addRoom = makeFunctionReference<"mutation", { homeId: GenericId<"homes">; name: string }, GenericId<"rooms">>("homes:addRoom");
const renameRoom = makeFunctionReference<"mutation", { roomId: GenericId<"rooms">; name: string }, null>("homes:renameRoom");
const removeRoom = makeFunctionReference<"mutation", { roomId: GenericId<"rooms"> }, null>("homes:removeRoom");
const startDeletion = makeFunctionReference<"mutation", Record<string, never>, GenericId<"deletionJobs">>("deletion:start");
const deletionStatus = makeFunctionReference<"query", { jobId: GenericId<"deletionJobs"> }, { state: string; deletedRows: number } | null>("deletion:status");
const listRepairs = makeFunctionReference<"query", { paginationOpts: { numItems: number; cursor: string | null } }, { page: unknown[] }>("repairs:list");

function identity(subject: string) {
  return { subject, tokenIdentifier: "test|" + subject, issuer: "https://test.clerk.accounts.dev", email: subject + "@example.com" };
}

describe("Convex authorization and lifecycle", () => {
  it("returns no repair data until the authenticated user is initialized", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity(identity("new-user"));
    const args = { paginationOpts: { numItems: 20, cursor: null } };

    await expect(user.query(listRepairs, args)).resolves.toMatchObject({ page: [], isDone: true });
    await user.mutation(ensureCurrent, { email: "new-user@example.com" });
    await expect(user.query(listRepairs, args)).resolves.toMatchObject({ page: [] });
  });

  it("returns an empty repair page to unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(listRepairs, { paginationOpts: { numItems: 20, cursor: null } }))
      .resolves.toMatchObject({ page: [], isDone: true });
  });

  it("isolates diagnosis ownership", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(identity("alice"));
    const bob = t.withIdentity(identity("bob"));
    await alice.mutation(ensureCurrent, { email: "alice@example.com" });
    await bob.mutation(ensureCurrent, { email: "bob@example.com" });
    const sessionId = await alice.mutation(createSession, { idempotencyKey: "alice-session" });
    await expect(bob.query(getResult, { sessionId })).rejects.toThrow();
  });

  it("atomically enforces the three-diagnosis lifetime Free limit", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity(identity("free-user"));
    await user.mutation(ensureCurrent, { email: "free@example.com" });
    for (let index = 0; index < 3; index += 1) {
      const sessionId = await user.mutation(createSession, { idempotencyKey: "session-" + index });
      const ledgerId = await user.mutation(reserve, { sessionId, idempotencyKey: "reserve-" + index });
      await user.mutation(transition, { ledgerId, state: "consumed" });
    }
    const fourth = await user.mutation(createSession, { idempotencyKey: "session-4" });
    await expect(user.mutation(reserve, { sessionId: fourth, idempotencyKey: "reserve-4" })).rejects.toThrow(/allowance/i);
  });

  it("transactionally rate limits diagnosis-session bursts", async () => {
    const t = convexTest(schema, modules); const user = t.withIdentity(identity("burst-user"));
    await user.mutation(ensureCurrent, { email: "burst@example.com" });
    for (let index=0;index<5;index+=1) await user.mutation(createSession,{idempotencyKey:`burst-${index}`});
    await expect(user.mutation(createSession,{idempotencyKey:"burst-6"})).rejects.toThrow(/too many requests/i);
  });

  it("processes RevenueCat events idempotently", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity(identity("clerk-pro"));
    await user.mutation(ensureCurrent, { email: "pro@example.com" });
    const event = { eventId: "evt-1", appUserId: "clerk-pro", type: "INITIAL_PURCHASE", entitlementIds: ["pro"], productId: "fixlens.pro.monthly", expirationAt: Date.now() + 86_400_000, environment: "SANDBOX", eventAt: Date.now(), payloadHash: "abc" };
    expect((await t.mutation(applyRevenueCatEvent, event)).duplicate).toBe(false);
    expect((await t.mutation(applyRevenueCatEvent, event)).duplicate).toBe(true);
    const subscriptions = await t.run(async (ctx) => ctx.db.query("subscriptionState").collect());
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].active).toBe(true);
  });

  it("cascades owned records when deleting an account", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity(identity("delete-user"));
    const ownerId = await user.mutation(ensureCurrent, { email: "delete@example.com" });
    await t.run(async (ctx) => { const now = Date.now(); await ctx.db.insert("homes", { ownerId, name: "Home", timezone: "UTC", isDefault: true, createdAt: now, updatedAt: now }); });
    await user.mutation(deleteCurrent, {});
    const remaining = await t.run(async (ctx) => ({ users: await ctx.db.query("users").collect(), homes: await ctx.db.query("homes").collect() }));
    expect(remaining).toEqual({ users: [], homes: [] });
  });

  it("enforces the one-appliance Free limit on the server", async () => {
    const t = convexTest(schema, modules); const user = t.withIdentity(identity("appliance-free"));
    await user.mutation(ensureCurrent, { email: "appliance@example.com" });
    await user.mutation(addAppliance, { name: "Washer", brand: "Brand", model: "A1", room: "Laundry" });
    await expect(user.mutation(addAppliance, { name: "Dryer", brand: "Brand", model: "B2", room: "Laundry" })).rejects.toThrow(/one appliance/i);
  });

  it("preserves Free lifetime usage while Pro is active and after it expires", async () => {
    const t = convexTest(schema, modules); const user = t.withIdentity(identity("period-user"));
    await user.mutation(ensureCurrent, { email: "period@example.com" });
    const first = await user.mutation(createSession, { idempotencyKey: "free-before-pro" }); const ledger = await user.mutation(reserve, { sessionId: first, idempotencyKey: "free-ledger" }); await user.mutation(transition, { ledgerId: ledger, state: "consumed" });
    await t.mutation(applyRevenueCatEvent, { eventId: "pro-start", appUserId: "period-user", type: "INITIAL_PURCHASE", entitlementIds: ["pro"], expirationAt: Date.now() + 86_400_000, environment: "SANDBOX", eventAt: Date.now(), payloadHash: "pro" });
    expect((await user.query(usageSummary, {})).entitlement).toBe("pro"); expect((await user.query(usageSummary, {})).used).toBe(0);
    await t.mutation(applyRevenueCatEvent, { eventId: "pro-expire", appUserId: "period-user", type: "EXPIRATION", entitlementIds: [], expirationAt: Date.now() - 1, environment: "SANDBOX", eventAt: Date.now() + 1, payloadHash: "expired" });
    const after = await user.query(usageSummary, {}); expect(after.entitlement).toBe("free"); expect(after.used).toBe(1);
  });

  it("manages owned rooms and refuses to delete a room containing an appliance", async () => {
    const t = convexTest(schema, modules); const alice = t.withIdentity(identity("rooms-alice")); const bob = t.withIdentity(identity("rooms-bob"));
    await alice.mutation(ensureCurrent, { email: "rooms-alice@example.com" }); await bob.mutation(ensureCurrent, { email: "rooms-bob@example.com" });
    await alice.mutation(addAppliance, { name: "Washer", brand: "Brand", model: "A1", room: "Laundry" });
    const home = await alice.query(currentHome, {}); expect(home?.rooms[0]).toMatchObject({ name: "Laundry", applianceCount: 1 });
    const officeId = await alice.mutation(addRoom, { homeId: home!.id, name: "Office" });
    await expect(bob.mutation(renameRoom, { roomId: officeId, name: "Mine" })).rejects.toThrow();
    await alice.mutation(renameRoom, { roomId: officeId, name: "Workshop" });
    await alice.mutation(removeRoom, { roomId: officeId });
    await expect(alice.mutation(removeRoom, { roomId: home!.rooms[0].id })).rejects.toThrow(/move or delete/i);
  });

  it("deletes account data through resumable bounded batches", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules); const user = t.withIdentity(identity("batch-delete"));
      await user.mutation(ensureCurrent, { email: "batch-delete@example.com" });
      await user.mutation(addAppliance, { name: "Washer", brand: "Brand", model: "A1", room: "Laundry" });
      const jobId = await user.mutation(startDeletion, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      expect(await user.query(deletionStatus, { jobId })).toMatchObject({ state: "complete" });
      await expect(user.mutation(ensureCurrent,{email:"batch-delete@example.com"})).rejects.toThrow(/deletion is pending/i);
      const remaining = await t.run(async (ctx) => ({ users: await ctx.db.query("users").collect(), appliances: await ctx.db.query("appliances").collect(), jobs: await ctx.db.query("deletionJobs").collect() }));
      expect(remaining.users).toHaveLength(0); expect(remaining.appliances).toHaveLength(0); expect(remaining.jobs).toHaveLength(1);
    } finally { vi.useRealTimers(); }
  });
});
