import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Convex schema.
 *
 * `authTables` supplies the tables @convex-dev/auth needs (users, sessions,
 * accounts, verification codes). Everything below is application data.
 *
 * Indexes: one per access pattern, fields listed in query order.
 */
export const leadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("proposal"),
  v.literal("won"),
  v.literal("lost"),
);

export const proposalStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("security_review"),
  v.literal("procurement"),
  v.literal("signed"),
  v.literal("lost"),
);

export const publishStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

/** Behavioural signals captured by SlideToConfirm; used for bot scoring. */
export const slideSignals = v.object({
  durationMs: v.number(),
  pointerSamples: v.number(),
  peakVelocity: v.number(),
  usedKeyboard: v.boolean(),
});

export default defineSchema({
  ...authTables,

  leads: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    /** Preferred way to be reached: email, phone, whatsapp. */
    contactPreference: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    projectType: v.optional(v.string()),
    /** Free text: what the project is actually for. */
    projectPurpose: v.optional(v.string()),
    /** Who it serves — the audience behind the purpose. */
    audience: v.optional(v.string()),
    /** Where they are now: nothing yet, a rebuild, a live product. */
    currentState: v.optional(v.string()),
    existingUrl: v.optional(v.string()),
    tier: v.optional(v.string()),
    budget: v.optional(v.string()),
    timeline: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    message: v.optional(v.string()),

    /* Enterprise path only. These are the questions that decide whether a
       large engagement is real, so they are asked instead of budget rather
       than in addition to it. */
    procurementProcess: v.optional(v.string()),
    ndaRequired: v.optional(v.boolean()),
    targetLaunch: v.optional(v.string()),
    decisionMakers: v.optional(v.string()),

    /* Support path only. */
    supportScope: v.optional(v.string()),

    /** Private admin notes. Append-only, timestamped. Never shown publicly. */
    notes: v.optional(v.string()),
    score: v.optional(v.number()),
    status: leadStatus,
    source: v.optional(v.string()),
    currency: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    crNumber: v.optional(v.string()),
    entityType: v.optional(v.string()),
    turnstileVerified: v.boolean(),
    slideSignals: v.optional(slideSignals),
  })
    // Convex appends _creationTime to every index automatically, so both of
    // these are already ordered by recency within their key. A separate
    // "by_created" index would be byte-identical to by_status, so recency
    // listing uses the table's default order instead.
    .index("by_status", ["status"])
    .index("by_tier", ["tier"]),

  projects: defineTable({
    title: v.string(),
    slug: v.string(),
    client: v.string(),
    year: v.number(),
    category: v.string(),
    coverUrl: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    summary: v.string(),
    problem: v.optional(v.string()),
    process: v.optional(v.string()),
    result: v.optional(v.string()),
    metrics: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.number(),
          suffix: v.optional(v.string()),
          decimals: v.optional(v.number()),
        }),
      ),
    ),
    techStack: v.optional(v.array(v.string())),
    liveUrl: v.optional(v.string()),
    status: publishStatus,
    order: v.number(),
    featured: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status", "order"])
    .index("by_featured", ["featured", "status", "order"]),

  testimonials: defineTable({
    author: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    quote: v.string(),
    avatarUrl: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    featured: v.boolean(),
    order: v.number(),
    /**
     * Client-submitted testimonials land unapproved and never auto-publish.
     * Optional so existing rows — all of which I wrote — stay valid; absent is
     * treated as approved.
     */
    approved: v.optional(v.boolean()),
    /** Token for the "leave a testimonial" link sent after a project ends. */
    requestToken: v.optional(v.string()),
  })
    .index("by_featured", ["featured", "order"])
    .index("by_token", ["requestToken"]),

  feedback: defineTable({
    projectId: v.id("projects"),
    rating: v.number(),
    comment: v.optional(v.string()),
    from: v.optional(v.string()),
    resolved: v.boolean(),
  }).index("by_project", ["projectId", "resolved"]),

  events: defineTable({
    type: v.string(),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    ts: v.number(),
    meta: v.optional(v.any()),
  }).index("by_type_ts", ["type", "ts"]),

  broadcasts: defineTable({
    subject: v.string(),
    audienceId: v.optional(v.string()),
    status: v.string(),
    resendId: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    openRate: v.optional(v.number()),
    clickRate: v.optional(v.number()),
    recipientCount: v.optional(v.number()),
  }).index("by_status", ["status"]),

  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    body: v.string(),
    excerpt: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    published: v.boolean(),
    publishedAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    readingTime: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published", "publishedAt"]),

  kb: defineTable({
    question: v.string(),
    answer: v.string(),
    tags: v.array(v.string()),
    priority: v.number(),
  })
    // Convex cannot index into an array, so the tag index is on the first
    // tag plus priority; broader tag search uses a filtered scan.
    .index("by_tag", ["tags", "priority"]),

  proposals: defineTable({
    leadId: v.id("leads"),
    tier: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: proposalStatus,
    sentAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  subscribers: defineTable({
    email: v.string(),
    source: v.string(),
    confirmed: v.boolean(),
    createdAt: v.number(),
    unsubscribedAt: v.optional(v.number()),
    /**
     * Unguessable token behind both the confirm and unsubscribe links. Signing
     * someone else up should never be able to confirm them, and an unsubscribe
     * link that takes a plain email address lets anyone unsubscribe anyone.
     */
    token: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  /**
   * Every send, recorded. Without this there is no way to answer "did they
   * actually get the confirmation" when someone says they never received it,
   * and no way to stop a retry from sending twice.
   */
  emailLog: defineTable({
    to: v.string(),
    template: v.string(),
    subject: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    sentAt: v.number(),
  })
    .index("by_to", ["to"])
    .index("by_template", ["template"]),

  invoices: defineTable({
    leadId: v.optional(v.id("leads")),
    projectId: v.optional(v.id("projects")),
    clientName: v.string(),
    clientEmail: v.string(),
    description: v.string(),
    /** Full project value. The two instalments are derived from this. */
    amount: v.number(),
    currency: v.string(),
    vatAmount: v.optional(v.number()),
    /** "deposit" is the first 50%, "balance" the second on completion. */
    stage: v.union(v.literal("deposit"), v.literal("balance")),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("void"),
    ),
    /**
     * Unguessable token in the invoice URL. Bank details are never on a public
     * route — this is the only way to reach them, and the link is emailed
     * rather than published.
     */
    token: v.string(),
    reference: v.string(),
    dueDate: v.optional(v.number()),
    issuedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    /**
     * Vestigial. Bank transfer used this to record that a client said they had
     * sent the money; Stripe's webhook now owns payment state, so nothing
     * writes it. Kept optional for one deploy so existing rows still validate.
     */
    markedSentAt: v.optional(v.number()),

    /* Stripe. All optional: an invoice exists in Convex first and is mirrored
       to Stripe when it is issued, so these are unset on a draft. */
    stripeInvoiceId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    /** Hosted invoice URL — where the client actually pays. */
    stripeHostedUrl: v.optional(v.string()),
    stripePdfUrl: v.optional(v.string()),
    paymentMethodUsed: v.optional(
      v.union(
        v.literal("card"),
        v.literal("apple_pay"),
        v.literal("google_pay"),
        v.literal("link"),
      ),
    ),
    amountReceived: v.optional(v.number()),
    /**
     * Stripe's cut and what actually landed. Gross without net is a number
     * that feels like revenue and is not.
     */
    stripeFee: v.optional(v.number()),
    netReceived: v.optional(v.number()),
    /** Plain-English reason from Stripe when a charge is declined. */
    declineReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_token", ["token"])
    .index("by_lead", ["leadId"])
    // The webhook's hot path: every event arrives keyed by Stripe's id.
    .index("by_stripe_invoice", ["stripeInvoiceId"]),

  /**
   * Every Stripe event we have already processed.
   *
   * Stripe retries deliveries, and without this a retried refund or payment
   * would be applied twice. A duplicate payment record is worse than a missing
   * one, because it silently corrupts the revenue figures.
   */
  webhookEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    receivedAt: v.number(),
  }).index("by_event", ["stripeEventId"]),

  /**
   * Chat rate limiting.
   *
   * This has to live in Convex rather than the route handler: serverless
   * instances share no memory, so an in-process counter resets on every cold
   * start and rate-limits nothing. A Convex mutation is a serialisable
   * transaction with automatic retry on conflict, so two simultaneous requests
   * for the same key genuinely serialise — which is the property an in-memory
   * limiter cannot offer.
   */
  chatLimits: defineTable({
    kind: v.union(v.literal("session"), v.literal("ip")),
    /** Session id, or a salted hash of the IP — never a raw address. */
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_kind_key", ["kind", "key"]),

  /**
   * Key/value settings the site reads at runtime.
   *
   * Never secrets — those stay in environment variables, where a forgotten
   * auth check on a query cannot expose them.
   */
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  /** Every turn, for review. Lets me see what people actually ask. */
  chatMessages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    ts: v.number(),
  }).index("by_session", ["sessionId", "ts"]),
});
