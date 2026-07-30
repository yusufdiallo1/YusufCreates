# Captions — Tuesday Posts

Handle: **@yusufcreatesdev** · 12 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

---

## `tue-01-motion`

> Your animation is beautiful. It's too slow. The number separating delightful
> from irritating is smaller than you think.
>
> THE NUMBER — 150 to 200ms for most interface motion. You see your animation
> once, in a demo. Your user sees it forty times a day, and at 600ms it stops
> being lovely by the tenth.
>
> DIRECTION — out should be faster than in. Entering, an element earns attention
> and can take its time. Leaving, it's already been decided about, so a slow
> exit is just a delay before the next thing.
>
> EASING — nothing in life moves linearly. Linear easing is the tell of an
> animation nobody tuned. Start fast and settle: ease-out for almost everything
> that appears.
>
> THE TEST — use it fifty times. Anything that survives that is well-tuned.
> Anything you start wanting to skip was built to be admired, not used.

```
#uidesign #uxdesign #animation #motiondesign #webdev #frontenddeveloper
#interactiondesign #designtips #css #webdesign #userexperience
#productdesign #uiux #webdevelopment #microinteractions
```

---

## `tue-02-focus`

> Somebody deleted the focus ring. It's the most commonly removed accessibility
> feature on the web, and it's usually one line of CSS.
>
> THE CULPRIT — `* { outline: none; }`. It's added because the default ring
> looks ugly. It makes the entire site unusable without a mouse.
>
> WHO NEEDS IT — anyone using a keyboard by preference, anyone who can't use a
> mouse precisely, screen reader users, and you, on the day your trackpad dies.
>
> THE MODERN FIX — `:focus-visible`. It shows a ring for keyboard users and
> hides it for mouse clicks, which was the actual objection all along. Style it
> in your brand colour and it stops being ugly.
>
> TEST IT — tab through your own site right now. If you lose track of where you
> are, so does everyone navigating by keyboard. Thirty seconds to find out.

```
#accessibility #a11y #webdev #css #frontenddeveloper #uidesign #inclusivedesign
#webdesign #uxdesign #webdevelopment #wcag #designtips #keyboardnavigation
#uiux #programming
```

---

## `tue-03-reduced-motion`

> Your parallax makes some people ill. Literally — nausea and dizziness. There's
> an OS setting for it and one media query that respects it.
>
> THE SETTING — Reduce Motion is a toggle in iOS, Android, macOS and Windows.
> People with vestibular disorders turn it on. Your site can read it. Most never
> ask.
>
> THE QUERY —
> ```
> @media (prefers-reduced-motion) {
>   * { animation: none; }
> }
> ```
> Blunt, but infinitely better than ignoring it.
>
> BETTER — don't remove, replace. A slide becomes a fade. A parallax becomes a
> static image. The interface still communicates state, it just stops moving
> through space.
>
> This is someone stating a medical need at the operating-system level.
> Overriding it is a choice, and it's the wrong one.

```
#accessibility #a11y #webdev #css #inclusivedesign #uxdesign #frontenddeveloper
#motiondesign #webdesign #wcag #webdevelopment #designtips #uidesign
#vestibular #uiux
```

---

## `tue-04-contrast`

> That grey text is unreadable outdoors. Light grey on white looks refined on
> your monitor and is a wall on a phone in sunlight.
>
> TWO RATIOS, MEMORISED —
> → 4.5:1 for body text
> → 3:1 for large text, icons and borders
> Below that isn't a style choice, it's a failure. Any contrast checker settles
> it in thirty seconds.
>
> THE TRAP — one accent colour usually can't do both jobs. A brand colour that
> passes 3:1 for borders often fails 4.5:1 under white text. That's not a reason
> to abandon it, it's a reason to have a second darker value for filled buttons.
>
> NOT JUST TEXT — a form field with a 1.5:1 border is invisible to a lot of
> people. Focus rings, disabled states and icons all need to clear the bar.
>
> THE REAL TEST — take it outside. Actual daylight, on your phone, at your normal
> brightness. That's the condition most of your traffic is in.

```
#accessibility #uidesign #colortheory #a11y #uxdesign #webdesign #wcag
#designtips #frontenddeveloper #inclusivedesign #webdev #contrast
#visualdesign #uiux #webdevelopment
```

---

## `tue-05-confirm`

> Sometimes the button should be harder to press. Not often — but there's a rule
> for exactly when, and most interfaces get it backwards.
>
> THE RULE — friction goes where undo can't reach.
>
> Ordinary buttons for anything reversible: save, filter, next step. Extra
> friction there is just an obstacle.
>
> A deliberate gesture for anything that can't be cleanly undone: sending a
> brief, continuing to payment, starting a subscription, deleting in admin.
> Four places on my own site. That's all.
>
> THE FAILURE — everywhere is the same as nowhere. A confirmation on every
> action gets clicked through by reflex within a day. Friction only works if
> it's rare enough to still be noticed.
>
> Match the effort to the consequence. Cheap actions should be effortless.
> Irreversible ones should ask you to mean it.

```
#uxdesign #uidesign #interactiondesign #productdesign #webdesign #designtips
#userexperience #frontenddeveloper #uiux #webdev #mobiledesign
#designsystem #webdevelopment #microinteractions #usability
```

---

## `tue-06-email`

> Your contact form works. Nothing arrives. Three DNS records decide whether
> your email is delivered or silently binned.
>
> WHY — email has no built-in proof of sender. Anyone can claim to be you.
> Without records saying who may send on your behalf, a receiving server has to
> guess, and it guesses conservatively.
>
> THE THREE —
> → SPF: which servers may send as you
> → DKIM: a signature proving it wasn't altered
> → DMARC: what to do when a check fails
> All three, or you're in the spam folder.
>
> THE OTHER HALF — don't send from a Gmail address. Use no-reply@yourdomain, on
> a domain you control, with those records in place. Sending as @gmail.com from
> your own server fails authentication by design.
>
> TEST IT TODAY — fill in your own contact form and see whether it lands. Broken
> email is the most expensive silent bug a small business runs.

```
#email #dns #webdev #devops #smallbusiness #deliverability #softwareengineering
#backend #webdevelopment #businesstips #spf #dkim #dmarc #programming
#buildinpublic
```

---

## `tue-07-backups`

> You have a backup. You've never restored it. Which means you don't have a
> backup — you have a file you hope works.
>
> THREE, TWO, ONE —
> → 3 copies of anything you can't recreate
> → 2 different media, not both on one machine
> → 1 offsite, because fire and theft take the building
> → 0 untested, which is the number that actually matters
>
> THE GAP — your host's backup is not your backup. It protects them from
> hardware failure. It rarely protects you from a bad deploy, a deleted account
> or a billing dispute, and you can't test it.
>
> THE TEST — restore it somewhere else, once, into a fresh environment, from the
> backup alone. Every assumption you didn't know you were making shows up in the
> first ten minutes.
>
> Nobody has ever regretted a tested backup.

```
#devops #backup #smallbusiness #sysadmin #softwareengineering #webdev
#disasterrecovery #businesstips #cloudcomputing #webdevelopment #it
#datamanagement #programming #buildinpublic #engineering
```

---

## `tue-08-errors`

> It failed. The user has no idea. The error is in your console; they're staring
> at a screen that looks fine.
>
> THE GAP — caught is not handled. `catch (e) { console.log(e) }` means nothing
> crashes, nothing works, and nobody is told. It's the most comfortable bug in
> software because it never wakes you up.
>
> WHAT TO SAY — plain words and a way out. Not the stack trace, not "an error
> occurred". What happened, whether their data survived, and what they can do
> now.
>
> PRESERVE THEIR WORK — if a submit fails, the form must still be full. Losing
> what someone typed converts a small failure into a lost customer.
>
> THE HABIT — design the failure path too. Every request that can fail needs a
> designed answer for when it does. That's the difference between a prototype
> and a product.

```
#webdev #softwareengineering #uxdesign #errorhandling #frontenddeveloper
#programming #javascript #webdevelopment #userexperience #designtips
#fullstackdeveloper #coding #uiux #devcommunity #productdesign
```

---

## `tue-09-naming`

> The hardest part is still naming things. Four rules that make a codebase
> readable by someone who wasn't there.
>
> 01 — NAME THE JOB, NOT THE TYPE. `userArray` and `dataObj` tell you what the
> language already told you. `pendingInvites` and `unpaidInvoices` say what's in
> it and why it exists.
>
> 02 — BOOLEANS SHOULD READ AS QUESTIONS. `isPaid`, `hasExpired`, `canEdit`. If
> the name doesn't answer yes or no when you read it aloud, every `if` using it
> will be ambiguous.
>
> 03 — LENGTH SHOULD MATCH SCOPE. A one-line loop can use `i`. A module-level
> export cannot. The further a name travels from where it's defined, the more
> work it has to do alone.
>
> 04 — IF YOU CAN'T NAME IT, YOU DON'T UNDERSTAND IT. A function that resists
> naming is usually doing two things. The naming problem is a design problem
> wearing a disguise.

```
#programming #cleancode #softwareengineering #webdev #codequality #javascript
#typescript #coding #developer #fullstackdeveloper #codereview
#webdevelopment #devcommunity #bestpractices #refactoring
```

---

## `tue-10-first-call`

> Twenty minutes decides whether this works. Here's what actually happens on a
> first call, and how to get value from it either way.
>
> NOT A PITCH — I'm asking, not selling. Who it's for, what they do today
> instead, what happens if nothing changes. If I'm talking more than you are,
> the call is going badly.
>
> WHAT TO BRING — three things, no deck:
> → A site you like, and why
> → Roughly what you can spend
> → When you need it live
> → Who has to approve it
>
> THE GOOD OUTCOME — sometimes it's "don't build this yet". If the answer is a
> spreadsheet, a phone number or a tool that already exists, I'd rather say so.
> A project that shouldn't exist is expensive for both of us.
>
> EITHER WAY you leave with a number: scope, price and a start month, or an
> honest reason it isn't a fit. No follow-up sequence, no pressure.

```
#freelance #clientwork #consulting #smallbusiness #businessowner #webdesign
#webdevelopment #entrepreneur #startup #founders #businesstips
#discoverycall #agency #digitalstrategy #solopreneur
```

---

## `tue-11-done`

> "Done" is the most expensive word in this job, unless both people define it
> the same way before anyone starts.
>
> NOT DONE — built isn't done. Deployed isn't done. Looks right on a laptop
> isn't done. Each of those is a milestone someone has mistaken for a finish
> line.
>
> DONE — someone else can use it, and change it:
> → Live, on your domain
> → Fast on a phone, in daylight
> → You can edit it without me
> → Domain, repo and accounts are yours
>
> THE HANDOVER — not a zip file and good luck. Access to everything, written
> down, plus enough of a walkthrough that the next person — including a future
> developer who isn't me — can pick it up.
>
> Agree the finish line first. Four lines at the start prevents the entire
> argument at the end, and it's the cheapest thing in the whole project.

```
#freelance #clientwork #projectmanagement #consulting #webdevelopment
#smallbusiness #businessowner #webdesign #entrepreneur #agency
#businesstips #founders #startup #digitalstrategy #buildinpublic
```

---

## `tue-12-fixed-price`

> Hourly billing punishes me for getting faster. Here's the honest argument for
> a fixed price, including where it costs me.
>
> THE CONFLICT — under hourly, every efficiency I gain reduces what I earn. Ten
> years of experience should make the work better AND cheaper. Hourly makes it
> just cheaper, for me.
>
> FOR YOU — a fixed number is a decision you can actually make. An hourly
> estimate is a range you find out the truth about afterwards.
>
> WHAT IT COSTS ME — I eat my own bad estimates. If I misjudge the work, that's
> mine to absorb, not yours to fund. Which is exactly why I scope carefully
> before quoting: the incentive points the right way.
>
> THE TRADE — scope is fixed too, and that's fair. The price holds because what
> we agreed holds. New ideas go on a list for version two rather than into this
> build.

```
#freelance #pricing #consulting #smallbusiness #businessowner #entrepreneur
#webdesign #webdevelopment #businesstips #founders #agency #startup
#solopreneur #clientwork #digitalstrategy
```

---

## Posting notes

**Order.** Craft decks carry furthest because they're saveable and useful to
people who will never hire you. Engineering decks prove depth. Business decks
convert the audience the first two build.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `tue-01-motion` | Strongest craft hook, immediately testable |
| 2 | `tue-06-email` | Broad panic value — everyone has a contact form |
| 3 | `tue-02-focus` | Accessibility with a one-line villain |
| 4 | `tue-09-naming` | Developer-native, very high save rate |
| 5 | `tue-04-contrast` | Practical, pairs with deck 3 |
| 6 | `tue-08-errors` | Craft and engineering both |
| 7 | `tue-03-reduced-motion` | The one with a moral spine |
| 8 | `tue-07-backups` | Boring subject, memorable hook |
| 9 | `tue-05-confirm` | Design thinking, shows judgement |
| 10 | `tue-10-first-call` | First real sell |
| 11 | `tue-11-done` | Sets expectations before the close |
| 12 | `tue-12-fixed-price` | The close |

- **Slide 01 is the cover** — the feed thumbnail, and the only slide most people
  will ever see.
- **Check the order before posting.** Filenames end `-01` to `-05`. Instagram
  honours tap order once you start selecting, so confirm the sequence.
- **Alt text:** headlines are baked into the image, so screen readers get
  nothing without it. Paste each slide's headline into Instagram's alt text
  field (Advanced settings → Write alt text). Decks 2, 3 and 4 argue for
  accessibility — posting them without alt text would undercut the point.
- Rotate hashtag sets rather than reusing one block.
