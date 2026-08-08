/**
 * The onboarding questionnaire, defined once.
 *
 * Lives in convex/ rather than src/ so both halves read the same source: the
 * form renders from it, the nudge email names outstanding sections from it,
 * and the admin's "what is outstanding" summary is generated from it. Three
 * copies of this list would drift, and the first symptom would be an email
 * asking for something the form never showed.
 *
 * Deliberately data, not components. A section is a title, a reason it is
 * being asked, and a list of fields — which means adding a question is one
 * entry here rather than an edit in four files.
 *
 * SIX SECTIONS, EACH COMPLETABLE ON ITS OWN. Not one long form. A client can
 * do Brand today and Content next week without losing either, and the two
 * things that make that real are per-section state and the fact that every
 * single question can be skipped.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "choice"
  | "colours"
  | "adjectives"
  | "references"
  | "files"
  | "credentials";

export type Field = {
  id: string;
  label: string;
  /** One line under the label. Says why it is being asked, not what to type. */
  help?: string;
  type: FieldType;
  placeholder?: string;
  choices?: { id: string; label: string }[];
  /**
   * The honest escape hatch — "I don't have any", "I need stock".
   *
   * Not the same as skipping. Skipping means "not now"; this means "there is
   * nothing to give you", which is a real answer and changes what I do next.
   */
  optOut?: { id: string; label: string };
  accept?: string;
  multiple?: boolean;
  /** For `references`: how many rows to show. */
  count?: number;
};

export type Section = {
  id: string;
  title: string;
  /** Why this section exists, in the client's terms. */
  blurb: string;
  /** How this section is named in a nudge email. Lowercase, fits mid-sentence. */
  nudgeLabel: string;
  fields: Field[];
};

export const SECTIONS: Section[] = [
  {
    id: "brand",
    title: "Brand",
    blurb:
      "Anything that already exists. If some of it does not, say so — I would rather know than guess.",
    nudgeLabel: "your logo and brand files",
    fields: [
      {
        id: "logo",
        label: "Logo files",
        help: "SVG is best if you have it — it stays sharp at any size. AI, EPS or PDF also work.",
        type: "files",
        accept: ".svg,.ai,.eps,.pdf,.png,.jpg,.jpeg",
        multiple: true,
      },
      {
        id: "colours",
        label: "Brand colours",
        help: "Hex codes if you know them. If not, I will pull them off your logo.",
        type: "colours",
        optOut: { id: "none", label: "I don't have set colours" },
      },
      {
        id: "fonts",
        label: "Fonts",
        help: "Upload the files if they were bought, or just name them if they are from Google Fonts.",
        type: "files",
        accept: ".otf,.ttf,.woff,.woff2,.zip",
        multiple: true,
      },
      {
        id: "fontNames",
        label: "…or name them",
        type: "text",
        placeholder: "Inter for body, Playfair for headings",
      },
      {
        id: "guidelines",
        label: "Brand guidelines",
        help: "If someone has already written the rules down, this saves us both a conversation.",
        type: "files",
        accept: ".pdf,.doc,.docx,.zip",
        multiple: true,
      },
      {
        id: "tone",
        label: "Tone of voice",
        help: "Three adjectives. It is a surprisingly good shortcut — 'warm, plain, unfussy' tells me more than a paragraph.",
        type: "adjectives",
      },
    ],
  },

  {
    id: "content",
    title: "Content",
    blurb:
      "The words and pictures. This is the single most common reason a project stalls, so it is worth being honest here about what does not exist yet.",
    nudgeLabel: "your copy and images",
    fields: [
      {
        id: "copywriter",
        label: "Who writes the copy?",
        type: "choice",
        choices: [
          { id: "them", label: "We will write it" },
          { id: "me", label: "I would like you to write it" },
          { id: "mix", label: "A mix — we will draft, you polish" },
        ],
      },
      {
        id: "existingCopy",
        label: "Existing copy",
        help: "Paste it, or upload the document. Rough notes are fine — it is easier to edit something than to start from nothing.",
        type: "textarea",
      },
      {
        id: "copyFiles",
        label: "…or upload it",
        type: "files",
        accept: ".doc,.docx,.pdf,.txt,.md,.rtf,.pages",
        multiple: true,
      },
      {
        id: "images",
        label: "Images and photography",
        help: "Originals, not the compressed versions off your website.",
        type: "files",
        accept: "image/*",
        multiple: true,
        optOut: { id: "stock", label: "I need stock photography" },
      },
      {
        id: "verbatim",
        label: "Anything that must appear word for word",
        help: "Legal wording, a tagline, a disclaimer. Anything I must not rewrite.",
        type: "textarea",
      },
    ],
  },

  {
    id: "access",
    title: "Access",
    blurb:
      "Where the site lives and who controls it. Wherever possible I would rather be added as a user than be sent a password.",
    nudgeLabel: "domain and hosting access",
    fields: [
      {
        id: "registrar",
        label: "Where is the domain registered?",
        help: "GoDaddy, Namecheap, Cloudflare, or whoever it was bought from.",
        type: "text",
        placeholder: "Namecheap",
      },
      {
        id: "registrarAccess",
        label: "Do you have the login for it?",
        help: "A genuinely common answer is 'our old developer has it'. Say so now and we have weeks to sort it out.",
        type: "choice",
        choices: [
          { id: "yes", label: "Yes" },
          { id: "someone_else", label: "Someone else has it" },
          { id: "unknown", label: "Not sure" },
        ],
      },
      {
        id: "hosting",
        label: "Current hosting",
        help: "If there is a site up now, where is it hosted?",
        type: "text",
        placeholder: "WP Engine",
      },
      {
        id: "analytics",
        label: "Existing analytics",
        help: "So the history carries over rather than starting from zero on launch day.",
        type: "text",
        placeholder: "Google Analytics",
      },
      {
        id: "thirdParty",
        label: "Third-party services to connect",
        help: "Mailchimp, Stripe, a booking system, a CRM — anything the site needs to talk to.",
        type: "textarea",
      },
      {
        id: "credentials",
        label: "Logins",
        help: "Delegated access first, always. Only use the form if that is not possible.",
        type: "credentials",
      },
    ],
  },

  {
    id: "references",
    title: "References",
    blurb:
      "Three sites you like and three you do not. The dislikes are usually more useful than the likes — they are more specific.",
    nudgeLabel: "your reference sites",
    fields: [
      {
        id: "liked",
        label: "Sites you like",
        help: "One line on why for each. 'It feels calm' is a real answer.",
        type: "references",
        count: 3,
      },
      {
        id: "disliked",
        label: "Sites you do not like",
        help: "Same again. This is the fastest way to avoid showing you something you were always going to hate.",
        type: "references",
        count: 3,
      },
      {
        id: "competitor",
        label: "Your main competitor",
        help: "Who you most want to look better than.",
        type: "url",
        placeholder: "competitor.com",
      },
    ],
  },

  {
    id: "approvals",
    title: "Approvals",
    blurb:
      "Who decides. Knowing this at the start prevents the version of this project where everything is approved and then someone new sees it.",
    nudgeLabel: "who signs things off",
    fields: [
      {
        id: "signoff",
        label: "Who signs things off?",
        type: "text",
        placeholder: "Name and role",
      },
      {
        id: "others",
        label: "Is anyone else involved in the decision?",
        help: "A partner, a board, a colleague whose opinion carries weight. Better named now than met at the end.",
        type: "textarea",
      },
      {
        id: "turnaround",
        label: "Expected feedback turnaround",
        help: "Realistically, not aspirationally. I plan around this.",
        type: "choice",
        choices: [
          { id: "same_day", label: "Same day" },
          { id: "2_3_days", label: "Two or three days" },
          { id: "week", label: "About a week" },
          { id: "longer", label: "Longer — we are slow, sorry" },
        ],
      },
    ],
  },

  {
    id: "logistics",
    title: "Logistics",
    blurb: "The practical things.",
    nudgeLabel: "your timings and contact preferences",
    fields: [
      {
        id: "contact",
        label: "Preferred contact method",
        type: "choice",
        choices: [
          { id: "email", label: "Email" },
          { id: "portal", label: "Messages on this portal" },
          { id: "phone", label: "Phone" },
          { id: "whatsapp", label: "WhatsApp" },
        ],
      },
      {
        id: "timezone",
        label: "Timezone",
        help: "So I do not send you something at 3am.",
        type: "text",
        placeholder: "GMT / London",
      },
      {
        id: "deadlines",
        label: "Hard deadlines",
        help: "A launch event, a trade show, a contract date — anything immovable. If one exists, it changes the whole order of the work.",
        type: "textarea",
      },
    ],
  },
];

export const SECTION_IDS = SECTIONS.map((s) => s.id);

/** Blank state for a new intake: every section outstanding. */
export function initialSections(): Record<string, { status: "outstanding" }> {
  return Object.fromEntries(
    SECTION_IDS.map((id) => [id, { status: "outstanding" as const }]),
  );
}

/**
 * Section labels for a nudge email — outstanding only.
 *
 * Skipped sections are excluded alongside complete ones, and that is the
 * point. Skipping is a decision the client made on purpose; asking again for
 * something they explicitly declined reads as not listening, and is how they
 * start ignoring the whole thread.
 */
export function outstandingLabels(
  sections: Record<string, { status: string }> | undefined,
): string[] {
  if (!sections) return SECTIONS.map((s) => s.nudgeLabel);
  return SECTIONS.filter(
    (s) => (sections[s.id]?.status ?? "outstanding") === "outstanding",
  ).map((s) => s.nudgeLabel);
}

/** Progress, counting skipped as done — the client has answered it. */
export function completion(
  sections: Record<string, { status: string }> | undefined,
): { done: number; total: number; percent: number } {
  const total = SECTIONS.length;
  if (!sections) return { done: 0, total, percent: 0 };

  const done = SECTIONS.filter((s) => {
    const status = sections[s.id]?.status;
    return status === "complete" || status === "skipped";
  }).length;

  return { done, total, percent: Math.round((done / total) * 100) };
}
