import { internalActionGeneric, makeFunctionReference } from "convex/server";
import { v, type GenericId } from "convex/values";

type ReminderTarget = { taskId: GenericId<"maintenanceTasks">; title: string; appliance: string; tokens: { id: GenericId<"pushTokens">; token: string }[] } | null;
const reminderTarget = makeFunctionReference<"query", { taskId: GenericId<"maintenanceTasks"> }, ReminderTarget>("notifications:reminderTarget");
const disablePushToken = makeFunctionReference<"mutation", { tokenId: GenericId<"pushTokens">; reason: string }, null>("notifications:disablePushToken");
const warrantyTarget = makeFunctionReference<"query", { applianceId: GenericId<"appliances"> }, any>("notifications:warrantyTarget");
const repairFollowUpTarget = makeFunctionReference<"query", { repairId: GenericId<"repairs"> }, any>("notifications:repairFollowUpTarget");

async function sendNotifications(ctx: any, tokens: { id: GenericId<"pushTokens">; token: string }[], notification: { title: string; body: string; data: Record<string, string> }) {
  if (!tokens.length) return;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = "Bearer " + process.env.EXPO_ACCESS_TOKEN;
  const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(tokens.map((item) => ({ to: item.token, ...notification, sound: "default", channelId: "reminders" }))) });
  if (!response.ok) throw new Error("Expo push service returned " + response.status);
  const payload = await response.json() as { data?: { details?: { error?: string } }[] };
  await Promise.all((payload.data ?? []).map((ticket, index) => ticket.details?.error === "DeviceNotRegistered" && tokens[index] ? ctx.runMutation(disablePushToken, { tokenId: tokens[index].id, reason: "DeviceNotRegistered" }) : Promise.resolve(null)));
}

export const sendMaintenanceReminder = internalActionGeneric({
  args: { taskId: v.id("maintenanceTasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(reminderTarget, args);
    if (!target?.tokens.length) return null;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = "Bearer " + process.env.EXPO_ACCESS_TOKEN;
    const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(target.tokens.map((item) => ({ to: item.token, title: "Maintenance reminder", body: target.appliance + ": " + target.title, sound: "default", channelId: "reminders", data: { type: "maintenance", taskId: target.taskId } }))) });
    if (!response.ok) throw new Error("Expo push service returned " + response.status);
    const payload = await response.json() as { data?: { status?: string; details?: { error?: string } }[] };
    await Promise.all((payload.data ?? []).map((ticket, index) => ticket.details?.error === "DeviceNotRegistered" && target.tokens[index] ? ctx.runMutation(disablePushToken, { tokenId: target.tokens[index].id, reason: "DeviceNotRegistered" }) : Promise.resolve(null)));
    return null;
  },
});

export const sendWarrantyReminder = internalActionGeneric({ args: { applianceId: v.id("appliances") }, returns: v.null(), handler: async (ctx, args) => { const target = await ctx.runQuery(warrantyTarget, args); if (target) await sendNotifications(ctx, target.tokens, { title: "Warranty reminder", body: `${target.title} warranty ends ${new Date(target.warrantyEndsAt).toLocaleDateString("en-US", { timeZone: "UTC" })}.`, data: { type: "warranty", applianceId: String(target.applianceId) } }); return null; } });

export const sendRepairFollowUp = internalActionGeneric({ args: { repairId: v.id("repairs") }, returns: v.null(), handler: async (ctx, args) => { const target = await ctx.runQuery(repairFollowUpTarget, args); if (target) await sendNotifications(ctx, target.tokens, { title: "Repair follow-up", body: "Is your repair still working as expected?", data: { type: "repair_follow_up", repairId: String(target.repairId) } }); return null; } });
