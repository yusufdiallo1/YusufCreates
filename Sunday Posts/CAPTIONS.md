# Captions — Sunday Posts

Handle: **@yusufcreatesdev** · 20 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

---

## `sun-01-ledger`

> Every budget app opens on the wrong screen: a wall of transactions. Nobody
> opens a budget app to read a list.
>
> You want one number — how much is left this month. Everything else is context
> for that number, so that number goes first and the list goes last.
>
> THE ORDER —
> → Remaining, before anything else
> → Money in and out, so you know why
> → Spending by category, as a donut
> → Per day, to surface unusual days
> → The transaction list, last
>
> EMPTY STATES — it ships with sample transactions, clearly labelled, and one
> button to clear them. An empty donut teaches you nothing about whether you'd
> like the app.
>
> Free, no account, no upsell. React, TypeScript and Recharts. Link in bio.

```
#uidesign #uxdesign #productdesign #webdev #dataviz #reactjs #typescript
#designtips #interfacedesign #buildinpublic #frontenddeveloper #webdesign
#informationdesign #creativedeveloper #indiehacker
```

---

## `sun-02-weather`

> Most weather apps lie when their API goes down. They show yesterday's numbers
> as if they were today's. I built one that admits it.
>
> WHEN THE SOURCE IS UNREACHABLE, this one switches to clearly labelled sample
> data and says so in a banner. You always know whether you're looking at a real
> forecast.
>
> THE HIERARCHY — temperature first, always. Then wind, gusts, humidity, UV,
> rain chance, pressure. Weather sites bury the one number you opened the app
> for underneath advertising.
>
> THE PRINCIPLE — trust survives an outage. It does not survive being quietly
> wrong. Any app reading a third-party API needs a designed answer for the day
> that API is down, and most don't have one.
>
> Saved places, hourly and seven-day. Free, no account. Link in bio.

```
#webdev #uxdesign #productdesign #reactjs #typescript #frontenddeveloper
#errorhandling #designtips #buildinpublic #webdesign #userexperience
#softwareengineer #apidesign #indiehacker #uidesign
```

---

## `sun-03-small-tools`

> Two tools built to answer one question each. Small apps are where you learn
> restraint — there's nothing to hide behind.
>
> STOPWATCH — focus timer, stopwatch, world clock and countdown behind a single
> sidebar. Pomodoro rounds roll into breaks on their own. Pleasant to leave open
> on a second monitor all day.
>
> MARGIN — markdown notes where Write and Read are distinct modes, not a preview
> pane fighting the editor for width. Search across notes. Nothing leaves the
> device.
>
> WHAT THEY SHARE — no account, no backend. They open instantly, work with no
> connection, and collect nothing about you.
>
> A tool that does one thing has nowhere to hide a bad decision. Both free, both
> live. Link in bio.

```
#buildinpublic #webdev #reactjs #typescript #productdesign #indiehacker
#sideproject #uidesign #frontenddeveloper #minimalism #uxdesign
#softwareengineer #webdesign #freetools #devcommunity
```

---

## `sun-04-on-device`

> Their passport never touches my server. It was the hardest constraint on
> DocuTrackr and the one that made it worth building.
>
> THE PROBLEM — you're asking for the crown jewels. Passport, visa, residency
> papers. Nobody sensible uploads those to a startup they found last week, and
> they're right not to.
>
> THE DECISION — OCR runs on-device with Tesseract.js. The scan happens in their
> browser; the document never leaves their machine. Only the extracted expiry
> date is stored, and sensitive fields are encrypted with AES-256-GCM.
>
> THE COST — server-side OCR is easier to build and faster to run. It also means
> holding a database of other people's passports, which is a liability no
> feature justifies.
>
> The best data breach is the one you can't have. If you never hold the file,
> you can never lose it.

```
#privacy #webdev #security #softwareengineering #buildinpublic #nextjs
#saas #dataprotection #engineering #typescript #privacybydesign
#indiehacker #devcommunity #architecture #programming
```

---

## `sun-05-bilingual`

> Arabic isn't a translation, it's a mirror. Most "bilingual" sites are an
> English site with the words swapped.
>
> DIRECTION — navigation, icons, progress bars and the direction an arrow points
> all flip. RTL isn't `text-align: right`, it's the entire reading order
> reversed.
>
> THE TRAP — not everything mirrors. Flip arrows, navigation and progress. Never
> flip numbers, clocks or logos: phone numbers read left-to-right in Arabic too,
> and mirroring them is a bug that looks like a feature.
>
> TYPE — Arabic needs more line height, a different optical size, and a typeface
> actually designed for it. A Latin font with Arabic bolted on looks exactly as
> careless as it is.
>
> Full RTL is in the Enterprise tier, not an add-on. If you're selling into the
> UAE or Saudi, an English-only site is leaving the room.

```
#rtl #arabic #webdesign #i18n #localization #uxdesign #webdev #uidesign
#accessibility #frontenddeveloper #gcc #dubai #saudiarabia #typography
#internationalization
```

---

## `sun-06-forms`

> They started your form. They didn't finish. Four fixable reasons, and none of
> them is the number of fields.
>
> 01 — ERRORS AFTER SUBMIT. Validate on blur, not on send. Telling someone their
> email was wrong four fields ago, after they thought they were done, is the
> moment they leave.
>
> 02 — THE WRONG KEYBOARD. A number field that opens full QWERTY. `inputmode`
> and `autocomplete` are one attribute each and save every mobile user real
> effort.
>
> 03 — IT CLEARS ON ERROR. Never wipe a form on a failed submit. They typed
> that. Losing it guarantees they don't type it twice.
>
> 04 — NOTHING HAPPENS ON TAP. Disable the button, show a spinner, say
> something. Three silent seconds reads as broken, and they'll tap again — now
> you have two leads.

```
#uxdesign #formdesign #webdev #conversion #uidesign #frontenddeveloper
#cro #webdesign #userexperience #designtips #accessibility #mobilefirst
#productdesign #buildinpublic #webdevelopment
```

---

## `sun-07-empty-states`

> Every user sees this screen first — the empty one. Almost nobody designs it.
>
> THE GAP — your mockup had twelve rows of realistic data. Day one for a real
> user has zero, and that version was never drawn.
>
> NOT THIS — "No items yet" is accurate and useless. It's a dead end. An empty
> state should name the thing and offer the action: "Add your first invoice"
> with a button that does it.
>
> BETTER — ship it with something in it. Sample data, clearly labelled, with one
> button to clear it. My budget app does this, so the charts mean something on
> first open instead of being three empty circles.
>
> THE RULE — design zero, one, and many. Three states, every list. Most teams
> design "many" and ship the other two by accident.

```
#uxdesign #uidesign #productdesign #webdev #designsystem #emptystates
#frontenddeveloper #userexperience #designtips #webdesign #interfacedesign
#buildinpublic #saas #uiux #productdevelopment
```

---

## `sun-08-loading`

> A spinner says "wait". It never says how long. Which is exactly why it makes
> your app feel slower than it is.
>
> UNDER 300ms — show nothing. A spinner that flashes for a fifth of a second
> reads as a glitch. Below the threshold where people notice waiting, the honest
> answer is no feedback at all.
>
> UP TO A SECOND — show the shape of the answer. A skeleton in the layout the
> content will occupy, so nothing jumps when the data lands.
>
> LONGER — say what it's doing. "Checking 12 pages…" beats any animation.
> Specific progress makes people wait happily; a spinner alone makes them
> wonder if it's stuck.
>
> Match the feedback to the wait. One spinner for every duration is the lazy
> answer, and it makes fast things feel slow.

```
#uxdesign #webperformance #uidesign #frontenddeveloper #webdev #designtips
#userexperience #productdesign #interfacedesign #webdesign #perceivedperformance
#buildinpublic #uiux #javascript #webdevelopment
```

---

## `sun-09-microcopy`

> "Submit" tells them nothing. Button copy is the cheapest conversion work there
> is, and it's almost always an afterthought.
>
> NAME THE OUTCOME — the button says what happens next. "Send my brief" and "Go
> to payment" beat "Submit" and "Continue", because people hesitate before
> ambiguity.
>
> ERRORS — say what to do, not what broke. "Something went wrong" helps nobody.
> "That card was declined — try another, or pay by transfer" gives them a next
> move.
>
> CONFIRMATIONS — name the thing being destroyed. "Are you sure?" gets answered
> yes by reflex. "Delete 14 invoices?" actually gets read. The number is what
> makes someone stop.
>
> THE TEST — read the words without the screen. If they don't tell you what
> happens, the interface is doing work the copy should be doing.

```
#microcopy #uxwriting #copywriting #uxdesign #uidesign #conversion #webdev
#contentdesign #designtips #userexperience #cro #productdesign #webdesign
#frontenddeveloper #uiux
```

---

## `sun-10-dark-mode`

> Inverting the colours isn't dark mode. Four things change, and only one of
> them is the background.
>
> 01 — PURE WHITE TEXT IS TOO LOUD. #fff on near-black vibrates and tires the
> eye. Pull it slightly down: the contrast is still there, the harshness isn't.
>
> 02 — SHADOWS STOP WORKING. You can't darken something already dark. Depth in
> dark mode comes from surfaces getting lighter as they come forward — a ladder,
> not a shadow.
>
> 03 — YOUR BRAND COLOUR SHIFTS. A colour that passed contrast on white can fail
> on black, or glow. Most palettes need a second adjusted value for dark, not
> the same hex.
>
> 04 — IMAGES NEED A PLAN. A logo with a white background punches a hole in a
> dark page. Transparent assets, or a container that gives them somewhere to
> sit.

```
#darkmode #uidesign #uxdesign #designsystem #webdev #frontenddeveloper
#colortheory #webdesign #designtips #interfacedesign #accessibility
#css #productdesign #uiux #webdevelopment
```

---

## `sun-11-brief`

> A good brief saves you more than money. It saves you the version of the
> project where we both discover the point in week three.
>
> IT'S NOT A FEATURE LIST. "A booking system" could be ten different products.
> "Clinics whose receptionist currently books by phone" is one, and it decides
> every screen.
>
> THE WHOLE BRIEF IS FOUR LINES —
> → WHO is it for, specifically
> → What PROBLEM do they have, and what do they do today instead
> → How will you know it SUCCEEDED
> → CONSTRAINTS: budget, deadline, must-haves
>
> SAY THE BUDGET. It isn't a negotiation tactic. A range lets me tell you
> honestly what fits it. Withholding it means we design something you can't buy
> and then dismantle it together.
>
> Send four lines and I'll tell you straight away whether it's a fit.

```
#freelance #clientwork #webdesign #webdevelopment #businessowner #startup
#projectmanagement #consulting #smallbusiness #entrepreneur #agency
#designprocess #buildinpublic #founders #digitalstrategy
```

---

## `sun-12-own-it`

> You paid for your website. You might not own it. Four things to check today,
> whoever built it.
>
> THE DOMAIN — it should be registered in your name. If your agency put it on
> their account, they control your address.
>
> THE CODE — ask for the repository. Not a zip of built files, the source, in a
> repo you can access. Without it, changing developers means rebuilding rather
> than continuing.
>
> THE ACCOUNTS — hosting, analytics, payment processor and DNS should all be in
> your name, not theirs. Check whose email is on each.
>
> HOW I DO IT — yours outright on final payment, written into every tier
> including the cheapest. Handover means the domain, the repo and the accounts,
> not a login to something I control.
>
> Go and check. It takes ten minutes and it matters enormously.

```
#smallbusiness #webdesign #businessowner #entrepreneur #freelance
#digitalstrategy #webdevelopment #startup #businesstips #marketing
#ownership #clientwork #founders #consulting #websitedesign
```

---

## `sun-13-after-launch`

> Launch day is the middle, not the end. Here's what actually happens in the
> weeks after a site goes live.
>
> WEEK ONE — real users find real problems. The form on an old Android. The
> client's own team using it in an order nobody designed for. This is normal,
> and it's exactly why launching early beats launching perfect.
>
> THE DECAY — a site left alone gets worse. Dependencies age, browsers change,
> content goes stale, contact details drift. Nothing broke; it just quietly
> stopped being current.
>
> THE PLAN — Care Plan at $180/mo: hosting, 100 small fixes and 20 big fixes a
> month, SEO monitoring, monthly reporting, priority support.
>
> OR DON'T. The site is yours outright either way. The Care Plan exists because
> most people would rather not think about hosting, not because you're locked
> out without it.

```
#webdesign #websitemaintenance #smallbusiness #businessowner #webdevelopment
#freelance #digitalstrategy #entrepreneur #marketing #seo #clientwork
#websitedesign #businesstips #startup #consulting
```

---

## `sun-14-rebuild`

> Your site probably doesn't need a redesign. Sometimes it needs three fixes,
> and knowing which saves you thousands.
>
> FIX, DON'T REBUILD — if it works and just looks dated. Type, spacing, colour
> and one good photo will carry a structurally sound site a long way. That's
> days of work, not a project.
>
> REBUILD IF —
> → Every change needs a developer
> → It's slow and nobody knows why
> → It breaks on phones
> → You're scared to touch it
>
> THE REAL SIGNAL — are you avoiding your own website? If updating it is
> something you postpone, the cost isn't the design. It's every change you
> didn't make because it was painful.
>
> Send me your URL. If three changes would do it, I'd rather say so than sell
> you a rebuild you didn't need.

```
#webdesign #websiteredesign #smallbusiness #businessowner #webdevelopment
#freelance #digitalstrategy #entrepreneur #marketing #businesstips
#websitedesign #consulting #startup #clientwork #webdev
```

---

## `sun-15-audit`

> Five checks you can run on your own site today. No tools, no signup, fifteen
> minutes.
>
> 01 — OPEN IT ON YOUR PHONE. Outdoors, in daylight, on mobile data. Not on your
> laptop on office wifi. That's where your traffic actually is, and it's a
> different website.
>
> 02 — TAB THROUGH IT WITH NO MOUSE. Can you see where you are? Reach every
> link? Escape a modal? If not, neither can anyone using a keyboard or a screen
> reader.
>
> 03 — TIME IT. Count the seconds until something meaningful appears.
>
> 04 — READ YOUR HEADLINE ALOUD. If it describes you rather than what changes
> for them, rewrite it.
>
> 05 — TRY TO CONTACT YOURSELF. Fill in your own form and check the email
> arrives. Broken contact forms are the most expensive bug on the internet, and
> they fail silently.

```
#webdesign #seo #websiteaudit #smallbusiness #businessowner #webdevelopment
#uxdesign #accessibility #marketing #digitalstrategy #conversion
#businesstips #entrepreneur #webdev #cro
```

---

## `sun-16-this-site`

> My own site is the largest thing I've shipped. Not a portfolio page — a
> working product that happens to sell my time.
>
> UNDERNEATH — 27 database tables, 36 routes, 10 transactional emails.
>
> WHAT IT DOES —
> → Takes payment and issues invoices
> → Runs a live audit of your site
> → Answers questions with real pricing, pulled from the codebase
> → Tracks its own build capacity, from live projects
>
> THE REASON — the portfolio is the proof. Anyone can screenshot a design. A
> site that handles payments, auth, admin and email is harder to fake, because
> it either works when you use it or it doesn't.
>
> Go and try to break it. If you find something wrong, I genuinely want to know
> — that's worth more to me than a compliment. Link in bio.

```
#buildinpublic #nextjs #convex #stripe #typescript #webdevelopment
#fullstackdeveloper #softwareengineer #indiehacker #saas #portfolio
#webdev #reactjs #programming #devcommunity
```

---

## `sun-17-care-slots`

> I cap the maintenance too. Everyone caps new projects — almost nobody caps the
> ongoing work, which is exactly why support quality collapses.
>
> THE TRAP — every finished project can add a permanent monthly obligation. Ten
> years of those and you're a support desk who occasionally builds, usually
> badly.
>
> THE NUMBER — two Care Plan slots, same as build slots. Counted from live
> plans, not a toggle I remember to flip.
>
> WHAT IT BUYS — 100 small fixes and 20 big fixes a month. Not "unlimited".
> Unlimited was never true in the way people read it, and a real number is a
> promise I can actually keep.
>
> The site derives availability from live plans, so it can't say "open" when it
> isn't. Slots are counted, not claimed.

```
#freelance #smallbusiness #businessowner #webdesign #consulting #pricing
#entrepreneur #digitalstrategy #webdevelopment #businesstips #clientwork
#founders #startup #buildinpublic #agency
```

---

## `sun-18-deadlines`

> I won't promise you a Tuesday six weeks out. Not because I'm slow — because
> that promise is worthless and we'd both know it.
>
> THE MATHS — your part is on the critical path. Copy, photos, logins, a
> decision from someone who's on holiday. Most slipped deadlines aren't build
> time, they're waiting time, and I can't schedule yours.
>
> WHAT I GIVE INSTEAD —
> → You pick a MONTH for the build to start
> → A start WEEK once the slot is confirmed
> → Something LIVE in week one
> → Firmer dates as the unknowns close
>
> WEEK ONE IS REAL. A URL in week one beats a mockup in week four. It turns "I
> think so" into "open it and tell me", which is where accurate dates come from.
>
> Anyone who gives you an exact date before scoping is guessing.

```
#freelance #projectmanagement #clientwork #webdevelopment #consulting
#smallbusiness #businessowner #entrepreneur #agency #webdesign
#businesstips #founders #startup #digitalstrategy #buildinpublic
```

---

## `sun-19-saying-no`

> I turn down work every month. Two slots means the wrong project costs me the
> right one. Here's what I decline.
>
> 01 — "JUST LIKE THIS, BUT CHEAPER." A brief that's a competitor's URL has no
> idea what it's for. Copying the surface of something successful gets you the
> surface.
>
> 02 — NOBODY CAN DECIDE. If four people must approve every screen and none of
> them owns it, the project doesn't get built. It gets averaged until nobody
> likes it.
>
> 03 — THE DEADLINE IS ALREADY IMPOSSIBLE. Taking a job I can't do well helps
> neither of us. I'd rather lose it at the enquiry than deliver something we're
> both embarrassed by.
>
> WHY TELL YOU — because it's also a fit test. If none of those is you, we'll
> work well together. Fewer clients only produces better work if I'm honest
> about which ones.

```
#freelance #clientwork #consulting #smallbusiness #entrepreneur #agency
#businessowner #webdesign #webdevelopment #businesstips #founders
#startup #digitalstrategy #buildinpublic #creativebusiness
```

---

## `sun-20-why-me`

> An agency has more people. That's the risk, not the reassurance. Here's the
> honest case for hiring one person — including where an agency genuinely wins.
>
> WHO BUILDS IT — the person you spoke to. At most agencies you're sold by a
> senior and built by whoever's free. Nothing is lost in the handover here,
> because there isn't one.
>
> THE COST — you're paying for the building, not the office. No account manager,
> no sales team, no floor in a tower priced into your quote.
>
> WHERE AGENCIES WIN — genuinely, sometimes they do. Twelve workstreams in
> parallel, a legal department, cover if someone leaves. If that's what you
> need, take it. You'll be better served.
>
> OTHERWISE — two slots, one person, fixed price agreed before I start. Yours
> outright on final payment, live in week one.

```
#freelance #agency #webdesign #webdevelopment #smallbusiness #businessowner
#entrepreneur #consulting #startup #founders #businesstips #clientwork
#digitalstrategy #solopreneur #buildinpublic
```

---

## Posting notes

**Order.** Craft decks teach and travel furthest, so they lead. Work decks prove
the craft. Business and pricing decks convert the audience the first two build —
don't lead with those to a cold following.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `sun-06-forms` | Broadest craft hook of the set |
| 2 | `sun-02-weather` | Work, with a strong opinion in it |
| 3 | `sun-09-microcopy` | Highly saveable |
| 4 | `sun-16-this-site` | Proof, with real numbers |
| 5 | `sun-07-empty-states` | Craft, universally applicable |
| 6 | `sun-01-ledger` | Work, design-led |
| 7 | `sun-15-audit` | Actionable, high save rate |
| 8 | `sun-04-on-device` | The engineering credibility deck |
| 9 | `sun-08-loading` | Craft |
| 10 | `sun-12-own-it` | Genuinely useful, builds trust |
| 11 | `sun-10-dark-mode` | Craft |
| 12 | `sun-03-small-tools` | Work, light |
| 13 | `sun-11-brief` | First real sell |
| 14 | `sun-05-bilingual` | Differentiator for the GCC market |
| 15 | `sun-14-rebuild` | Sells by not selling |
| 16 | `sun-18-deadlines` | Trust |
| 17 | `sun-13-after-launch` | Care Plan, softly |
| 18 | `sun-19-saying-no` | Positioning |
| 19 | `sun-17-care-slots` | Real scarcity |
| 20 | `sun-20-why-me` | The closer |

- **Slide 01 is the cover** — the feed thumbnail, and the only slide most people
  will ever see.
- **Check the order before posting.** Filenames end `-01` to `-05`. Instagram
  honours tap order once you start selecting, so confirm the sequence.
- **Alt text:** headlines are baked into the image, so screen readers get
  nothing without it. Paste each slide's headline into Instagram's alt text
  field (Advanced settings → Write alt text).
- Rotate hashtag sets rather than reusing one block.
