/**
 * Inquiry flows.
 *
 * Each plan asks different questions, because the information that decides
 * whether the work is real differs by plan. Asking a one-page site about
 * procurement wastes their time.
 *
 * Nobody is asked what they want to spend — every plan has a published price,
 * so the plan they pick IS the number. See the note above TIMELINES.
 *
 * The flow definition lives here rather than in the component so the form,
 * the scorer and the notification email all read from one source. Steps are
 * data, so adding a plan does not mean touching the form's render logic.
 */

export type PlanId =
  | "one-page"
  | "multi-page"
  | "web-app"
  | "native"
  | "enterprise"
  | "revive"
  | "support";

/** Fields a step may show. Keys match the `leads` table columns. */
export type FieldId =
  | "projectPurpose"
  | "audience"
  | "currentState"
  | "existingUrl"
  | "timeline"
  | "pageCount"
  | "onePagePurpose"
  | "platforms"
  | "procurementProcess"
  | "ndaRequired"
  | "targetLaunch"
  | "decisionMakers"
  | "supportScope"
  | "supportUrl"
  | "supportIssues"
  | "supportStack"
  | "preferredStack"
  | "supportAccess"
  | "company"
  | "role";

export interface Plan {
  id: PlanId;
  label: string;
  /** Shown under the label on the chooser. */
  hint: string;
  /** Step 2 asks these, in order. */
  fields: FieldId[];
  /** Wording of the final step's prompt, tuned per plan. */
  messagePrompt: string;
  /**
   * Whether this plan skips the pricing calculator. True where the figure
   * comes out of a scoping call rather than the price list — quoting one of
   * these from a form is how you get a wrong number on the record before
   * anyone has scoped anything.
   */
  skipsPricing: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "one-page",
    label: "One-page site",
    hint: "A single scrolling page. Launch, portfolio, or a landing page.",
    /* No pageCount — the answer is one. Asking anyway reads as a form that
       was not listening to the previous question. What matters on a single
       page is what it is FOR and what someone should do at the end of it. */
    fields: [
      "onePagePurpose",
      "projectPurpose",
      "audience",
      "currentState",
      "preferredStack",
      "timeline",
    ],
    messagePrompt:
      "What has to be on the page, and what should someone do after reading it?",
    skipsPricing: false,
  },
  {
    id: "multi-page",
    label: "Multi-page site",
    hint: "Several pages — marketing, about, blog, contact.",
    fields: [
      "projectPurpose",
      "audience",
      "pageCount",
      "currentState",
      "existingUrl",
      "preferredStack",
      "timeline",
    ],
    messagePrompt:
      "Which pages do you have in mind, and is there anything the current site gets wrong?",
    skipsPricing: false,
  },
  {
    id: "web-app",
    label: "Web app or SaaS",
    hint: "Accounts, data, billing — something people log into.",
    fields: [
      "projectPurpose",
      "audience",
      "currentState",
      "existingUrl",
      "preferredStack",
      "timeline",
    ],
    messagePrompt:
      "What does someone do once they are logged in? The core job the product does is what I need most.",
    skipsPricing: false,
  },
  {
    id: "native",
    label: "iOS or macOS app",
    hint: "A real native app, distributed straight to your users.",
    fields: [
      "projectPurpose",
      "audience",
      "platforms",
      "currentState",
      "existingUrl",
      "preferredStack",
      "timeline",
    ],
    messagePrompt:
      "What does someone do in the app, and does it need to work offline?",
    skipsPricing: false,
  },
  {
    id: "enterprise",
    label: "Enterprise project",
    hint: "Procurement, security review, multiple stakeholders.",
    fields: [
      "company",
      "role",
      "projectPurpose",
      "decisionMakers",
      "procurementProcess",
      // No NDA checkbox. Anyone who needs one says so, and asking made the
      // form longer to answer a question that changes nothing about the
      // quote. The field stays on the lead record for the ones already
      // captured.
      "targetLaunch",
    ],
    messagePrompt:
      "What is driving the timeline, and who else needs to be satisfied before this can start?",
    skipsPricing: true,
  },
  {
    id: "revive",
    label: "Fix an existing site",
    hint: "You have one already. It needs to work.",
    /*
     * supportStack, not preferredStack. This is a site that already exists,
     * so what it is built with now is a fact about the job rather than a
     * preference — and it decides whether a rescue is an afternoon or a
     * rebuild.
     */
    fields: [
      "existingUrl",
      "supportStack",
      "currentState",
      "projectPurpose",
      "timeline",
    ],
    messagePrompt:
      "What is going wrong with it, and is there anything you already know needs doing?",
    // Priced from the audit: what a rescue costs depends entirely on what is
    // actually broken, and quoting before looking is how a fixed price
    // becomes a wrong one.
    skipsPricing: true,
  },
  {
    id: "support",
    label: "Ongoing support",
    hint: "Care plan for something already live.",
    /*
     * The longest set of questions on the site, deliberately.
     *
     * A care plan is a fixed monthly price against unknown work, which is the
     * one shape where under-asking costs me directly: quoting £180/mo to look
     * after a bespoke stack with a broken build and no repo access is how a
     * plan becomes a loss. Every field here changes whether I can take it on.
     *
     * supportUrl is REQUIRED where existingUrl is optional elsewhere. There
     * is no such thing as a care plan for a site nobody can look at.
     */
    fields: [
      "supportUrl",
      "supportScope",
      "supportIssues",
      "supportStack",
      "supportAccess",
      "currentState",
      "timeline",
    ],
    messagePrompt:
      "What breaks, what needs changing regularly, and who looks after it today?",
    skipsPricing: false,
  },
];

export function getPlan(id: string | undefined): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/**
 * Maps a pricing-page tier onto a plan, so arriving from a pricing CTA
 * pre-selects the right flow instead of asking a question already answered.
 */
export function planFromTier(tier: string | undefined): PlanId | undefined {
  if (!tier) return undefined;
  const t = tier.toLowerCase();
  if (t.includes("enterprise")) return "enterprise";
  if (t.includes("revive")) return "revive";
  if (t.includes("care") || t.includes("support")) return "support";
  if (t.includes("growth")) return "multi-page";
  if (t.includes("launch") || t.includes("starter")) return "one-page";
  // "native" before "app": the native tier id contains neither, but a future
  // id like "native-app" would otherwise match the web-app branch first.
  if (t.includes("native") || t.includes("ios") || t.includes("macos"))
    return "native";
  if (t.includes("app") || t.includes("saas")) return "web-app";
  return undefined;
}

/* -------------------------------------------------------------------------
   Field definitions. Options are per-field, not per-plan, so the same
   question reads identically wherever it appears.
   ------------------------------------------------------------------------- */

export interface FieldDef {
  id: FieldId;
  label: string;
  /**
   * `multiselect` is a checklist, not a dropdown with one answer.
   *
   * A stack is almost never one thing — WordPress on PHP behind Cloudflare,
   * or React with a Node API — so asking someone to pick a single option
   * forces them to misdescribe it. The value is stored as a comma-joined
   * string, which is what the lead table and the notification email already
   * expect, so nothing downstream needs a new shape.
   */
  kind: "text" | "select" | "number" | "boolean" | "textarea" | "multiselect";
  options?: string[];
  required?: boolean;
  /** Rendered under the input. */
  help?: string;
  placeholder?: string;
  /** multiselect only: lets someone add something not on the list. */
  allowOther?: boolean;
}

/**
 * The stack checklist.
 *
 * Ordered by how often it actually comes up rather than alphabetically, so
 * the common answers are the ones you see first. HTML is listed first and
 * explicitly: plenty of small sites are hand-written HTML and CSS, and a list
 * that jumps straight to frameworks tells those people they are in the wrong
 * place.
 */
export const STACK_OPTIONS = [
  "HTML, CSS and JavaScript",
  "WordPress",
  "Shopify",
  "Wix",
  "Squarespace",
  "Webflow",
  "React",
  "Next.js",
  "Vue or Nuxt",
  "Angular",
  "Svelte",
  "Astro",
  "Laravel or PHP",
  "Django or Python",
  "Ruby on Rails",
  "Node and Express",
  "Tailwind CSS",
  "Bootstrap",
  "Supabase",
  "Firebase",
  "Convex",
  "Stripe",
  "Not sure",
] as const;

/*
 * No budget question.
 *
 * Every plan here has a published price, so asking someone to pick a band is
 * asking them to guess at a number the pricing page already told them. It
 * reads as a qualifying question — as though the answer changes what they are
 * quoted — when it does not. The plan they choose is the budget signal, and
 * it is a better one because it is a decision rather than an estimate.
 *
 * The two plans without a fixed price (enterprise, revive) never asked for a
 * band anyway: both are scoped before anything is quoted. See skipsPricing.
 */

export const TIMELINES = [
  "As soon as possible",
  "1–3 months",
  "3–6 months",
  "Just exploring",
];

export const FIELDS: Record<FieldId, FieldDef> = {
  projectPurpose: {
    id: "projectPurpose",
    label: "What is the project for?",
    kind: "textarea",
    required: true,
    help: "A sentence is plenty. What should it achieve?",
    placeholder: "Booking system for a clinic so patients stop phoning to rebook.",
  },
  audience: {
    id: "audience",
    label: "Who is it for?",
    kind: "text",
    placeholder: "Parents booking appointments, mostly on their phone.",
  },
  currentState: {
    id: "currentState",
    label: "Where are you now?",
    kind: "select",
    options: [
      "Nothing built yet",
      "Have a design, need it built",
      "Rebuilding something that exists",
      "Live product that needs work",
    ],
  },
  existingUrl: {
    id: "existingUrl",
    label: "Current site or app (optional)",
    kind: "text",
    placeholder: "https://",
  },
  timeline: {
    id: "timeline",
    label: "Timeline",
    kind: "select",
    options: TIMELINES,
  },
  pageCount: {
    id: "pageCount",
    label: "Roughly how many pages?",
    /*
     * A select, not a number input.
     *
     * type="number" renders a spinner with hit targets a few pixels tall, and
     * on a phone it opens a numeric keypad for a question whose real answer is
     * "about five". Bands match how pricing actually works — one price from
     * four pages to nine — so the answer maps onto a quote directly.
     */
    kind: "select",
    options: ["1", "2 or 3", "4 to 6", "7 to 9", "10 or more", "Not sure yet"],
    help: "An estimate. It does not lock anything in.",
  },
  onePagePurpose: {
    id: "onePagePurpose",
    label: "What is the page for?",
    kind: "select",
    options: [
      "Launching something new",
      "Landing page for a campaign",
      "Portfolio or personal site",
      "Event or booking",
      "Something else",
    ],
  },
  platforms: {
    id: "platforms",
    label: "Which platforms?",
    kind: "select",
    options: ["iOS only", "macOS only", "Both iOS and macOS", "Not sure yet"],
    help: "No App Store listing — builds go straight to your users.",
  },
  procurementProcess: {
    id: "procurementProcess",
    label: "Procurement process",
    kind: "select",
    options: [
      "None — I can sign",
      "Purchase order required",
      "Vendor onboarding required",
      "Formal RFP",
      "Not sure yet",
    ],
  },
  ndaRequired: {
    id: "ndaRequired",
    label: "Do you need an NDA before we talk?",
    kind: "boolean",
  },
  targetLaunch: {
    id: "targetLaunch",
    label: "Target launch date",
    kind: "text",
    placeholder: "Q2, or a fixed date if one is set",
  },
  decisionMakers: {
    id: "decisionMakers",
    label: "Who else signs off?",
    kind: "text",
    placeholder: "Head of marketing, plus a security review.",
  },
  /**
   * Required, unlike existingUrl elsewhere.
   *
   * A care plan is a fixed monthly price against work nobody has seen yet.
   * Quoting one without looking at the site is guessing, so this is the one
   * question the flow will not proceed without.
   */
  supportUrl: {
    id: "supportUrl",
    label: "The site or app you need looked after",
    kind: "text",
    required: true,
    help: "I look at it before quoting — a care plan is priced on what is actually there.",
    placeholder: "https://",
  },
  supportScope: {
    id: "supportScope",
    label: "What do you need looking after?",
    kind: "select",
    options: [
      "Bug fixes and uptime",
      "Regular content and copy changes",
      "New features each month",
      "Someone on call when it breaks",
    ],
  },
  supportIssues: {
    id: "supportIssues",
    label: "What is going wrong right now?",
    kind: "textarea",
    required: true,
    help: "Be specific. Known bugs, things that break often, anything already annoying you.",
    placeholder:
      "Contact form stopped emailing in March. Blog images load slowly on phones.",
  },
  supportStack: {
    id: "supportStack",
    label: "What is it built with?",
    /*
     * A checklist, because a stack is almost never one thing — WordPress on
     * PHP behind Cloudflare, or React with a Node API. Asked as free text it
     * came back as "not sure" or a single word, neither of which tells me
     * whether I can take the site on.
     */
    kind: "multiselect",
    options: [...STACK_OPTIONS],
    allowOther: true,
    help: "Tick everything you know it uses. A guess is fine — and 'Not sure' is a real answer.",
  },
  /**
   * The same question for a NEW build, where there is nothing to inspect.
   *
   * Optional and phrased as a preference, not a requirement: most people have
   * no view and should not be made to feel they need one. But someone whose
   * team already runs React, or who has been told to avoid WordPress, has
   * given me a genuine constraint — and finding that out after quoting is
   * finding it out too late.
   */
  preferredStack: {
    id: "preferredStack",
    label: "Anything it should be built with?",
    kind: "multiselect",
    options: [...STACK_OPTIONS],
    allowOther: true,
    help: "Only if you have a preference or something you have to stay compatible with. Skip it otherwise — I will choose what fits.",
  },
  /**
   * Access is a go/no-go, not a nicety.
   *
   * "Nobody knows the logins" is a discovery job before it is a care plan,
   * and finding that out after quoting a monthly figure is finding it out too
   * late. Asked as a select so the answer is comparable across enquiries.
   */
  supportAccess: {
    id: "supportAccess",
    label: "Can you give me access?",
    kind: "select",
    required: true,
    options: [
      "Yes — I have all the logins",
      "Partly — I have some, not all",
      "No — someone else holds them",
      "I do not know",
    ],
    help: "I cannot look after something I cannot get into. Honest answers save us both time.",
  },
  company: {
    id: "company",
    label: "Company",
    kind: "text",
    required: true,
  },
  role: {
    id: "role",
    label: "Your role",
    kind: "text",
    required: true,
  },
};

export const CONTACT_PREFERENCES = ["Email", "Phone call", "WhatsApp"];
