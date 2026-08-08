/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as analyticsRollup from "../analyticsRollup.js";
import type * as audits from "../audits.js";
import type * as auth from "../auth.js";
import type * as automation from "../automation.js";
import type * as broadcasts from "../broadcasts.js";
import type * as capacity from "../capacity.js";
import type * as chat from "../chat.js";
import type * as cleanup from "../cleanup.js";
import type * as credentials from "../credentials.js";
import type * as credentialsNode from "../credentialsNode.js";
import type * as crons from "../crons.js";
import type * as engagement from "../engagement.js";
import type * as events from "../events.js";
import type * as express from "../express.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as intakeSections from "../intakeSections.js";
import type * as invoices from "../invoices.js";
import type * as kb from "../kb.js";
import type * as leads from "../leads.js";
import type * as lib_analyticsBuckets from "../lib/analyticsBuckets.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_token from "../lib/token.js";
import type * as lib_url from "../lib/url.js";
import type * as maintenance from "../maintenance.js";
import type * as monitoring from "../monitoring.js";
import type * as monitoringNode from "../monitoringNode.js";
import type * as notify from "../notify.js";
import type * as paymentLinks from "../paymentLinks.js";
import type * as portal from "../portal.js";
import type * as posts from "../posts.js";
import type * as projects from "../projects.js";
import type * as promos from "../promos.js";
import type * as proposals from "../proposals.js";
import type * as referrals from "../referrals.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as siteFeedback from "../siteFeedback.js";
import type * as subscribers from "../subscribers.js";
import type * as testimonials from "../testimonials.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  analyticsRollup: typeof analyticsRollup;
  audits: typeof audits;
  auth: typeof auth;
  automation: typeof automation;
  broadcasts: typeof broadcasts;
  capacity: typeof capacity;
  chat: typeof chat;
  cleanup: typeof cleanup;
  credentials: typeof credentials;
  credentialsNode: typeof credentialsNode;
  crons: typeof crons;
  engagement: typeof engagement;
  events: typeof events;
  express: typeof express;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  intake: typeof intake;
  intakeSections: typeof intakeSections;
  invoices: typeof invoices;
  kb: typeof kb;
  leads: typeof leads;
  "lib/analyticsBuckets": typeof lib_analyticsBuckets;
  "lib/auth": typeof lib_auth;
  "lib/token": typeof lib_token;
  "lib/url": typeof lib_url;
  maintenance: typeof maintenance;
  monitoring: typeof monitoring;
  monitoringNode: typeof monitoringNode;
  notify: typeof notify;
  paymentLinks: typeof paymentLinks;
  portal: typeof portal;
  posts: typeof posts;
  projects: typeof projects;
  promos: typeof promos;
  proposals: typeof proposals;
  referrals: typeof referrals;
  seed: typeof seed;
  settings: typeof settings;
  siteFeedback: typeof siteFeedback;
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
