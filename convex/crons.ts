import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();
crons.interval("clean expired diagnosis uploads", { hours: 1 }, makeFunctionReference<"mutation", Record<string, never>, number>("diagnoses:cleanupExpiredSessions"), {});
crons.interval("clean expired assistant photos", { hours: 1 }, makeFunctionReference<"mutation", Record<string, never>, number>("assistant:cleanupExpiredAttachments"), {});
export default crons;
