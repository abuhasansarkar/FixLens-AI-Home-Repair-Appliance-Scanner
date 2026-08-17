import type { GenericId } from "convex/values";

export async function consumeUserRateLimit(ctx:any,input:{ownerId:GenericId<"users">;name:string;limit:number;windowMs:number}){
  const now=Date.now();const safeLimit=Number.isInteger(input.limit)&&input.limit>0?input.limit:1;const key=`${input.ownerId}:${input.name}`;
  const row=await ctx.db.query("rateLimits").withIndex("by_key",(q:any)=>q.eq("key",key)).unique();
  if(!row){await ctx.db.insert("rateLimits",{ownerId:input.ownerId,key,windowStart:now,count:1,createdAt:now,updatedAt:now});return;}
  if(row.windowStart+input.windowMs<=now){await ctx.db.patch(row._id,{windowStart:now,count:1,updatedAt:now});return;}
  if(row.count>=safeLimit)throw new Error("Too many requests. Please wait and try again.");
  await ctx.db.patch(row._id,{count:row.count+1,updatedAt:now});
}
