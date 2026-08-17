import type { GenericMutationCtx, GenericQueryCtx, GenericDataModel } from "convex/server";
export class AuthenticationError extends Error { constructor(){super("Authentication required");this.name="AuthenticationError";} }
export async function requireIdentity(ctx:GenericQueryCtx<GenericDataModel>|GenericMutationCtx<GenericDataModel>){const identity=await ctx.auth.getUserIdentity();if(!identity?.subject)throw new AuthenticationError();return identity;}
export async function currentUserOrNull(ctx:GenericQueryCtx<GenericDataModel>|GenericMutationCtx<GenericDataModel>){const identity=await ctx.auth.getUserIdentity();if(!identity?.subject)return null;return ctx.db.query("users").withIndex("by_clerk_id",(q:any)=>q.eq("clerkId",identity.subject)).unique();}
export async function requireUser(ctx:GenericQueryCtx<GenericDataModel>|GenericMutationCtx<GenericDataModel>){const user=await currentUserOrNull(ctx);if(!user)throw new AuthenticationError();return user;}
export function requireOwned<T extends {ownerId:unknown}>(document:T|null,ownerId:unknown):T{if(!document||document.ownerId!==ownerId)throw new Error("Resource not found");return document;}
