import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Convex schema.
 *
 * `authTables` provides the tables @convex-dev/auth needs (users, sessions,
 * accounts, verification codes). Everything below is application data.
 */
export default defineSchema({
  ...authTables,

  // Marketing contact / enquiry submissions.
  leads: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Stripe subscription state, mirrored from webhook events.
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    priceId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),
});
