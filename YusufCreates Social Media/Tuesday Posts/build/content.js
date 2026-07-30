/**
 * Tuesday Posts — carousel content.
 *
 * Twelve decks. Seventy-one precede these across build/, build-v2/,
 * Sunday Posts and Monday Posts, so the constraint is genuinely new subjects
 * rather than new angles on covered ground.
 *
 * FIGURES ARE REAL. Sources, and they must stay in sync:
 *
 *   src/lib/pricing.ts                — every price
 *   convex/capacity.ts                — BUILD_SLOTS = 2, CARE_SLOTS = 2
 *   src/components/ui/SlideToConfirm  — the gesture rules in deck 05
 *   src/app/globals.css               — reduced-motion handling in deck 03
 *
 * Tier *descriptions* drift more quietly than prices — check BUILD_TIERS,
 * ENTERPRISE_FEATURES, CARE_FEATURES and EVERY_PLAN, not just the numbers.
 *
 * Nothing claims traffic, revenue or client counts. None of that is recorded
 * anywhere in the repo, and inventing it on a public post is a liability.
 *
 * Code blocks are hand-tokenised as [text, kind] pairs so nothing is mis-lexed
 * on a public post. Kinds: comment, key, str, num, fn, punct, accent, text.
 */

const HANDLE = "@yusufcreatesdev";

const carousels = [
  // =====================================================================
  // CRAFT — interaction and interface, none of it covered before
  // =====================================================================

  // 1. Motion. Why most of it is bad, and the one rule that fixes it.
  {
    slug: "tue-01-motion",
    title: "Your animations are too slow",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Your animation", "primary"], ["is beautiful.", "primary"], ["It’s too slow.", "accent"]],
        body: "The number that separates delightful from irritating is smaller than you think.",
        cta: "Swipe",
      },
      {
        eyebrow: "The number",
        headline: [["200ms, or it", "primary"], ["gets in the way.", "muted"]],
        bars: [
          { label: "150–200ms — feels responsive", value: "invisible", pct: 92, on: true },
          { label: "600ms — looks great once", value: "annoying by ten", pct: 30 },
        ],
        body: "You see your animation once, in a demo. Your user sees it forty times a day.",
      },
      {
        eyebrow: "Direction",
        headline: [["Out should be", "primary"], ["faster than in.", "muted"]],
        body: "Entering, an element earns attention and can take its time. Leaving, it’s already been decided about — a slow exit is just a delay before the next thing.",
      },
      {
        eyebrow: "Easing",
        headline: [["Nothing in life", "primary"], ["moves linearly.", "muted"]],
        body: "Linear easing is the tell of an animation nobody tuned. Start fast and settle — ease-out for almost everything that appears.",
      },
      {
        eyebrow: "The test",
        headline: [["Use it fifty", "primary"], ["times.", "accent"]],
        body: "Anything that survives fifty repetitions is well-tuned. Anything you start wanting to skip was built to be admired, not used.",
        cta: "Save this",
      },
    ],
  },

  // 2. Focus states. Genuinely neglected, and a real accessibility issue.
  {
    slug: "tue-02-focus",
    title: "You deleted the focus ring",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Somebody deleted", "primary"], ["the focus ring.", "danger"]],
        body: "It’s the most commonly removed accessibility feature on the web, and it’s usually one CSS line.",
        cta: "Swipe",
      },
      {
        eyebrow: "The line",
        headline: [["This is the", "primary"], ["culprit.", "muted"]],
        code: {
          file: "styles.css",
          lines: [
            [["*", "fn"], [" { ", "punct"], ["outline", "key"], [": ", "punct"], ["none", "str"], ["; }", "punct"]],
            "",
            [["/* Looks tidier. Makes the site", "comment"]],
            [["   unusable without a mouse. */", "comment"]],
          ],
        },
        body: "It’s added because the default ring looks ugly. The fix is to style it, not remove it.",
      },
      {
        eyebrow: "Who needs it",
        headline: [["More people", "primary"], ["than you think.", "muted"]],
        checks: [
          "Anyone using a keyboard by preference",
          "Anyone who can’t use a mouse precisely",
          "Screen reader users",
          "You, when your trackpad dies",
        ],
      },
      {
        eyebrow: "The modern fix",
        headline: [[":focus-visible", "accent"], ["solves the", "primary"], ["complaint.", "muted"]],
        body: "It shows a ring for keyboard users and hides it for mouse clicks — which was the actual objection all along. Style it in your brand colour and it stops being ugly.",
      },
      {
        eyebrow: "Test it",
        headline: [["Tab through your", "primary"], ["own site now.", "accent"]],
        body: "If you lose track of where you are, so does everyone navigating by keyboard. It takes thirty seconds to find out.",
        cta: "Save this",
      },
    ],
  },

  // 3. Reduced motion. Real behaviour in this codebase.
  {
    slug: "tue-03-reduced-motion",
    title: "Motion makes some people ill",
    slides: [
      {
        eyebrow: "Accessibility",
        headline: [["Your parallax", "primary"], ["makes some", "primary"], ["people ill.", "accent"]],
        body: "Literally — nausea and dizziness. There’s an OS setting for it, and one media query respects it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The setting",
        headline: [["They already", "primary"], ["told the system.", "muted"]],
        body: "Reduce Motion is a toggle in iOS, Android, macOS and Windows. People with vestibular disorders turn it on. Your site can read it — most never ask.",
      },
      {
        eyebrow: "The query",
        headline: [["Four lines.", "primary"], ["That’s the", "primary"], ["whole fix.", "muted"]],
        code: {
          file: "globals.css",
          accentFile: true,
          lines: [
            [["@media", "key"], [" (", "punct"], ["prefers-reduced-motion", "accent"], [") {", "punct"]],
            [["  * { ", "punct"], ["animation", "key"], [": ", "punct"], ["none", "str"], ["; }", "punct"]],
            [["}", "punct"]],
          ],
        },
        body: "Blunt, but infinitely better than ignoring it.",
      },
      {
        eyebrow: "Better",
        headline: [["Don’t remove.", "primary"], ["Replace.", "muted"]],
        body: "A slide becomes a fade. A parallax becomes a static image. The interface still communicates state — it just stops moving through space.",
      },
      {
        eyebrow: "The point",
        headline: [["They asked.", "primary"], ["Answer.", "accent"]],
        body: "This is someone stating a medical need at the operating-system level. Overriding it is a choice, and it’s the wrong one.",
        cta: "Save this",
      },
    ],
  },

  // 4. Colour contrast — the maths, not the vibe.
  {
    slug: "tue-04-contrast",
    title: "Grey text is a decision",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["That grey text", "primary"], ["is unreadable", "primary"], ["outdoors.", "accent"]],
        body: "Light grey on white looks refined on your monitor. It’s a wall on a phone in sunlight.",
        cta: "Swipe",
      },
      {
        eyebrow: "The numbers",
        headline: [["Two ratios,", "primary"], ["memorised.", "muted"]],
        steps: [
          { k: "4.5:1", v: "Body text against its background" },
          { k: "3:1", v: "Large text, icons, borders" },
          { k: "Below", v: "Not a style choice — a failure" },
          { k: "Tools", v: "Any contrast checker, thirty seconds" },
        ],
      },
      {
        eyebrow: "The trap",
        headline: [["One accent can’t", "primary"], ["do both jobs.", "muted"]],
        body: "A brand colour that passes 3:1 for borders often fails 4.5:1 under white text. That’s not a reason to abandon it — it’s a reason to have a second, darker value for filled buttons.",
      },
      {
        eyebrow: "Not just text",
        headline: [["Can they find", "primary"], ["the input?", "muted"]],
        body: "A form field with a 1.5:1 border is invisible to a lot of people. Focus rings, disabled states and icons all need to clear the bar too.",
      },
      {
        eyebrow: "The test",
        headline: [["Take it outside.", "accent"]],
        body: "Not a plugin — actual daylight, on your phone, at whatever brightness you normally use. That’s the condition most of your traffic is in.",
        cta: "Save this",
      },
    ],
  },

  // 5. The slide gesture. A real component with a real rule behind it.
  {
    slug: "tue-05-confirm",
    title: "When to make it harder",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Sometimes the", "primary"], ["button should be", "primary"], ["harder to press.", "accent"]],
        body: "Not often. But there’s a rule for exactly when, and most interfaces get it backwards.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["Friction goes", "primary"], ["where undo", "primary"], ["can’t reach.", "muted"]],
        compare: {
          bad: {
            label: "Ordinary button",
            code: "save · filter\nnext step",
            note: "Reversible. Extra friction is just an obstacle.",
          },
          good: {
            label: "Deliberate gesture",
            code: "send · pay\ndelete",
            note: "Can’t be cleanly undone. Worth a second of certainty.",
          },
        },
      },
      {
        eyebrow: "Where I use it",
        headline: [["Six places.", "primary"], ["That’s all.", "muted"]],
        rows: [
          { k: "01", v: "Sending a project brief" },
          { k: "02", v: "Continuing to payment" },
          { k: "03", v: "Starting a subscription" },
          { k: "04", v: "Deleting, in admin" },
        ],
      },
      {
        eyebrow: "The failure",
        headline: [["Everywhere is", "primary"], ["the same as", "primary"], ["nowhere.", "danger"]],
        body: "A confirmation on every action gets clicked through by reflex within a day. Friction only works if it’s rare enough to still be noticed.",
      },
      {
        eyebrow: "The principle",
        headline: [["Match the effort", "primary"], ["to the", "primary"], ["consequence.", "accent"]],
        body: "Cheap actions should be effortless. Irreversible ones should ask you to mean it. That’s the whole design.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // ENGINEERING — new subjects
  // =====================================================================

  // 6. Email deliverability. Universally painful, never covered.
  {
    slug: "tue-06-email",
    title: "Your emails go to spam",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["Your contact", "primary"], ["form works.", "primary"], ["Nothing arrives.", "danger"]],
        body: "Three DNS records decide whether your email is delivered or silently binned.",
        cta: "Swipe",
      },
      {
        eyebrow: "Why",
        headline: [["Anyone can claim", "primary"], ["to be you.", "muted"]],
        body: "Email has no built-in proof of sender. Without records saying who may send on your behalf, a receiving server has to guess — and it guesses conservatively.",
      },
      {
        eyebrow: "The three",
        headline: [["SPF, DKIM,", "primary"], ["DMARC.", "muted"]],
        steps: [
          { k: "SPF", v: "Which servers may send as you" },
          { k: "DKIM", v: "A signature proving it wasn’t altered" },
          { k: "DMARC", v: "What to do when a check fails" },
          { k: "All three", v: "Or you’re in the spam folder" },
        ],
      },
      {
        eyebrow: "The other half",
        headline: [["Don’t send from", "primary"], ["a Gmail", "primary"], ["address.", "muted"]],
        body: "no-reply@yourdomain, on a domain you control, with those records in place. Sending as @gmail.com from your own server fails authentication by design.",
      },
      {
        eyebrow: "Test it",
        headline: [["Send yourself", "primary"], ["one, today.", "accent"]],
        body: "Fill in your own contact form and see whether it lands. Broken email is the most expensive silent bug a small business runs — nobody reports the message they never sent twice.",
        cta: "Save this",
      },
    ],
  },

  // 7. Backups. Boring, essential, never discussed.
  {
    slug: "tue-07-backups",
    title: "You don’t have a backup",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["You have a", "primary"], ["backup. You’ve", "primary"], ["never restored it.", "accent"]],
        body: "Which means you don’t have a backup. You have a file you hope works.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["Three, two,", "primary"], ["one.", "muted"]],
        steps: [
          { k: "3 copies", v: "Of anything you can’t recreate" },
          { k: "2 media", v: "Not both on the same machine" },
          { k: "1 offsite", v: "Fire and theft take the building" },
          { k: "0 untested", v: "The number that actually matters" },
        ],
      },
      {
        eyebrow: "The gap",
        headline: [["Your host’s", "primary"], ["backup is not", "primary"], ["yours.", "danger"]],
        body: "It protects them from hardware failure. It rarely protects you from a bad deploy, a deleted account or a billing dispute — and you can’t test it.",
      },
      {
        eyebrow: "The test",
        headline: [["Restore it", "primary"], ["somewhere else.", "muted"]],
        body: "Once. Into a fresh environment, from the backup alone. Every assumption you didn’t know you were making shows up in the first ten minutes.",
      },
      {
        eyebrow: "The honest bit",
        headline: [["Boring, until", "primary"], ["it’s the only", "primary"], ["thing.", "accent"]],
        body: "Nobody has ever regretted a tested backup. Plenty of people have discovered theirs was empty at the worst possible moment.",
        cta: "Save this",
      },
    ],
  },

  // 8. Error handling in the UI, not the console.
  {
    slug: "tue-08-errors",
    title: "It failed and said nothing",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["It failed.", "primary"], ["The user has no", "primary"], ["idea.", "accent"]],
        body: "The error is in your console. They’re staring at a screen that looks fine.",
        cta: "Swipe",
      },
      {
        eyebrow: "The gap",
        headline: [["Caught is not", "primary"], ["handled.", "muted"]],
        compare: {
          bad: {
            label: "Swallowed",
            code: "catch (e) {\n  console.log(e)\n}",
            note: "Nothing crashes. Nothing works. Nobody is told.",
          },
          good: {
            label: "Handled",
            code: "catch (e) {\n  report(e)\n  tell(user)\n}",
            note: "You find out, and so do they.",
          },
        },
      },
      {
        eyebrow: "What to say",
        headline: [["Plain words,", "primary"], ["and a way out.", "muted"]],
        body: "Not the stack trace, not “an error occurred”. What happened, whether their data survived, and what they can do now.",
      },
      {
        eyebrow: "Preserve their work",
        headline: [["Never make them", "primary"], ["type it again.", "muted"]],
        body: "If a submit fails, the form must still be full. Losing what someone typed converts a small failure into a lost customer.",
      },
      {
        eyebrow: "The habit",
        headline: [["Design the", "primary"], ["failure path", "primary"], ["too.", "accent"]],
        body: "Every request that can fail needs a designed answer for when it does. That’s the difference between a prototype and a product.",
        cta: "Save this",
      },
    ],
  },

  // 9. Naming. Universal, cheap, and genuinely useful.
  {
    slug: "tue-09-naming",
    title: "Name it after the job",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["The hardest part", "primary"], ["is still", "primary"], ["naming things.", "accent"]],
        body: "Four rules that make a codebase readable by someone who wasn’t there.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Name the job,", "primary"], ["not the type.", "muted"]],
        compare: {
          neutral: true,
          bad: {
            label: "Type",
            code: "userArray\ndataObj",
            note: "The language already told you what it is.",
          },
          good: {
            label: "Job",
            code: "pendingInvites\nunpaidInvoices",
            note: "Says what’s in it and why it exists.",
          },
        },
      },
      {
        eyebrow: "02",
        headline: [["Booleans should", "primary"], ["read as", "primary"], ["questions.", "muted"]],
        body: "isPaid, hasExpired, canEdit. If the name doesn’t answer yes or no when you read it aloud, every `if` using it will be ambiguous.",
      },
      {
        eyebrow: "03",
        headline: [["Length should", "primary"], ["match scope.", "muted"]],
        body: "A one-line loop can use `i`. A module-level export cannot. The further a name travels from where it’s defined, the more work it has to do alone.",
      },
      {
        eyebrow: "04",
        headline: [["If you can’t", "primary"], ["name it, you", "primary"], ["don’t get it.", "accent"]],
        body: "A function that resists naming is usually doing two things. The naming problem is a design problem wearing a disguise.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // BUSINESS — new angles
  // =====================================================================

  // 10. Discovery calls, and how to make them useful.
  {
    slug: "tue-10-first-call",
    title: "The call before the quote",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["Twenty minutes", "primary"], ["decides whether", "primary"], ["this works.", "accent"]],
        body: "What actually happens on a first call, and how to get value from it either way.",
        cta: "Swipe",
      },
      {
        eyebrow: "Not a pitch",
        headline: [["I’m asking, not", "primary"], ["selling.", "muted"]],
        body: "Who it’s for, what they do today instead, what happens if nothing changes. If I’m talking more than you are, the call is going badly.",
      },
      {
        eyebrow: "What to bring",
        headline: [["Three things.", "primary"], ["No deck.", "muted"]],
        checks: [
          "A site you like, and why",
          "Roughly what you can spend",
          "When you need it live",
          "Who has to approve it",
        ],
      },
      {
        eyebrow: "The good outcome",
        headline: [["Sometimes it’s", "primary"], ["“don’t build", "primary"], ["this yet.”", "muted"]],
        body: "If the answer is a spreadsheet, a phone number or an existing tool, I’d rather say so. A project that shouldn’t exist is expensive for both of us.",
      },
      {
        eyebrow: "Either way",
        headline: [["You leave with a", "primary"], ["number.", "accent"]],
        body: "Scope, price and a start month — or an honest reason it isn’t a fit. No follow-up sequence, no pressure.",
        cta: "Book a call",
        ctaHi: true,
      },
    ],
  },

  // 11. What "done" means. Genuinely useful and rarely stated.
  {
    slug: "tue-11-done",
    title: "What done actually means",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["“Done” is the", "primary"], ["most expensive", "primary"], ["word in this job.", "accent"]],
        body: "Unless both people define it the same way before anyone starts.",
        cta: "Swipe",
      },
      {
        eyebrow: "Not done",
        headline: [["It works on my", "primary"], ["machine.", "muted"]],
        body: "Built isn’t done. Deployed isn’t done. Looks right on a laptop isn’t done. Each of those is a milestone someone has mistaken for the finish line.",
      },
      {
        eyebrow: "Done",
        headline: [["Someone else can", "primary"], ["use it, and", "primary"], ["change it.", "muted"]],
        checks: [
          "Live, on your domain",
          "Fast on a phone, in daylight",
          "You can edit it without me",
          "Domain, repo and accounts are yours",
        ],
      },
      {
        eyebrow: "The handover",
        headline: [["Not a zip file", "primary"], ["and good luck.", "muted"]],
        body: "Access to everything, written down, plus enough of a walkthrough that the next person — including a future developer who isn’t me — can pick it up.",
      },
      {
        eyebrow: "Write it down",
        headline: [["Agree the finish", "primary"], ["line first.", "accent"]],
        body: "Four lines at the start prevents the entire argument at the end. It’s the cheapest thing in the whole project.",
        cta: "Save this",
      },
    ],
  },

  // 12. The closer — why fixed price, and what it costs me.
  {
    slug: "tue-12-fixed-price",
    title: "Why I don’t bill hourly",
    slides: [
      {
        eyebrow: "Pricing",
        headline: [["Hourly billing", "primary"], ["punishes me for", "primary"], ["getting faster.", "accent"]],
        body: "The honest argument for a fixed price, including where it costs me.",
        cta: "Swipe",
      },
      {
        eyebrow: "The conflict",
        headline: [["Slower work,", "primary"], ["bigger invoice.", "danger"]],
        body: "Under hourly, every efficiency I gain reduces what I earn. Ten years of experience should make the work better and cheaper — hourly makes it just cheaper, for me.",
      },
      {
        eyebrow: "For you",
        headline: [["You can decide", "primary"], ["before you", "primary"], ["commit.", "muted"]],
        body: "A fixed number is a decision you can actually make. An hourly estimate is a range you find out the truth about afterwards.",
      },
      {
        eyebrow: "What it costs me",
        headline: [["I eat my own", "primary"], ["bad estimates.", "muted"]],
        body: "If I misjudge the work, that’s mine to absorb, not yours to fund. Which is exactly why I scope carefully before quoting — the incentive points the right way.",
      },
      {
        eyebrow: "The trade",
        headline: [["Scope is fixed", "primary"], ["too.", "accent"]],
        body: "That’s the other half, and it’s fair: the price holds because what we agreed holds. New ideas go on a list for version two rather than into this build.",
        cta: "See pricing",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
