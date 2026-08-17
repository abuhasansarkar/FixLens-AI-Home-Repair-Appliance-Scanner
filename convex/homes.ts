import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOwned, requireUser } from "./lib/auth";

function cleanName(value: string) {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error("Name must be between 1 and 80 characters");
  return name;
}

export const current = queryGeneric({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const home = await ctx.db.query("homes").withIndex("by_owner_default", (q: any) => q.eq("ownerId", user._id).eq("isDefault", true)).unique();
    if (!home) return null;
    const [rooms, appliances] = await Promise.all([
      ctx.db.query("rooms").withIndex("by_home", (q: any) => q.eq("homeId", home._id)).collect(),
      ctx.db.query("appliances").withIndex("by_home", (q: any) => q.eq("homeId", home._id)).collect(),
    ]);
    return {
      id: home._id,
      name: home.name,
      rooms: rooms.sort((a: any, b: any) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)).map((room: any) => ({
        id: room._id,
        name: room.name,
        applianceCount: appliances.filter((appliance: any) => appliance.roomId === room._id).length,
      })),
    };
  },
});

export const rename = mutationGeneric({
  args: { homeId: v.id("homes"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const home = requireOwned(await ctx.db.get(args.homeId), user._id);
    await ctx.db.patch(home._id, { name: cleanName(args.name), updatedAt: Date.now() });
    return null;
  },
});

export const addRoom = mutationGeneric({
  args: { homeId: v.id("homes"), name: v.string() },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const home = requireOwned(await ctx.db.get(args.homeId), user._id);
    const name = cleanName(args.name);
    const rooms = await ctx.db.query("rooms").withIndex("by_home", (q: any) => q.eq("homeId", home._id)).collect();
    if (rooms.some((room: any) => room.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That room already exists");
    const now = Date.now();
    return ctx.db.insert("rooms", { ownerId: user._id, homeId: home._id, name, sortOrder: rooms.length, createdAt: now, updatedAt: now });
  },
});

export const renameRoom = mutationGeneric({
  args: { roomId: v.id("rooms"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const room = requireOwned(await ctx.db.get(args.roomId), user._id);
    const name = cleanName(args.name);
    const rooms = await ctx.db.query("rooms").withIndex("by_home", (q: any) => q.eq("homeId", room.homeId)).collect();
    if (rooms.some((candidate: any) => candidate._id !== room._id && candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("That room already exists");
    await ctx.db.patch(room._id, { name, updatedAt: Date.now() });
    return null;
  },
});

export const removeRoom = mutationGeneric({
  args: { roomId: v.id("rooms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const room = requireOwned(await ctx.db.get(args.roomId), user._id);
    const appliances = await ctx.db.query("appliances").withIndex("by_room", (q: any) => q.eq("roomId", room._id)).collect();
    if (appliances.length) throw new Error("Move or delete the appliances in this room first");
    await ctx.db.delete(room._id);
    return null;
  },
});
