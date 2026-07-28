/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as broadcasts from "../broadcasts.js";
import type * as events from "../events.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as kb from "../kb.js";
import type * as leads from "../leads.js";
import type * as lib_auth from "../lib/auth.js";
import type * as posts from "../posts.js";
import type * as projects from "../projects.js";
import type * as proposals from "../proposals.js";
import type * as seed from "../seed.js";
import type * as subscribers from "../subscribers.js";
import type * as testimonials from "../testimonials.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  broadcasts: typeof broadcasts;
  events: typeof events;
  feedback: typeof feedback;
  http: typeof http;
  invoices: typeof invoices;
  kb: typeof kb;
  leads: typeof leads;
  "lib/auth": typeof lib_auth;
  posts: typeof posts;
  projects: typeof projects;
  proposals: typeof proposals;
  seed: typeof seed;
  subscribers: typeof subscribers;
  testimonials: typeof testimonials;
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
