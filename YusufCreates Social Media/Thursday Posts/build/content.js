/**
 * Thursday Posts — carousel content.
 *
 * Ten decks. Ninety-three precede these across build/, build-v2/, Sunday,
 * Monday, Tuesday and Wednesday Posts, so the constraint is genuinely new
 * subjects rather than new angles on covered ground.
 *
 * FIGURES ARE REAL. Sources, and they must stay in sync:
 *
 *   src/lib/pricing.ts     — every price
 *   convex/engagement.ts   — the narrow-public-writes rule in deck 02
 *   convex/cleanup.ts      — the auth bug and its guard, deck 03
 *   convex/crons.ts        — the scheduled job in deck 05
 *   convex/capacity.ts     — BUILD_SLOTS = 2, CARE_SLOTS = 2
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
  // SECURITY AND DATA — real rules from this codebase
  // =====================================================================

  // 1. Obscurity is not security. Real admin route, honest about what it is.
  {
    slug: "thu-01-obscurity",
    title: "A secret URL is not security",
    slides: [
      {
        eyebrow: "Security",
        headline: [["My admin URL is", "primary"], ["unguessable. That", "primary"], ["proves nothing.", "accent"]],
        body: "A hidden door is still a door. It has to be locked as well.",
        cta: "Swipe",
      },
      {
        eyebrow: "The mistake",
        headline: [["“Nobody knows", "primary"], ["the address.”", "muted"]],
        body: "Until it appears in a referrer header, a browser history on a shared laptop, a screenshot, or a bookmark synced to a phone someone loses. Addresses leak. Passwords are what stop people.",
      },
      {
        eyebrow: "What it does buy",
        headline: [["Fewer knocks", "primary"], ["at the door.", "muted"]],
        body: "An obscure path keeps automated scanners away from your login form, which is genuinely useful. It is a layer, not the layer — and the difference matters enormously.",
      },
      {
        eyebrow: "The real locks",
        headline: [["Check on the", "primary"], ["server. Always.", "muted"]],
        checks: [
          "Every admin route verifies identity server-side",
          "Not a hidden link, an enforced check",
          "Hiding the button is not permission",
          "Assume every URL is public",
        ],
      },
      {
        eyebrow: "The test",
        headline: [["Log out. Paste", "primary"], ["the admin URL.", "accent"]],
        body: "If you see anything other than a login screen, the address was doing the work. That’s a five-second test and most people have never run it.",
        cta: "Save this",
      },
    ],
  },

  // 2. Narrow public writes. Real principle from convex/engagement.ts.
  {
    slug: "thu-02-public-writes",
    title: "Never trust what the browser sends",
    slides: [
      {
        eyebrow: "Security",
        headline: [["Anything the", "primary"], ["browser sends is", "primary"], ["a suggestion.", "accent"]],
        body: "Not a fact. The single most useful sentence in web security.",
        cta: "Swipe",
      },
      {
        eyebrow: "The rule",
        headline: [["Public writes", "primary"], ["stay narrow.", "muted"]],
        compare: {
          bad: {
            label: "Wide open",
            code: "save(everything\n  the client sent)",
            note: "Now anyone can set approved, role or price.",
          },
          good: {
            label: "Narrow",
            code: "save({ text })\n// nothing else",
            note: "Fixed fields, length caps, server-set timestamps.",
          },
        },
      },
      {
        eyebrow: "The fields",
        headline: [["Some values are", "primary"], ["never the", "primary"], ["caller’s to set.", "muted"]],
        body: "Approved, admin, verified, price, createdAt. If a public endpoint accepts any of those from the request body, it has just handed them out.",
      },
      {
        eyebrow: "Be honest",
        headline: [["Some limits are", "primary"], ["soft, and that’s", "primary"], ["fine.", "muted"]],
        body: "Likes on my blog are keyed to a browser id. Someone determined can clear it and like again — that’s a known limit, written down, not a hole I’m pretending isn’t there.",
      },
      {
        eyebrow: "The habit",
        headline: [["Validate on the", "primary"], ["server. Every", "primary"], ["time.", "accent"]],
        body: "Client-side validation is a courtesy to honest users. Server-side validation is the only thing standing between you and everyone else.",
        cta: "Save this",
      },
    ],
  },

  // 3. The auth bug. Real, documented in convex/cleanup.ts.
  {
    slug: "thu-03-auth-bug",
    title: "My sign-in form made accounts",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["My sign-in form", "primary"], ["was quietly", "primary"], ["making accounts.", "danger"]],
        body: "A bug I shipped, found and fixed. The mechanism is worryingly common.",
        cta: "Swipe",
      },
      {
        eyebrow: "The bug",
        headline: [["A failed sign-in", "primary"], ["retried as a", "primary"], ["sign-up.", "muted"]],
        body: "Convenient in theory. In practice, every address ever typed into that form — including typos — became a real account with a real credential.",
      },
      {
        eyebrow: "Why it hides",
        headline: [["Nothing looks", "primary"], ["wrong.", "muted"]],
        body: "No error, no alert. Users see a successful sign-in. You see a growing table of accounts you never invited and cannot explain.",
      },
      {
        eyebrow: "The cleanup",
        headline: [["Deleting rows is", "primary"], ["the dangerous", "primary"], ["part.", "danger"]],
        body: "Removing the users row left the credential behind, so both had to go. And the script refuses to touch the admin or any invited client — a cleanup that can delete your only way in is not a cleanup.",
      },
      {
        eyebrow: "The lesson",
        headline: [["Sign in and sign", "primary"], ["up are different", "primary"], ["intentions.", "accent"]],
        body: "Merging them to save a click creates accounts nobody asked for. Convenience that changes what an action means is not convenience.",
        cta: "Save this",
      },
    ],
  },

  // 4. Soft delete. Universal, never covered.
  {
    slug: "thu-04-soft-delete",
    title: "Delete should not delete",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["Your delete", "primary"], ["button should", "primary"], ["rarely delete.", "accent"]],
        body: "Not because data is precious. Because people click the wrong thing.",
        cta: "Swipe",
      },
      {
        eyebrow: "The pattern",
        headline: [["Mark it, don’t", "primary"], ["remove it.", "muted"]],
        body: "A deletedAt column and a filter on every query. It disappears from the interface exactly as expected, and it is still there when someone says they didn’t mean to.",
      },
      {
        eyebrow: "The real reason",
        headline: [["Records are", "primary"], ["connected.", "muted"]],
        body: "Delete a client and what happens to their invoices? Hard deletes either cascade further than anyone intended or leave rows pointing at nothing. Neither is discovered on a good day.",
      },
      {
        eyebrow: "Genuinely delete",
        headline: [["When they ask", "primary"], ["for it.", "muted"]],
        body: "A real erasure request is a legal obligation, not a UI preference. Soft delete is for accidents; hard delete is for consent withdrawn — and you need both.",
      },
      {
        eyebrow: "The check",
        headline: [["Can you undo", "primary"], ["the last hour?", "accent"]],
        body: "If the answer is a database restore, your delete button is more dangerous than it looks to the person pressing it.",
        cta: "Save this",
      },
    ],
  },

  // 5. Scheduled jobs. Real cron in this codebase.
  {
    slug: "thu-05-cron",
    title: "The job that stopped running",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["Your nightly job", "primary"], ["stopped running", "primary"], ["in March.", "accent"]],
        body: "Nobody noticed, because a job that does nothing looks exactly like a job that works.",
        cta: "Swipe",
      },
      {
        eyebrow: "The failure",
        headline: [["Silence is the", "primary"], ["default.", "muted"]],
        body: "A cron that succeeds says nothing. A cron that never fires also says nothing. Without a heartbeat you cannot tell those apart, and you will assume the good one.",
      },
      {
        eyebrow: "The fix",
        headline: [["Record every", "primary"], ["run.", "muted"]],
        steps: [
          { k: "Started", v: "Write a row when it begins" },
          { k: "Finished", v: "And when it completes" },
          { k: "Counted", v: "How many things it touched" },
          { k: "Alerted", v: "If a day passes with no row" },
        ],
      },
      {
        eyebrow: "The other bug",
        headline: [["It ran twice.", "primary"], ["At once.", "danger"]],
        body: "A slow job still running when the next one starts is how duplicate emails get sent. Anything scheduled needs to be safe to run twice, or refuse to overlap.",
      },
      {
        eyebrow: "The habit",
        headline: [["Alert on absence,", "primary"], ["not just errors.", "accent"]],
        body: "Most monitoring watches for failures. The expensive outages are things that quietly stopped happening at all.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // CRAFT AND CONTENT — new subjects
  // =====================================================================

  // 6. File uploads.
  {
    slug: "thu-06-uploads",
    title: "Your upload form is a door",
    slides: [
      {
        eyebrow: "Security",
        headline: [["Letting people", "primary"], ["upload files is", "primary"], ["a big decision.", "accent"]],
        body: "Four checks, and the one everybody skips is the one that matters.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Check the type", "primary"], ["on the server.", "muted"]],
        body: "The browser reports a file type. It’s a claim, not a fact — trivially changed. Verify it where the file actually lands.",
      },
      {
        eyebrow: "02",
        headline: [["A size limit is", "primary"], ["not optional.", "muted"]],
        body: "Without one, a single upload can fill your storage or your bill. Set it low enough that a mistake is cheap.",
      },
      {
        eyebrow: "03",
        headline: [["Never keep", "primary"], ["their filename.", "danger"]],
        body: "Uploaded names arrive with path characters and script extensions in them. Generate your own name and store theirs as a label if you need to show it.",
      },
      {
        eyebrow: "04",
        headline: [["Serve them from", "primary"], ["somewhere else.", "muted"]],
        body: "User files on your own domain can run as your site. A separate storage host means an uploaded file is just a file, whatever it contains.",
        cta: "Save this",
      },
    ],
  },

  // 7. Blog posts nobody reads.
  {
    slug: "thu-07-writing",
    title: "Nobody reads your blog",
    slides: [
      {
        eyebrow: "Content",
        headline: [["Nobody read", "primary"], ["your last post.", "accent"]],
        body: "Usually one of four reasons, and none of them is the writing.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["The title", "primary"], ["describes the", "primary"], ["topic.", "muted"]],
        body: "“Thoughts on state management” is a filing label. “Why your form loses data on refresh” is a reason to click. Titles promise an answer, not a subject.",
      },
      {
        eyebrow: "02",
        headline: [["It opens with", "primary"], ["throat-clearing.", "muted"]],
        body: "Three paragraphs of context before the point. Start at the conclusion — people who need the background will keep reading, and everyone else got what they came for.",
      },
      {
        eyebrow: "03",
        headline: [["It’s a wall.", "primary"]],
        body: "No subheadings, no code, no lists. Most people scan before they read, and a solid block of text tells them there’s nothing to scan.",
      },
      {
        eyebrow: "04",
        headline: [["You wrote it", "primary"], ["once and never", "primary"], ["shared it again.", "accent"]],
        body: "Publishing isn’t distribution. A post that solved a real problem is still solving it in a year — post it again when someone asks that question.",
        cta: "Save this",
      },
    ],
  },

  // 8. Pricing pages.
  {
    slug: "thu-08-pricing-page",
    title: "Your pricing page loses the sale",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["“Contact us for", "primary"], ["pricing” means", "primary"], ["expensive.", "accent"]],
        body: "That’s what people read. Four things that cost you the sale on a pricing page.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Hiding the", "primary"], ["number.", "muted"]],
        body: "It doesn’t create a conversation. It creates a comparison with the competitor who published theirs, and you lose it without ever hearing about it.",
      },
      {
        eyebrow: "02",
        headline: [["Too many tiers.", "primary"]],
        body: "Five columns is a research project. Three is a decision. Beyond that people don’t choose carefully — they leave and choose nothing.",
      },
      {
        eyebrow: "03",
        headline: [["Features nobody", "primary"], ["understands.", "muted"]],
        body: "“Advanced workflow orchestration” tells a buyer nothing. Describe what they can do, in the words they’d use to describe wanting it.",
      },
      {
        eyebrow: "04",
        headline: [["No answer to", "primary"], ["“what if I’m", "primary"], ["wrong?”", "accent"]],
        body: "What happens if they need to change tier, or stop? Unanswered, that question stops the purchase silently — and it’s the cheapest objection to remove.",
        cta: "Save this",
      },
    ],
  },

  // 9. Client communication.
  {
    slug: "thu-09-updates",
    title: "Silence is the worst update",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["Most projects", "primary"], ["go wrong in the", "primary"], ["quiet weeks.", "accent"]],
        body: "Not because work stopped. Because nobody said it hadn’t.",
        cta: "Swipe",
      },
      {
        eyebrow: "The gap",
        headline: [["No news reads", "primary"], ["as bad news.", "muted"]],
        body: "A week of silence from someone holding your deposit is genuinely worrying. The work being fine is not visible from the outside.",
      },
      {
        eyebrow: "The habit",
        headline: [["Short, and on a", "primary"], ["fixed day.", "muted"]],
        steps: [
          { k: "Done", v: "What moved since last time" },
          { k: "Next", v: "What I’m on now" },
          { k: "Blocked", v: "What I need from you" },
          { k: "Still true", v: "Whether the date holds" },
        ],
      },
      {
        eyebrow: "Bad news early",
        headline: [["A slip told late", "primary"], ["is a broken", "primary"], ["promise.", "danger"]],
        body: "Told early, it’s a schedule change you can both plan around. The delay is rarely the problem — finding out about it afterwards is.",
      },
      {
        eyebrow: "The rule",
        headline: [["Boring updates", "primary"], ["build trust.", "accent"]],
        body: "Predictable and slightly dull beats impressive and sporadic. Nobody has ever complained about knowing where their project stands.",
        cta: "Save this",
      },
    ],
  },

  // 10. The closer — the whole run, honestly.
  {
    slug: "thu-10-shipping",
    title: "Shipping beats perfect",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["The version in", "primary"], ["your head has", "primary"], ["no users.", "accent"]],
        body: "The uncomfortable arithmetic of finishing things.",
        cta: "Swipe",
      },
      {
        eyebrow: "The trap",
        headline: [["One more thing", "primary"], ["before launch.", "muted"]],
        body: "There is always one more thing. The list regenerates faster than you clear it, so “ready” never arrives — you either decide to ship or you don’t.",
      },
      {
        eyebrow: "What you learn",
        headline: [["Nothing, until", "primary"], ["it’s real.", "muted"]],
        bars: [
          { label: "Guessing what users need", value: "usually wrong", pct: 34 },
          { label: "Watching them use it", value: "definitive", pct: 92, on: true },
        ],
        body: "Every unlaunched feature is a guess. Some of them are wrong, and you cannot find out which from inside the project.",
      },
      {
        eyebrow: "Not an excuse",
        headline: [["Shipping broken", "primary"], ["isn’t shipping.", "danger"]],
        body: "The bar is: it works, it’s honest about what it doesn’t do, and it doesn’t lose anyone’s data. Below that you haven’t launched, you’ve published a problem.",
      },
      {
        eyebrow: "The whole thing",
        headline: [["Finish. Learn.", "primary"], ["Then improve.", "accent"]],
        body: "In that order. Everything I’ve built started worse than it is now, and none of it improved until someone else was using it.",
        cta: "Follow for more",
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
