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
    /*
     * New submissions are a band string ("4 to 6", "Not sure yet") — that is
     * how the question is actually answered, and how the pricing works, since
     * one price covers four pages to nine. A number cannot hold "not sure".
     *
     * The union accepts numbers because leads captured before this changed
     * stored one, and rewriting historical records to fit a new form is worse
     * than reading both.
     */
    pageCount: v.optional(v.union(v.string(), v.number())),
    onePagePurpose: v.optional(v.string()),
    platforms: v.optional(v.string()),
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

    /**
     * A discount code they arrived with, as typed.
     *
     * Recorded, not applied. Validity is decided when the invoice is issued —
     * storing a resolved discount here would let a code that has since
     * expired or been exhausted still be honoured weeks later.
     */
    promoCode: v.optional(v.string()),

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
    /**
     * The client's own site. Shown as a link on their testimonial — it is
     * corroboration as much as courtesy: a quote you can click through and
     * check is worth more than one you cannot.
     */
    website: v.optional(v.string()),
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

  /**
   * Unsolicited feedback from the footer — separate from `feedback`, which is
   * a rating attached to a specific project by a client.
   *
   * Anyone can write here, so nothing in it is trusted: it is shown in the
   * admin as plain text and never rendered as markup anywhere public.
   */
  siteFeedback: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    /** Which page they were on. Context for a vague report. */
    path: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_read", ["read", "createdAt"]),

  /**
   * Custom payment links, kept after they are made.
   *
   * These were created in Stripe and then forgotten — the URL existed only in
   * the response that made it, so closing the tab lost it and there was no
   * record that money had been asked for at all. Stripe holds the truth about
   * payment; this holds what the link was for.
   */
  paymentLinks: defineTable({
    stripeId: v.string(),
    url: v.string(),
    label: v.string(),
    amount: v.number(),
    currency: v.string(),
    /** Who it was sent to, when known. Free text — often just a name. */
    forWhom: v.optional(v.string()),
    /** Set by the webhook when a payment against this link succeeds. */
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_stripe", ["stripeId"]),

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

    /**
     * What kind of post this is.
     *
     * Optional because every existing post predates it and is a text post —
     * a required field would invalidate all of them. Absent reads as "text".
     */
    kind: v.optional(
      v.union(v.literal("text"), v.literal("images"), v.literal("video")),
    ),

    /** Gallery, for an images post. Ordered as uploaded. */
    images: v.optional(v.array(v.string())),

    /**
     * How the gallery is framed. "auto" keeps each image's own shape.
     * Optional because posts written before galleries existed have none.
     */
    imageRatio: v.optional(
      v.union(
        v.literal("4:5"),
        v.literal("1:1"),
        v.literal("16:9"),
        v.literal("auto"),
      ),
    ),

    /**
     * A video post's source: either an uploaded MP4 or a YouTube/Vimeo URL.
     * Stored as given; the player decides how to render it.
     */
    videoUrl: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published", "publishedAt"]),

  /**
   * Reactions and comments on a post.
   *
   * Likes are one row per visitor per post, keyed by a client-generated id
   * rather than an account — asking someone to sign in to like a blog post is
   * how a blog post gets no likes. The id is not trusted for anything else.
   */
  postLikes: defineTable({
    postId: v.id("posts"),
    visitorId: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_visitor", ["postId", "visitorId"]),

  /**
   * Comments are held for approval by default. An open comment box on a site
   * that sells software is a spam target, and unmoderated spam under my own
   * writing costs more than the comments are worth.
   */
  postComments: defineTable({
    postId: v.id("posts"),
    name: v.string(),
    email: v.string(),
    body: v.string(),
    approved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId", "approved"])
    .index("by_approved", ["approved", "createdAt"]),

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

    /* Hosted rather than a PDF attachment: always current, and it can report
       when it was opened. A PDF emailed out is a snapshot that goes stale and
       tells you nothing. */
    token: v.optional(v.string()),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    understanding: v.optional(v.string()),
    scope: v.optional(v.string()),
    excluded: v.optional(v.string()),
    timeline: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    assumptions: v.optional(v.string()),
    /** Set on first open, never reset — so silence can be read correctly. */
    viewedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    changeRequest: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_token", ["token"])
    .index("by_lead", ["leadId"]),

  /**
   * Free site audits. The lead magnet.
   *
   * Queued rather than synchronous: PageSpeed takes 15-40 seconds on a cold
   * URL, which no serverless request should sit through.
   */
  audits: defineTable({
    url: v.string(),
    email: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    score: v.optional(v.number()),
    categories: v.optional(
      v.object({
        performance: v.optional(v.number()),
        accessibility: v.optional(v.number()),
        bestPractices: v.optional(v.number()),
        seo: v.optional(v.number()),
      }),
    ),
    fixes: v.optional(
      v.array(
        v.object({
          title: v.string(),
          detail: v.string(),
          impact: v.string(),
        }),
      ),
    ),

    /**
     * Everything Lighthouse actually flagged, not only the top three.
     *
     * The three fixes above stay: they are the ones ranked by time saved and
     * written in plain English, and they are what someone acts on. This is
     * the full list underneath, so the report is honest about scale rather
     * than implying three problems is all there is.
     */
    issues: v.optional(
      v.array(
        v.object({
          title: v.string(),
          detail: v.optional(v.string()),
          /** performance | accessibility | best-practices | seo */
          category: v.string(),
          /** 0-1 from Lighthouse. Lower is worse. */
          score: v.optional(v.number()),
          /** Estimated milliseconds saved, where Lighthouse gives one. */
          savingsMs: v.optional(v.number()),
        }),
      ),
    ),

    /**
     * The site's own identity, read from its metadata.
     *
     * A report that shows someone their own name and logo reads as being
     * about them. One that opens with a bare URL reads as a form response.
     */
    siteName: v.optional(v.string()),
    siteLogo: v.optional(v.string()),
    siteDescription: v.optional(v.string()),

    error: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

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
    /** "deposit" is the first 40%, "balance" the 60% on completion. */
    stage: v.union(v.literal("deposit"), v.literal("balance")),
    /*
     * Which plan this invoice is for.
     *
     * Drives wallet availability: Apple Pay and Google Pay are Enterprise
     * only. Stored rather than inferred from the amount, because a discounted
     * Enterprise deposit can land below a full-price web app and the payment
     * methods offered must not depend on a coincidence of figures.
     *
     * Optional: invoices raised before this field existed have no tier, and
     * those correctly fall through to card and Link.
     */
    tier: v.optional(v.string()),
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
   * Waitlist.
   *
   * Two build slots and two care plans at a time — a real constraint, not a
   * scarcity tactic, so capacity is DERIVED from live work rather than a flag
   * I have to remember to flip. A toggle goes stale the moment a project
   * finishes at 11pm.
   *
   * Each entry picks a start month. Months are offered rather than exact days
   * because a build start is a week, not an appointment, and promising a
   * specific Tuesday six weeks out is a promise you cannot keep.
   */
  waitlist: defineTable({
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    projectType: v.optional(v.string()),
    note: v.optional(v.string()),
    kind: v.union(v.literal("build"), v.literal("care")),
    /** First day of the chosen month, UTC. */
    slotMonth: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("offered"),
      v.literal("converted"),
      v.literal("declined"),
      v.literal("expired"),
    ),
    /** Set when a slot is offered, so an unanswered offer can lapse. */
    offeredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_month", ["slotMonth"])
    .index("by_email", ["email"]),

  /**
   * Client portal.
   *
   * projectIds is the ONLY thing that decides what a client can see. Every
   * portal query derives it from the authenticated session and filters by it —
   * a project id from the URL is never trusted, because changing one in the
   * address bar is the first thing anyone tries.
   */
  /**
   * Work done FOR a client.
   *
   * Deliberately separate from the `projects` table, which is the public
   * portfolio. They look similar and are not the same thing: a portfolio piece
   * is marketing I control, and a client project is a live engagement with
   * milestones, files and money attached. Reusing one table for both meant the
   * "assign projects" picker offered my own case studies, which is nonsense.
   */
  clientProjects: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("review"),
      v.literal("complete"),
      v.literal("on_hold"),
    ),
    startedAt: v.optional(v.number()),
    targetLaunch: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_client", ["clientId"]),

  clients: defineTable({
    email: v.string(),
    name: v.string(),
    company: v.optional(v.string()),
    /**
     * Legacy: portfolio ids assigned before clientProjects existed. Optional
     * so existing rows validate; nothing writes it any more. Access is
     * derived from clientProjects.by_client.
     */
    projectIds: v.optional(v.array(v.id("projects"))),
    /** Set once they first sign in through a magic link. */
    userId: v.optional(v.id("users")),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  milestones: defineTable({
    projectId: v.id("clientProjects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    order: v.number(),
    dueAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_project", ["projectId", "order"]),

  deliverables: defineTable({
    projectId: v.id("clientProjects"),
    name: v.string(),
    url: v.string(),
    version: v.number(),
    uploadedAt: v.number(),
    approvedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  portalMessages: defineTable({
    projectId: v.id("clientProjects"),
    authorType: v.union(v.literal("client"), v.literal("admin")),
    authorName: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_project", ["projectId", "createdAt"]),

  /**
   * Promotions.
   *
   * Status is DERIVED on every read from the window, the pause flag and the
   * redemption count — never stored. A stored status goes stale the moment a
   * window closes, and a promo that expires "whenever a cron next runs" is a
   * promo that honours a discount it should not.
   */
  promos: defineTable({
    name: v.string(),
    kind: v.union(v.literal("automatic"), v.literal("code")),
    /** Uppercase. Null for automatic promos. */
    code: v.optional(v.string()),
    discountType: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("override"),
    ),
    discountValue: v.number(),
    /** Empty means every tier. */
    appliesTo: v.array(v.string()),
    startsAt: v.number(),
    /** Null for open-ended. */
    endsAt: v.optional(v.number()),
    maxRedemptions: v.optional(v.number()),
    redemptionCount: v.number(),
    paused: v.boolean(),
    bannerText: v.optional(v.string()),
    showCountdown: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_kind", ["kind"])
    // Referral claims look a promo up by name to stay idempotent. Without
    // this they scanned every code promo on each lookup, and referrals are
    // the one kind of promo whose row count grows with traffic.
    .index("by_name", ["name"]),

  /**
   * Written when an invoice is ISSUED, not when a code is entered. Counting at
   * entry lets someone exhaust a limited promo without ever becoming a client.
   */
  promoRedemptions: defineTable({
    promoId: v.id("promos"),
    leadId: v.optional(v.id("leads")),
    invoiceId: v.optional(v.id("invoices")),
    email: v.string(),
    tier: v.optional(v.string()),
    originalPrice: v.number(),
    discountedPrice: v.number(),
    redeemedAt: v.number(),
  })
    .index("by_promo", ["promoId"])
    .index("by_email", ["email"]),

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
