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

/**
 * `accepted` and `signed` are different events and always were.
 *
 * Accepting a hosted proposal used to write "signed", which was a lie the
 * proposal page itself contradicted two lines above the button: "Accepting is
 * not a signature — I'll send the contract next." Now that a contract really
 * is sent, the two states have to be told apart — "accepted" means the client
 * said yes, "signed" means a contract carrying their signature exists.
 *
 * The old literal stays in the union so pre-migration rows keep validating.
 */
export const proposalStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("security_review"),
  v.literal("procurement"),
  v.literal("accepted"),
  v.literal("signed"),
  v.literal("lost"),
);

export const contractStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("signed"),
  v.literal("declined"),
  v.literal("expired"),
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
    /**
     * Plan id from the chooser (see src/lib/inquiry.ts).
     *
     * The value signal, now that no budget band is collected: every plan has a
     * published price, so the plan someone picks is what the work costs rather
     * than what they guessed they might spend. Optional because leads captured
     * before the chooser existed have only the free-text projectType.
     */
    plan: v.optional(v.string()),
    /** Free text: what the project is actually for. */
    projectPurpose: v.optional(v.string()),
    /** Who it serves — the audience behind the purpose. */
    audience: v.optional(v.string()),
    /** Where they are now: nothing yet, a rebuild, a live product. */
    currentState: v.optional(v.string()),
    existingUrl: v.optional(v.string()),
    tier: v.optional(v.string()),
    /**
     * DEAD — no longer collected. The form asked for a budget band, which was
     * asking people to guess at a number the pricing page had already told
     * them. `plan` replaced it as the value signal.
     *
     * The column stays so leads captured while the question existed still
     * validate and still display; nothing writes it any more.
     */
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

    /* Support path only. A care plan is a fixed monthly price against
       unknown work, so these decide whether it can be taken on at all. */
    supportScope: v.optional(v.string()),
    /** Required in the form: no care plan for a site nobody can look at. */
    supportUrl: v.optional(v.string()),
    supportIssues: v.optional(v.string()),
    supportStack: v.optional(v.string()),
    /**
     * Preferred stack for a NEW build, where supportStack describes an
     * existing one. Two columns rather than one, because "what it is built
     * with" and "what you would like it built with" are different facts and
     * collapsing them loses which was meant.
     */
    preferredStack: v.optional(v.string()),
    /** Whether they can actually hand over the logins. A go/no-go. */
    supportAccess: v.optional(v.string()),

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
    .index("by_tier", ["tier"])
    // Approving a request looks its sender up here, so the client record
    // inherits the enquiry rather than being a retyped copy of it.
    .index("by_email", ["email"]),

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

  /**
   * Every incoming request, whatever the plan.
   *
   * Named expressBuilds because express came first; it is now the single
   * inbox. One table rather than two because a request is a request — the
   * decision I make on it (read the brief, accept or decline) is identical
   * whether it is a two-hour express job or a six-week app, and splitting
   * them meant two lists to check and two places to forget.
   *
   * `plan` is what differs: express runs a two-hour clock, everything else
   * counts down to a delivery date agreed at approval.
   *
   * The order money and work move in:
   *
   *   pending_approval → I read it → approve or decline
   *   approve → client + project + portal created, link emailed, payment opens
   *   payment → clock starts, status building
   *   deliver → balance settled, or waived if I was late
   *
   * The clock starts on PAYMENT, not on approval: an approved request sitting
   * unopened in an inbox must not burn the window. They pay 50% to start; if
   * I deliver inside the window they owe the rest, if I miss it they keep it.
   * That promise is why acceptedAt and deliveredAt are stored rather than
   * derived — a rule that decides who keeps money must not be recomputable.
   */
  expressBuilds: defineTable({
    name: v.string(),
    email: v.string(),
    /** Their organisation, when the form collected one. */
    company: v.optional(v.string()),
    /** What they want. Free text — two pages does not need a form. */
    brief: v.string(),
    pages: v.number(),

    /*
     * Links to the records this request became.
     *
     * Written on approval, never by hand. Before these existed, accepting a
     * request meant retyping the client's name, email and company into a
     * separate dialog — the same details they had already submitted — which
     * is both wasted work and a chance to typo the address their portal link
     * gets sent to.
     */
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("clientProjects")),

    status: v.union(
      /** New. Waiting on me to read it — the only state that needs a human. */
      v.literal("pending_approval"),
      /** Approved by me; they have the link and can now pay. */
      v.literal("awaiting_payment"),
      /**
       * Paid, waiting for me to check it over and start the clock.
       *
       * Money arriving does not start a two-hour promise: a card can clear at
       * 3am, or against a brief still missing the copy it needs. This is the
       * gap where I look before the deadline is mine.
       */
      v.literal("paid_review"),
      /** Paid. For express the clock is already running. */
      v.literal("queued"),
      v.literal("building"),
      v.literal("delivered"),
      v.literal("cancelled"),
      /** I read the brief and turned it down. */
      v.literal("declined"),
      /** Approved but never paid for. Aged out by cron, not by me. */
      v.literal("expired"),
    ),

    /**
     * Which plan this is. Express runs a two-hour countdown; everything else
     * counts down to a delivery date agreed up front. Optional because rows
     * created before the portal was generalised are all express.
     */
    plan: v.optional(v.string()),

    /**
     * The agreed delivery date for non-express plans.
     *
     * Separate from dueAt, which is derived from the express window. This one
     * I set by hand when approving, because "we agreed Friday" is not
     * something a formula can produce.
     */
    deliveryDate: v.optional(v.number()),

    approvedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    /**
     * Why I turned it down, in my words. Optional because sometimes there is
     * nothing useful to add beyond "not this one" — but when there is, it
     * goes in the decline email AND stays on the portal, so deleting the
     * email does not lose the reason.
     */
    declineNote: v.optional(v.string()),
    /** Set when the portal link actually went out, so it is not sent twice. */
    portalEmailSentAt: v.optional(v.number()),
    /**
     * Set when the decline email went out. Separate from portalEmailSentAt
     * because they are different emails on mutually exclusive paths, and one
     * stamp for both would let a declined build look like it had already been
     * sent a portal link.
     */
    decisionEmailSentAt: v.optional(v.number()),

    /*
     * Stamps for the scheduled jobs.
     *
     * Each one is the record that a job has already acted on this row. Crons
     * run on a timer with no memory, so without these a five-minute sweep
     * emails the same client every five minutes forever. The stamp is written
     * in the SAME mutation as the effect it guards, so a job that dies partway
     * cannot leave the effect applied and the stamp unset.
     */
    /** Set when I waived the deposit rather than collecting it. */
    paymentSkipped: v.optional(v.boolean()),
    /** A new request I have not been told about yet. */
    newNotifiedAt: v.optional(v.number()),
    /** A payment landed and I have not been told yet. */
    paidNotifiedAt: v.optional(v.number()),
    /** Unread client messages I have not been notified about. */
    messageNotifiedAt: v.optional(v.number()),
    /** The end-of-project testimonial invitation. */
    testimonialToken: v.optional(v.string()),
    testimonialAskedAt: v.optional(v.number()),

    /** Deposit-chase reminder is due. */
    reminderSentAt: v.optional(v.number()),
    /** Aged out unpaid. */
    expiredAt: v.optional(v.number()),
    /** The overdue sweep has waived the balance. */
    overdueHandledAt: v.optional(v.number()),
    /** The balance invoice has been claimed by the sweep. */
    invoiceIssuedAt: v.optional(v.number()),
    /**
     * The invoice row itself, once raised.
     *
     * Separate from the stamp above because they answer different questions:
     * the stamp says a sweep has taken responsibility for this row, the id
     * says an invoice actually exists. Without the split, a Stripe call that
     * failed would look identical to one that worked.
     */
    invoiceId: v.optional(v.id("invoices")),

    /*
     * Deciding an email is due and actually sending it are two steps, so they
     * are two stamps. The sweep above sets the first inside a transaction it
     * can guarantee; the send happens later, over the network, and can fail.
     * One stamp for both would mark a client as told when Resend was down.
     */
    overdueEmailSentAt: v.optional(v.number()),
    reminderEmailSentAt: v.optional(v.number()),
    expiredEmailSentAt: v.optional(v.number()),

    /** Where the work-in-progress can be seen. Posted by me, live for them. */
    previewUrl: v.optional(v.string()),

    /** Half up front, in minor units. The balance is only owed if I am on time. */
    depositAmount: v.number(),
    balanceAmount: v.number(),
    currency: v.string(),
    depositPaidAt: v.optional(v.number()),
    balancePaidAt: v.optional(v.number()),
    /** True once the window is missed. The balance is written off. */
    balanceWaived: v.optional(v.boolean()),

    /** The clock. Both stored, never derived — this decides who owes what. */
    acceptedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    /** acceptedAt + the window, so the portal counts down to a fixed instant. */
    dueAt: v.optional(v.number()),

    /** Where the finished site lives. */
    deliveredUrl: v.optional(v.string()),

    stripeSessionId: v.optional(v.string()),
    /**
     * Marked paid by hand rather than by Stripe — a transfer, cash, a
     * dropped webhook, or a test run. Recorded because an unmarked manual
     * payment is indistinguishable from one that actually cleared, and that
     * difference matters when reconciling.
     */
    manualPayment: v.optional(v.boolean()),
    manualNote: v.optional(v.string()),
    /** Their own key for the portal, so no account is needed. */
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_status", ["status", "createdAt"])
    .index("by_email", ["email"]),

  /**
   * Chat inside a build's portal.
   *
   * Deliberately NOT the existing portalMessages table, which hangs off
   * clientProjects and therefore off a `clients` row and a signed-in user.
   * A build portal is reached by token alone — there is no account, and
   * requiring someone to register before asking "can the logo be bigger?" is
   * how a quick question turns into an email instead.
   */
  buildMessages: defineTable({
    buildId: v.id("expressBuilds"),
    /** Who wrote it. The client has no identity here beyond their token. */
    fromClient: v.boolean(),
    body: v.string(),
    createdAt: v.number(),
    /** Set when the other side has seen it, for the unread count. */
    readAt: v.optional(v.number()),
  }).index("by_build", ["buildId", "createdAt"]),

  /**
   * First-party analytics.
   *
   * No third-party script, no advertising identifier and no cookie, which is
   * what lets the site run without a consent banner.
   *
   * `visitorId` is a random id in the visitor's own localStorage. It is not
   * derived from anything about them, it is not readable by any other site,
   * and it identifies a browser rather than a person. It exists so "returning
   * visitor" and "days from first visit to enquiry" are answerable at all —
   * sessionId dies with the tab and cannot answer either.
   */
  events: defineTable({
    type: v.string(),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    /** Stable per browser. See the note above on why this is not PII. */
    visitorId: v.optional(v.string()),
    ts: v.number(),
    /** Hostname only — never the full referring URL, which can carry a query. */
    referrer: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    /** desktop | mobile | tablet, derived client-side from the viewport. */
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    /** Which breakpoints actually matter, rather than which ones I guessed. */
    viewportW: v.optional(v.number()),
    country: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index("by_type_ts", ["type", "ts"])
    .index("by_session", ["sessionId"])
    .index("by_visitor", ["visitorId"]),

  /**
   * Pre-rolled daily analytics.
   *
   * Charts read this; only today reads raw events. Without it the analytics
   * page re-scans a growing table on every load and gets slower every week
   * until it times out — and the existing summary already caps each read at
   * 5000 rows, which silently drops data rather than slowing down.
   *
   * One row per date/metric/dimension, so a twelve-month chart is a few
   * hundred rows rather than a few hundred thousand events.
   */
  analyticsDaily: defineTable({
    /** YYYY-MM-DD, UTC. */
    date: v.string(),
    /** pageview, session, lead, cta … */
    metric: v.string(),
    /** The breakdown within the metric: a path, a referrer, a device. */
    dimension: v.optional(v.string()),
    value: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_metric_date", ["metric", "date"]),

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
    /** Optional — a comment does not require one. Kept when volunteered. */
    email: v.optional(v.string()),
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
    /* Carried into the contract. Per-project rather than a global default,
       because "a five-page marketing site" and "the domain" are the two
       things a client checks first and they differ every time. */
    siteType: v.optional(v.string()),
    domain: v.optional(v.string()),
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
    /*
     * What this invoice was raised for.
     *
     * Optional because invoices predate contracts and admin-raised ones still
     * have neither. But when a signature is what caused the invoice to exist,
     * the trail has to join up — "why does this client owe me money" should be
     * answerable from the row, not from memory.
     */
    proposalId: v.optional(v.id("proposals")),
    contractId: v.optional(v.id("contracts")),
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
     * Which plan this invoice is for. Reporting and revenue-by-tier.
     *
     * It NO LONGER drives wallet availability. That rule — Apple Pay and
     * Google Pay for Enterprise only — was backwards: a large enterprise
     * invoice goes through procurement and is never paid by phone, while a
     * small deposit is exactly the payment a wallet is for. Wallets are now
     * offered on every tier; see the `wallets` hash in PayPanel.
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
    kind: v.union(
      v.literal("session"),
      v.literal("ip"),
      // Contract signing and share-code issuance reuse this limiter rather
      // than growing a second one — the transaction argument above applies
      // identically, and two limiters would drift.
      v.literal("share"),
      v.literal("sign"),
    ),
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
     * The enquiry they came from, when there was one.
     *
     * Optional because a client can arrive off-site — a referral, a
     * conversation — and be added by hand. But when they did fill the form,
     * this is what stops the two records being strangers: the lead keeps its
     * brief, score and history, and the client row points back at it instead
     * of being a retyped copy.
     */
    leadId: v.optional(v.id("leads")),
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

  /**
   * Contracts. The step between "yes" and "paid".
   *
   * The signature mechanism is ours rather than a provider's, which puts the
   * whole burden of enforceability on this table. Under the federal ESIGN Act
   * and state UETA an electronic signature holds when four things are
   * captured: intent to sign, consent to transact electronically, attribution
   * to the signer, and a retained reproducible record. Every field below
   * exists to satisfy one of those — none of it is decoration.
   *
   * What this cannot do is have a THIRD PARTY attest the record was not
   * altered by me. The hash chain in contractEvents proves internal
   * consistency to anyone who recomputes it; it cannot prove I did not
   * recompute the whole chain. That is the one thing a provider buys, and the
   * `provider` field is the seam for adding one later.
   */
  contracts: defineTable({
    proposalId: v.id("proposals"),
    leadId: v.id("leads"),
    /**
     * Resolved at signature from clients.by_email, and back-filled when the
     * portal account is created later. A contract is usually signed before
     * the client has an account, so this cannot be required.
     */
    clientId: v.optional(v.id("clients")),
    templateId: v.id("contractTemplates"),
    templateVersion: v.number(),

    /**
     * THE SNAPSHOT, and the reason the template is versioned rather than
     * edited. This is the exact text the client was shown and agreed to.
     * Never re-rendered, never re-merged, never patched after signing —
     * editing the template a month later must not silently rewrite what
     * somebody already put their name to.
     */
    bodySnapshot: v.string(),
    /** The merged values, so the snapshot can be explained without the template. */
    variables: v.any(),

    provider: v.union(
      v.literal("internal"),
      v.literal("documenso"),
      v.literal("dropbox_sign"),
    ),
    /* Unused while provider is "internal". The seam, kept honest by being typed. */
    externalId: v.optional(v.string()),
    signingUrl: v.optional(v.string()),

    token: v.string(),
    status: contractStatus,
    clientName: v.string(),
    clientEmail: v.string(),
    amount: v.number(),
    currency: v.string(),

    sentAt: v.optional(v.number()),
    /** Set on first open, never reset — same reasoning as proposals.viewedAt. */
    viewedAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    expiresAt: v.number(),
    expiredAt: v.optional(v.number()),

    /* --- Signature evidence. --- */
    signerTypedName: v.optional(v.string()),
    signerSignatureFileId: v.optional(v.id("_storage")),
    /**
     * The RAW address, deliberately, breaking this file's own convention.
     *
     * chatLimits stores a salted hash because there it is a rate-limit key and
     * the address itself is nobody's business. Here it is evidence, and a
     * hashed IP is worthless as evidence — you cannot show a hash to anyone
     * and have it mean anything. Retention is indefinite, so this is PII kept
     * forever; the justification is that it is necessary to complete and
     * defend the transaction it belongs to.
     */
    signerIp: v.optional(v.string()),
    signerUserAgent: v.optional(v.string()),
    consentAcceptedAt: v.optional(v.number()),
    /** The exact wording consented to, not a boolean. A boolean proves nothing. */
    consentText: v.optional(v.string()),
    /** SHA-256 of bodySnapshot — the fingerprint of the exact bytes signed. */
    bodyHash: v.optional(v.string()),
    /** Final chain hash at signature. Printed on the certificate page. */
    auditRoot: v.optional(v.string()),

    signedPdfFileId: v.optional(v.id("_storage")),
    /*
     * Retry stamps. Signing commits before Stripe or the PDF is attempted, so
     * either can fail without losing the signature — these say what still owes
     * doing, and a sweep picks them up.
     */
    pdfPendingAt: v.optional(v.number()),
    depositPendingAt: v.optional(v.number()),
    depositInvoiceId: v.optional(v.id("invoices")),
    /** Stamped with the alert itself, so 48h chasing fires exactly once. */
    staleAlertAt: v.optional(v.number()),
    expiredEmailAt: v.optional(v.number()),
    signedEmailAt: v.optional(v.number()),
    voidedAt: v.optional(v.number()),
    voidReason: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_status", ["status"])
    .index("by_proposal", ["proposalId"])
    .index("by_client", ["clientId"]),

  /**
   * Contract templates, immutable and versioned.
   *
   * Saving an edit inserts the next version rather than mutating the row. A
   * signed contract keeps its own snapshot regardless, so versioning is not
   * what protects it — but being able to say "this contract came from v3, and
   * here is v3" is the difference between an audit trail and an assertion.
   */
  contractTemplates: defineTable({
    name: v.string(),
    body: v.string(),
    /** Declared merge keys, validated against the body on save. */
    variables: v.array(v.string()),
    version: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
    /** What changed. Required on save — a version history without it is a list of dates. */
    note: v.optional(v.string()),
  }).index("by_active", ["active"]),

  /**
   * The audit chain. Append-only: nothing patches or deletes a row here.
   *
   * Each row's hash covers the previous row's hash, so removing or editing any
   * event breaks every hash after it. contracts.verifyChain recomputes the
   * whole thing and says so.
   */
  contractEvents: defineTable({
    contractId: v.id("contracts"),
    seq: v.number(),
    type: v.union(
      v.literal("created"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("consented"),
      v.literal("signed"),
      v.literal("declined"),
      v.literal("expired"),
      v.literal("voided"),
      v.literal("pdf_stored"),
      v.literal("share_created"),
      v.literal("share_code_issued"),
      v.literal("share_code_failed"),
      v.literal("share_opened"),
    ),
    at: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    meta: v.optional(v.any()),
    prevHash: v.string(),
    hash: v.string(),
  }).index("by_contract", ["contractId", "seq"]),

  /**
   * A link that grants nothing on its own.
   *
   * Reaching the content behind it takes two codes emailed in sequence, so a
   * forwarded or leaked URL is inert without access to the recipient's inbox.
   */
  contractShares: defineTable({
    contractId: v.id("contracts"),
    token: v.string(),
    recipientEmail: v.string(),
    scope: v.union(
      v.literal("contract"),
      v.literal("pdf"),
      v.literal("audit"),
    ),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastAccessAt: v.optional(v.number()),
    accessCount: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_contract", ["contractId"]),

  /**
   * The two codes. Only ever stored hashed.
   *
   * Stage one is 10 digits and dies after 60 seconds; stage two is 14 digits.
   * Five wrong attempts burns the challenge rather than letting someone grind
   * a 10-digit space.
   */
  contractShareChallenges: defineTable({
    shareId: v.id("contractShares"),
    stage: v.union(v.literal("one"), v.literal("two")),
    codeHash: v.string(),
    salt: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    attempts: v.number(),
    consumedAt: v.optional(v.number()),
  }).index("by_share_stage", ["shareId", "stage"]),

  /** Granted only after both codes. The cookie holds the token; this holds its hash. */
  contractShareSessions: defineTable({
    shareId: v.id("contractShares"),
    sessionTokenHash: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_token", ["sessionTokenHash"]),
});
