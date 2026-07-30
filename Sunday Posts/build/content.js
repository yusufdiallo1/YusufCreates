/**
 * Sunday Posts — carousel content.
 *
 * Twenty decks, none repeating a subject already covered in
 * "YusufCreates Social Media" (v1 or v2). Nothing here re-teaches CLAUDE.md,
 * skills, hooks, rewind, permission modes, context, MCP, subagents, cost,
 * Cursor rules, ultrathink, or the who-to-follow set.
 *
 * FIGURES ARE REAL. Sources, and they must stay in sync:
 *
 *   src/lib/pricing.ts   — every price
 *   convex/capacity.ts   — BUILD_SLOTS = 2, CARE_SLOTS = 2
 *   convex/seed.ts       — the six shipped projects, their metrics and URLs
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
  // THE WORK — all figures from convex/seed.ts
  // =====================================================================

  // 1. Ledger. The design argument is the hook, not the app.
  {
    slug: "sun-01-ledger",
    title: "Ledger",
    slides: [
      {
        eyebrow: "Shipped",
        headline: [["Every budget app", "primary"], ["opens on the", "primary"], ["wrong screen.", "accent"]],
        body: "A wall of transactions. Nobody opens a budget app to read a list.",
        cta: "Swipe",
      },
      {
        eyebrow: "The question",
        headline: [["You want one", "primary"], ["number.", "muted"]],
        body: "How much is left this month. Everything else is context for that number, so that number goes first and the list goes last.",
      },
      {
        eyebrow: "The order",
        headline: [["Answer, then", "primary"], ["evidence.", "muted"]],
        steps: [
          { k: "Remaining", v: "The answer, before anything else" },
          { k: "In / out", v: "Why it’s that number" },
          { k: "By category", v: "Where it went, as a donut" },
          { k: "Per day", v: "Which days were unusual" },
        ],
      },
      {
        eyebrow: "Empty states",
        headline: [["Charts need", "primary"], ["data to mean", "primary"], ["anything.", "muted"]],
        body: "It ships with sample transactions, clearly labelled, and one button to clear them. An empty donut teaches nothing about whether you’d like the app.",
      },
      {
        eyebrow: "Live",
        headline: [["Free. No account.", "primary"], ["No upsell.", "accent"]],
        body: "Monthly navigation, category budgets, multi-currency. Built with React, TypeScript and Recharts.",
        cta: "Link in bio",
      },
    ],
  },

  // 2. Weather. The honesty angle — genuinely unusual.
  {
    slug: "sun-02-weather",
    title: "Weather",
    slides: [
      {
        eyebrow: "Shipped",
        headline: [["Most apps lie", "primary"], ["when their API", "primary"], ["goes down.", "danger"]],
        body: "They show yesterday’s numbers as if they were today’s. I built one that admits it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The failure",
        headline: [["Silence is the", "primary"], ["worst answer.", "muted"]],
        compare: {
          bad: {
            label: "Most apps",
            code: "stale data,\nno warning",
            note: "You act on a number that stopped being true hours ago.",
          },
          good: {
            label: "This one",
            code: "labelled sample\n+ a banner",
            note: "It says the source is unreachable, in plain words.",
          },
        },
      },
      {
        eyebrow: "The hierarchy",
        headline: [["Temperature", "primary"], ["first. Always.", "muted"]],
        body: "Then wind, gusts, humidity, UV, rain chance, pressure. Weather sites bury the one number you opened the app for under advertising.",
      },
      {
        eyebrow: "The principle",
        headline: [["Trust survives", "primary"], ["an outage.", "accent"]],
        body: "It does not survive being quietly wrong. Any app reading a third-party API needs a designed answer for the day that API is down.",
      },
      {
        eyebrow: "Live",
        headline: [["Saved places.", "primary"], ["Hourly. Seven day.", "muted"]],
        body: "React, TypeScript, Tailwind. Free, no account, and honest when it doesn’t know.",
        cta: "Link in bio",
      },
    ],
  },

  // 3. StopWatch + Margin together — small tools, one idea.
  {
    slug: "sun-03-small-tools",
    title: "Two small tools",
    slides: [
      {
        eyebrow: "Shipped",
        headline: [["Two tools built", "primary"], ["to answer one", "primary"], ["question each.", "accent"]],
        body: "Small apps are where you learn restraint. Nothing to hide behind.",
        cta: "Swipe",
      },
      {
        eyebrow: "StopWatch",
        headline: [["Four timers.", "primary"], ["One calm screen.", "muted"]],
        body: "Focus timer, stopwatch, world clock and countdown behind a single sidebar. Pomodoro rounds roll into breaks on their own. Pleasant to leave open all day.",
      },
      {
        eyebrow: "Margin",
        headline: [["Writing and", "primary"], ["reading are", "primary"], ["different jobs.", "muted"]],
        body: "Markdown notes where Write and Read are distinct modes, not a preview pane fighting the editor for width. Search across notes, and nothing leaves the device.",
      },
      {
        eyebrow: "What they share",
        headline: [["No account.", "primary"], ["No backend.", "muted"]],
        checks: [
          "Opens instantly, every time",
          "Works with no connection",
          "Nothing to sign up for",
          "Nothing collected about you",
        ],
      },
      {
        eyebrow: "The point",
        headline: [["Small is a", "primary"], ["discipline.", "accent"]],
        body: "A tool that does one thing has nowhere to hide a bad decision. Both are free and live.",
        cta: "Link in bio",
      },
    ],
  },

  // 4. DocuTrackr, the OCR privacy decision. Not the product tour — v1
  //    covered that. This is the single engineering choice.
  {
    slug: "sun-04-on-device",
    title: "The document never uploads",
    slides: [
      {
        eyebrow: "Engineering",
        headline: [["Their passport", "primary"], ["never touches", "primary"], ["my server.", "accent"]],
        body: "The hardest constraint on DocuTrackr, and the one that made it worth building.",
        cta: "Swipe",
      },
      {
        eyebrow: "The problem",
        headline: [["You’re asking for", "primary"], ["the crown jewels.", "muted"]],
        body: "Passport, visa, residency papers. Nobody sensible uploads those to a startup they found last week — and they’re right not to.",
      },
      {
        eyebrow: "The decision",
        headline: [["Read it in the", "primary"], ["browser.", "muted"]],
        body: "OCR runs on-device with Tesseract.js. The scan happens on their machine; the document never leaves it. Only the extracted expiry date is stored.",
      },
      {
        eyebrow: "The cost",
        headline: [["Harder to build.", "primary"], ["Slower to run.", "muted"]],
        body: "Server-side OCR is easier and faster. It also means holding a database of other people’s passports — a liability no feature justifies.",
      },
      {
        eyebrow: "The lesson",
        headline: [["The best data", "primary"], ["breach is one", "primary"], ["you can’t have.", "accent"]],
        body: "Sensitive fields encrypted with AES-256-GCM on top. If you never hold the file, you can never lose it.",
        cta: "Work with me",
      },
    ],
  },

  // 5. The GCC angle — genuinely differentiating and not covered.
  {
    slug: "sun-05-bilingual",
    title: "Building for Arabic",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Arabic isn’t a", "primary"], ["translation. It’s", "primary"], ["a mirror.", "accent"]],
        body: "Most “bilingual” sites are an English site with swapped words. Here’s what actually changes.",
        cta: "Swipe",
      },
      {
        eyebrow: "Direction",
        headline: [["The whole layout", "primary"], ["flips.", "muted"]],
        body: "Navigation, icons, progress bars, the direction an arrow points. RTL isn’t text-align: right — it’s the entire reading order reversed.",
      },
      {
        eyebrow: "The trap",
        headline: [["Not everything", "primary"], ["mirrors.", "danger"]],
        compare: {
          bad: {
            label: "Flip these",
            code: "arrows\nnav · progress",
            note: "Anything expressing direction or sequence.",
          },
          good: {
            label: "Never flip",
            code: "numbers\nclocks · logos",
            note: "Phone numbers and clocks read left-to-right in Arabic too.",
          },
        },
      },
      {
        eyebrow: "Type",
        headline: [["Arabic needs", "primary"], ["more room.", "muted"]],
        body: "Different line height, different optical size, and a font that was actually designed for it. A Latin font with Arabic bolted on looks exactly as careless as it is.",
      },
      {
        eyebrow: "Why bother",
        headline: [["It’s most of", "primary"], ["the Gulf.", "accent"]],
        body: "Full RTL is in the Enterprise tier, not an add-on. If you’re selling into the UAE or Saudi, an English-only site is leaving the room.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // CRAFT — new subjects only
  // =====================================================================

  // 6. Forms. Universally relevant, never covered.
  {
    slug: "sun-06-forms",
    title: "Why nobody finishes your form",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["They started", "primary"], ["your form. They", "primary"], ["didn’t finish.", "accent"]],
        body: "Four fixable reasons, and none of them is the number of fields.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        eyebrowColor: "#e5484d",
        headline: [["Errors appear", "primary"], ["after they", "primary"], ["press send.", "muted"]],
        body: "Validate on blur, not on submit. Telling someone their email was wrong four fields ago, after they thought they were done, is the moment they leave.",
      },
      {
        eyebrow: "02",
        eyebrowColor: "#e5484d",
        headline: [["The keyboard is", "primary"], ["wrong.", "muted"]],
        body: "A number field that opens a full QWERTY keyboard. inputmode and autocomplete take one attribute each and save every mobile user real effort.",
      },
      {
        eyebrow: "03",
        eyebrowColor: "#e5484d",
        headline: [["It clears", "primary"], ["everything on", "primary"], ["one mistake.", "muted"]],
        body: "Never wipe a form on a failed submit. They typed that. Losing it is the fastest way to guarantee they don’t type it twice.",
      },
      {
        eyebrow: "04",
        eyebrowColor: "#e5484d",
        headline: [["Nothing happens", "primary"], ["when they tap", "primary"], ["send.", "accent"]],
        body: "Disable the button, show a spinner, say something. Three silent seconds reads as broken, and they’ll tap it again — now you have two leads.",
        cta: "Save this",
      },
    ],
  },

  // 7. Empty states.
  {
    slug: "sun-07-empty-states",
    title: "The screen you never designed",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Every user sees", "primary"], ["this screen", "primary"], ["first.", "accent"]],
        body: "The empty one. Almost nobody designs it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The gap",
        headline: [["You designed it", "primary"], ["full.", "muted"]],
        body: "Your mockup had twelve rows of realistic data. Day one for a real user has zero, and that version was never drawn.",
      },
      {
        eyebrow: "Not this",
        headline: [["“No items yet”", "primary"], ["is a dead end.", "danger"]],
        compare: {
          bad: {
            label: "Dead end",
            code: "No items yet.",
            note: "Accurate, useless. Now what?",
          },
          good: {
            label: "A door",
            code: "Add your first\n[ Add invoice ]",
            note: "Names the thing, and offers the action.",
          },
        },
      },
      {
        eyebrow: "Better",
        headline: [["Ship it with", "primary"], ["something in it.", "muted"]],
        body: "Sample data, clearly labelled, with one button to clear it. Ledger does this — the charts mean something on first open instead of being three empty circles.",
      },
      {
        eyebrow: "The rule",
        headline: [["Design zero,", "primary"], ["one, and many.", "accent"]],
        body: "Three states, every list. Most teams design “many” and ship the other two by accident.",
        cta: "Save this",
      },
    ],
  },

  // 8. Loading states.
  {
    slug: "sun-08-loading",
    title: "The spinner is the problem",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["A spinner says", "primary"], ["“wait”. It never", "primary"], ["says how long.", "accent"]],
        body: "Which is why it feels slower than it is.",
        cta: "Swipe",
      },
      {
        eyebrow: "Under 300ms",
        headline: [["Show nothing", "primary"], ["at all.", "muted"]],
        body: "A spinner that flashes for a fifth of a second reads as a glitch. Below the threshold where people notice waiting, the honest answer is no feedback.",
      },
      {
        eyebrow: "Up to a second",
        headline: [["Show the shape", "primary"], ["of the answer.", "muted"]],
        body: "A skeleton in the layout the content will occupy. Nothing jumps when the data lands, and the wait reads as loading rather than as nothing happening.",
      },
      {
        eyebrow: "Longer",
        headline: [["Say what it’s", "primary"], ["doing.", "muted"]],
        bars: [
          { label: "Spinner, no text", value: "feels stuck", pct: 34 },
          { label: "“Checking 12 pages…”", value: "feels fast", pct: 89, on: true },
        ],
        body: "Specific progress beats an animation. People wait happily when they can tell it’s working.",
      },
      {
        eyebrow: "The rule",
        headline: [["Match feedback", "primary"], ["to the wait.", "accent"]],
        body: "One spinner for every duration is the lazy answer, and it makes fast things feel slow.",
        cta: "Save this",
      },
    ],
  },

  // 9. Microcopy.
  {
    slug: "sun-09-microcopy",
    title: "Your buttons are lying",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["“Submit” tells", "primary"], ["them nothing.", "accent"]],
        body: "Button copy is the cheapest conversion work there is, and it’s usually an afterthought.",
        cta: "Swipe",
      },
      {
        eyebrow: "Name the outcome",
        headline: [["The button says", "primary"], ["what happens", "primary"], ["next.", "muted"]],
        compare: {
          bad: {
            label: "Vague",
            code: "Submit\nContinue",
            note: "Continue to what? People hesitate before ambiguity.",
          },
          good: {
            label: "Specific",
            code: "Send my brief\nGo to payment",
            note: "No surprise on the other side of the click.",
          },
        },
      },
      {
        eyebrow: "Errors",
        headline: [["Say what to do,", "primary"], ["not what broke.", "muted"]],
        body: "“Something went wrong” helps nobody. “That card was declined — try another, or pay by transfer” gives them a next move.",
      },
      {
        eyebrow: "Confirmations",
        headline: [["Name the thing", "primary"], ["being destroyed.", "muted"]],
        body: "“Are you sure?” is answered yes by reflex. “Delete 14 invoices?” is read. The number is what makes someone stop.",
      },
      {
        eyebrow: "The test",
        headline: [["Read it without", "primary"], ["the screen.", "accent"]],
        body: "If the words alone don’t tell you what happens, the interface is doing work the copy should be doing.",
        cta: "Save this",
      },
    ],
  },

  // 10. Dark mode, properly.
  {
    slug: "sun-10-dark-mode",
    title: "Dark mode done properly",
    slides: [
      {
        eyebrow: "Craft",
        headline: [["Inverting the", "primary"], ["colours isn’t", "primary"], ["dark mode.", "accent"]],
        body: "Four things change, and only one of them is the background.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Pure white text", "primary"], ["is too loud.", "muted"]],
        body: "#fff on near-black vibrates and tires the eye. Pull it slightly down. The contrast is still there; the harshness isn’t.",
      },
      {
        eyebrow: "02",
        headline: [["Shadows stop", "primary"], ["working.", "muted"]],
        body: "You can’t darken something that’s already dark. Depth in dark mode comes from surfaces getting lighter as they come forward — a ladder, not a shadow.",
      },
      {
        eyebrow: "03",
        headline: [["Your brand", "primary"], ["colour shifts.", "muted"]],
        body: "A purple that passed contrast on white can fail on black, or glow. Most palettes need a second, adjusted value for dark — not the same hex.",
      },
      {
        eyebrow: "04",
        headline: [["Images need a", "primary"], ["plan.", "muted"]],
        body: "A logo with a white background punches a hole in a dark page. Transparent assets, or a container that gives them somewhere to sit.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // BUSINESS — new angles, nothing already covered
  // =====================================================================

  // 11. What a brief should contain.
  {
    slug: "sun-11-brief",
    title: "How to brief a developer",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["A good brief", "primary"], ["saves you more", "primary"], ["than money.", "accent"]],
        body: "It saves you the version of the project where we both discover the point in week three.",
        cta: "Swipe",
      },
      {
        eyebrow: "Not a feature list",
        headline: [["Tell me who,", "primary"], ["and what for.", "muted"]],
        body: "“A booking system” could be ten different products. “Clinics whose receptionist currently books by phone” is one, and it decides every screen.",
      },
      {
        eyebrow: "The four lines",
        headline: [["This is the", "primary"], ["whole brief.", "muted"]],
        steps: [
          { k: "Who", v: "Who is it for, specifically" },
          { k: "Problem", v: "What they do today instead" },
          { k: "Success", v: "How you’ll know it worked" },
          { k: "Constraints", v: "Budget, deadline, must-haves" },
        ],
      },
      {
        eyebrow: "Say the budget",
        headline: [["It isn’t a", "primary"], ["negotiation", "primary"], ["tactic.", "muted"]],
        body: "A range lets me tell you honestly what fits it. Withholding it means we design something you can’t buy, then dismantle it together.",
      },
      {
        eyebrow: "Start",
        headline: [["Four lines is", "primary"], ["enough to start.", "accent"]],
        body: "Send those and I’ll tell you straight away whether it’s a fit, roughly what it costs, and when I could start.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },

  // 12. Owning what you paid for. Genuinely useful, and a differentiator.
  {
    slug: "sun-12-own-it",
    title: "Do you actually own your site",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["You paid for", "primary"], ["your site. You", "primary"], ["may not own it.", "danger"]],
        body: "Four things to check today, whoever built it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The domain",
        headline: [["It should be in", "primary"], ["your name.", "muted"]],
        body: "If your agency registered it on their account, they control your address. Check the registrar shows you as owner, not them.",
      },
      {
        eyebrow: "The code",
        headline: [["Ask for the", "primary"], ["repository.", "muted"]],
        body: "Not a zip of the built files — the source, in a repo you can access. Without it, changing developers means rebuilding rather than continuing.",
      },
      {
        eyebrow: "The accounts",
        headline: [["Whose email is", "primary"], ["on the hosting?", "muted"]],
        checks: [
          "Hosting, in your account",
          "Analytics, in your account",
          "Payment processor, in your name",
          "DNS, where you can reach it",
        ],
      },
      {
        eyebrow: "How I do it",
        headline: [["Yours outright", "primary"], ["on final", "primary"], ["payment.", "accent"]],
        body: "Written into every tier, including the cheapest. Handover means the domain, the repo and the accounts — not a login to something I control.",
        cta: "Save this",
      },
    ],
  },

  // 13. Why "one more page" used to be a negotiation — no, covered.
  //     Instead: what happens after launch.
  {
    slug: "sun-13-after-launch",
    title: "What happens after launch",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["Launch day is", "primary"], ["the middle, not", "primary"], ["the end.", "accent"]],
        body: "What actually happens in the weeks after a site goes live.",
        cta: "Swipe",
      },
      {
        eyebrow: "Week one",
        headline: [["Real users find", "primary"], ["real problems.", "muted"]],
        body: "Things nobody predicted: the form on an old Android, the client’s own team using it in an order you didn’t design for. This is normal and it’s why launch is early, not late.",
      },
      {
        eyebrow: "The decay",
        headline: [["A site left alone", "primary"], ["gets worse.", "muted"]],
        body: "Dependencies age, browsers change, content goes stale, contact details drift. Nothing broke — it just quietly stopped being current.",
      },
      {
        eyebrow: "The plan",
        headline: [["Aftercare, not a", "primary"], ["build tier.", "muted"]],
        tiers: [
          {
            name: "Care Plan",
            price: "$180/mo",
            detail: "Hosting, 100 small fixes and 20 big fixes a month, SEO monitoring, monthly reporting, priority support.",
            featured: true,
            badge: "Optional",
          },
        ],
      },
      {
        eyebrow: "Or don’t",
        headline: [["It’s genuinely", "primary"], ["optional.", "accent"]],
        body: "The site is yours outright either way. The Care Plan exists because most people would rather not think about hosting — not because you’re locked out without it.",
        cta: "See what’s included",
      },
    ],
  },

  // 14. Rebuild vs redesign.
  {
    slug: "sun-14-rebuild",
    title: "Redesign or rebuild",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["Your site doesn’t", "primary"], ["need a redesign.", "accent"]],
        body: "Sometimes it needs three fixes. Knowing which saves you thousands.",
        cta: "Swipe",
      },
      {
        eyebrow: "Fix, don’t rebuild",
        headline: [["If it works and", "primary"], ["looks dated.", "muted"]],
        body: "Type, spacing, colour and one good photo will carry a structurally sound site a long way. That’s days of work, not a project.",
      },
      {
        eyebrow: "Rebuild",
        headline: [["If you can’t", "primary"], ["edit it yourself.", "muted"]],
        checks: [
          "Every change needs a developer",
          "It’s slow and nobody knows why",
          "It breaks on phones",
          "You’re scared to touch it",
        ],
      },
      {
        eyebrow: "The real signal",
        headline: [["Are you avoiding", "primary"], ["your own site?", "muted"]],
        body: "If updating it is something you postpone, the cost isn’t the design — it’s every change you didn’t make because it was painful.",
      },
      {
        eyebrow: "Honestly",
        headline: [["I’ll tell you if", "primary"], ["it’s the cheap", "primary"], ["fix.", "accent"]],
        body: "Send me the URL. If three changes would do it, I’d rather say so than sell you a rebuild you didn’t need.",
        cta: "DM me your URL",
        ctaHi: true,
      },
    ],
  },

  // 15. The audit — a real feature of the site, not covered anywhere.
  {
    slug: "sun-15-audit",
    title: "Audit your own site",
    slides: [
      {
        eyebrow: "Free",
        headline: [["Five checks you", "primary"], ["can run on your", "primary"], ["own site today.", "accent"]],
        body: "No tools, no signup. Fifteen minutes.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["Open it on", "primary"], ["your phone.", "muted"]],
        body: "Outdoors, in daylight, on mobile data. Not on your laptop on office wifi. That’s where your traffic actually is, and it’s a different website.",
      },
      {
        eyebrow: "02",
        headline: [["Tab through it.", "primary"], ["No mouse.", "muted"]],
        body: "Can you see where you are? Can you reach every link? Can you escape a modal? If not, neither can anyone using a keyboard or screen reader.",
      },
      {
        eyebrow: "03 & 04",
        headline: [["Time it. Then", "primary"], ["read it aloud.", "muted"]],
        body: "Count the seconds to first meaningful content. Then read your headline out loud — if it describes you rather than what changes for them, rewrite it.",
      },
      {
        eyebrow: "05",
        headline: [["Try to contact", "primary"], ["yourself.", "accent"]],
        body: "Fill in your own form and check the email actually arrives. Broken contact forms are the single most expensive bug on the internet, and they fail silently.",
        cta: "Save this",
      },
    ],
  },

  // =====================================================================
  // BUILD IN PUBLIC — new angles
  // =====================================================================

  // 16. What this site is made of. Real numbers from the repo.
  {
    slug: "sun-16-this-site",
    title: "What this site is made of",
    slides: [
      {
        eyebrow: "Build in public",
        headline: [["My own site is", "primary"], ["the largest thing", "primary"], ["I’ve shipped.", "accent"]],
        body: "Not a portfolio page. A working product that happens to sell my time.",
        cta: "Swipe",
      },
      {
        eyebrow: "Underneath",
        headline: [["It’s an app,", "primary"], ["not a brochure.", "muted"]],
        stats: [
          { value: "27", label: "Database tables" },
          { value: "36", label: "Routes" },
          { value: "10", label: "Transactional emails" },
        ],
      },
      {
        eyebrow: "What it does",
        headline: [["More than", "primary"], ["show work.", "muted"]],
        rows: [
          { k: "01", v: "Takes payment and issues invoices" },
          { k: "02", v: "Runs a live site audit for you" },
          { k: "03", v: "Answers questions with real pricing" },
          { k: "04", v: "Tracks its own build capacity" },
        ],
      },
      {
        eyebrow: "The reason",
        headline: [["The portfolio is", "primary"], ["the proof.", "muted"]],
        body: "Anyone can screenshot a design. A site that handles payments, auth, admin and email is harder to fake — because it either works when you use it or it doesn’t.",
      },
      {
        eyebrow: "Go and break it",
        headline: [["Try it. Tell me", "primary"], ["what’s broken.", "accent"]],
        body: "Genuinely — if you find something wrong, I want to know. That’s worth more to me than a compliment.",
        cta: "Link in bio",
      },
    ],
  },

  // 17. Pricing capacity honestly. Care slots, which no deck has used.
  {
    slug: "sun-17-care-slots",
    title: "Why aftercare is capped too",
    slides: [
      {
        eyebrow: "Capacity",
        headline: [["I cap the", "primary"], ["maintenance too.", "accent"]],
        body: "Everyone caps new projects. Almost nobody caps the ongoing work, which is why support quality collapses.",
        cta: "Swipe",
      },
      {
        eyebrow: "The trap",
        headline: [["Aftercare stacks", "primary"], ["forever.", "danger"]],
        body: "Every finished project can add a permanent monthly obligation. Ten years of those and you’re a support desk who occasionally builds — usually badly.",
      },
      {
        eyebrow: "The number",
        headline: [["Two, same as", "primary"], ["builds.", "muted"]],
        figure: {
          value: "2",
          label: "Care Plan slots — counted from live plans, not a toggle I remember to flip",
        },
      },
      {
        eyebrow: "What it buys",
        headline: [["A number, not", "primary"], ["“unlimited”.", "muted"]],
        body: "100 small fixes and 20 big fixes a month. Unlimited was never true in the way people read it, and a real number is a promise I can keep.",
      },
      {
        eyebrow: "Honestly",
        headline: [["Scarcity you can", "primary"], ["verify.", "accent"]],
        body: "The site derives availability from live plans, so it can’t say “open” when it isn’t. Slots are counted, not claimed.",
        cta: "Check availability",
      },
    ],
  },

  // 18. Deadlines.
  {
    slug: "sun-18-deadlines",
    title: "Why I won’t promise a date",
    slides: [
      {
        eyebrow: "Working together",
        headline: [["I won’t promise", "primary"], ["you a Tuesday", "primary"], ["six weeks out.", "accent"]],
        body: "Not because I’m slow. Because that promise is worthless and we’d both know it.",
        cta: "Swipe",
      },
      {
        eyebrow: "The maths",
        headline: [["Your part is", "primary"], ["on the critical", "primary"], ["path.", "muted"]],
        body: "Copy, photos, logins, a decision from someone who’s on holiday. Most slipped deadlines aren’t build time — they’re waiting time, and I can’t schedule yours.",
      },
      {
        eyebrow: "What I give instead",
        headline: [["A month, then a", "primary"], ["week.", "muted"]],
        steps: [
          { k: "Booking", v: "You pick a month for the build to start" },
          { k: "Confirmed", v: "A start week, once the slot is yours" },
          { k: "Week one", v: "Something live you can open" },
          { k: "Then", v: "Dates get firmer as unknowns close" },
        ],
      },
      {
        eyebrow: "Week one is real",
        headline: [["Live early, even", "primary"], ["if it’s rough.", "muted"]],
        body: "A URL in week one beats a mockup in week four. It turns “I think so” into “open it and tell me”, which is where accurate dates come from.",
      },
      {
        eyebrow: "The trade",
        headline: [["Honest ranges", "primary"], ["beat confident", "primary"], ["fiction.", "accent"]],
        body: "Anyone who gives you an exact date before scoping is guessing. I’d rather narrow it as we go than miss one I invented to win the job.",
        cta: "Save this",
      },
    ],
  },

  // 19. Saying no.
  {
    slug: "sun-19-saying-no",
    title: "Projects I turn down",
    slides: [
      {
        eyebrow: "Hard truths",
        headline: [["I say no to", "primary"], ["work every", "primary"], ["month.", "accent"]],
        body: "Two slots means the wrong project costs me the right one. Here’s what I decline.",
        cta: "Swipe",
      },
      {
        eyebrow: "01",
        headline: [["“Just like this,", "primary"], ["but cheaper.”", "muted"]],
        body: "A brief that’s a competitor’s URL has no idea what it’s for. Copying the surface of something successful gets you the surface.",
      },
      {
        eyebrow: "02",
        headline: [["Nobody can", "primary"], ["decide.", "muted"]],
        body: "If four people must approve every screen and none of them owns it, the project doesn’t get built — it gets averaged until nobody likes it.",
      },
      {
        eyebrow: "03",
        headline: [["The deadline is", "primary"], ["already", "primary"], ["impossible.", "muted"]],
        body: "Taking a job I can’t do well helps neither of us. I’d rather lose it at the enquiry than deliver something we’re both embarrassed by.",
      },
      {
        eyebrow: "Why tell you",
        headline: [["Because it’s", "primary"], ["also a fit test.", "accent"]],
        body: "If none of those is you, we’ll work well together. Fewer clients only produces better work if I’m honest about which ones.",
        cta: "DM to start",
        ctaHi: true,
      },
    ],
  },

  // 20. The closer.
  {
    slug: "sun-20-why-me",
    title: "Why work with one person",
    slides: [
      {
        eyebrow: "The pitch",
        headline: [["An agency has", "primary"], ["more people.", "primary"], ["That’s the risk.", "accent"]],
        body: "The honest case for hiring one person instead — and where an agency genuinely wins.",
        cta: "Swipe",
      },
      {
        eyebrow: "Who builds it",
        headline: [["The person you", "primary"], ["spoke to.", "muted"]],
        body: "At most agencies you’re sold by a senior and built by whoever’s free. Nothing is lost in the handover here, because there isn’t one.",
      },
      {
        eyebrow: "The cost",
        headline: [["You’re paying for", "primary"], ["the building, not", "primary"], ["the office.", "muted"]],
        body: "No account manager, no sales team, no floor in a tower. The same work, without the overhead priced into it.",
      },
      {
        eyebrow: "Where agencies win",
        headline: [["Genuinely, they", "primary"], ["sometimes do.", "muted"]],
        body: "Twelve workstreams in parallel, a legal department, cover if someone leaves. If that’s what you need, take it — you’ll be better served.",
      },
      {
        eyebrow: "Otherwise",
        headline: [["Two slots. One", "primary"], ["person. Fixed", "primary"], ["price.", "accent"]],
        body: "Agreed before I start, yours outright on final payment, live in week one.",
        cta: "Two slots — DM me",
        ctaHi: true,
      },
    ],
  },
];

module.exports = { carousels, HANDLE };
