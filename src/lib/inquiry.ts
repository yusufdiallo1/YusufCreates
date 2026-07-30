/**
 * Inquiry flows.
 *
 * Each plan asks different questions, because the information that decides
 * whether the work is real differs by plan. Asking a one-page site about
 * procurement wastes their time; asking an enterprise buyer to pick a budget
 * band from a dropdown gets a shrug, since at that size the number comes out
 * of a scoping call rather than a form.
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
  | "support";

/** Fields a step may show. Keys match the `leads` table columns. */
export type FieldId =
  | "projectPurpose"
  | "audience"
  | "currentState"
  | "existingUrl"
  | "budget"
  | "timeline"
  | "pageCount"
  | "onePagePurpose"
  | "platforms"
  | "procurementProcess"
  | "ndaRequired"
  | "targetLaunch"
  | "decisionMakers"
  | "supportScope"
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
   * Enterprise skips the pricing calculator entirely — a band dropdown at that
   * size is noise, and quoting from one is how you get a wrong number on the
   * record before anyone has scoped anything.
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
      "budget",
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
      "budget",
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
      "budget",
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
      "budget",
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
    // No budget field. See skipsPricing.
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
    id: "support",
    label: "Ongoing support",
    hint: "Care plan for something already live.",
    fields: ["supportScope", "existingUrl", "currentState", "budget", "timeline"],
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
  kind: "text" | "select" | "number" | "boolean" | "textarea";
  options?: string[];
  required?: boolean;
  /** Rendered under the input. */
  help?: string;
  placeholder?: string;
}

export const BUDGETS = [
  "Under $1,000",
  "$1,000 – $3,000",
  "$3,000 – $6,000",
  "$6,000 – $13,000",
  "$13,000+",
  "Not sure yet",
];

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
  budget: {
    id: "budget",
    label: "Budget",
    kind: "select",
    options: BUDGETS,
    help: "A range is fine. It tells me what is realistic, not what you will pay.",
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
