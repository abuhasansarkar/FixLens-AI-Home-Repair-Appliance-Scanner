/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_openai from "../ai/openai.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_schemas from "../ai/schemas.js";
import type * as aiActions from "../aiActions.js";
import type * as aiUsage from "../aiUsage.js";
import type * as appliances from "../appliances.js";
import type * as assistant from "../assistant.js";
import type * as crons from "../crons.js";
import type * as deletion from "../deletion.js";
import type * as diagnoses from "../diagnoses.js";
import type * as documents from "../documents.js";
import type * as homes from "../homes.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_safety from "../lib/safety.js";
import type * as notificationActions from "../notificationActions.js";
import type * as notifications from "../notifications.js";
import type * as repairs from "../repairs.js";
import type * as subscriptions from "../subscriptions.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/openai": typeof ai_openai;
  "ai/prompts": typeof ai_prompts;
  "ai/schemas": typeof ai_schemas;
  aiActions: typeof aiActions;
  aiUsage: typeof aiUsage;
  appliances: typeof appliances;
  assistant: typeof assistant;
  crons: typeof crons;
  deletion: typeof deletion;
  diagnoses: typeof diagnoses;
  documents: typeof documents;
  homes: typeof homes;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/entitlements": typeof lib_entitlements;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/safety": typeof lib_safety;
  notificationActions: typeof notificationActions;
  notifications: typeof notifications;
  repairs: typeof repairs;
  subscriptions: typeof subscriptions;
  usage: typeof usage;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
