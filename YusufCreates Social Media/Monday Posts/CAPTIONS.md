# Captions — Monday Posts

Handle: **@yusufcreatesdev** · 10 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

---

## `mon-01-secrets`

> Your API key might be in your page source right now. One prefix decides
> whether a variable stays on your server or ships to every visitor.
>
> THE RULE — anything prefixed `NEXT_PUBLIC_` is inlined into the JavaScript
> bundle. Not hidden, not obfuscated: downloaded by everyone who opens your
> site. Prefix a secret to use it in a component and you have published it.
>
> CHECK IT — build your site, then grep the output:
> `grep -r 'sk_live' .next/static`
> No matches is good. Any match at all means rotate that key today.
>
> AUTOMATE IT — add a `postbuild` script that scans the bundle for known key
> shapes and exits non-zero on a hit. Mine runs on every build, so a leak
> physically cannot deploy.
>
> Discipline fails eventually. A script that exits non-zero doesn't.

```
#websecurity #nextjs #webdev #devops #softwareengineering #security
#programming #javascript #buildinpublic #devtools #apisecurity
#fullstackdeveloper #webdevelopment #coding #devcommunity
```

---

## `mon-02-webhooks`

> The customer paid. My system never knew. A webhook bug I shipped, found and
> fixed — and it's the most common way payments break.
>
> THE BUG — I subscribed to the wrong events. Money moved, the card cleared, the
> customer got a receipt. My webhook wasn't listening for the event that says so,
> so nothing downstream ever ran.
>
> WHY IT HIDES — nothing errors. No exception, no failed request, no alert. Just
> an event nobody subscribed to and an order that quietly never existed. You
> find out when a customer emails asking where their thing is.
>
> THE FIX — handle failure as carefully as success:
> → Payment succeeded, fulfil it
> → Payment failed, tell them why
> → Refund issued, reverse it
> → Subscription cancelled, stop billing
>
> Every other bug annoys someone. This one takes their money and gives nothing
> back.

```
#stripe #payments #webdev #softwareengineering #debugging #saas #backend
#programming #buildinpublic #fullstackdeveloper #devcommunity #api
#webdevelopment #ecommerce #engineering
```

---

## `mon-03-rate-limit`

> Your contact form is an open invoice. Anything public that costs you money per
> call needs a limit, and most sites have none.
>
> THE MATHS — a form that sends an email costs a fraction of a penny. Ten
> thousand submissions overnight is a real bill, a blocked sending domain, and
> an inbox nobody can use.
>
> WORSE — an AI endpoint with no cap is somebody else's free API, billed to you.
> That's not pennies.
>
> THE FIX — limit by IP first, then by account. A few requests per minute is
> invisible to a real person and fatal to a script. Then add a spend cap at the
> provider, because that's the backstop that actually holds when the limit is
> bypassed.
>
> THE HABIT — for every public endpoint, ask what it costs to call before it
> ships. If the answer is money, it needs a limit — not a plan to add one after
> the bill arrives.

```
#websecurity #backend #api #devops #softwareengineering #webdev #saas
#programming #cloudcosts #buildinpublic #fullstackdeveloper #engineering
#devtools #webdevelopment #devcommunity
```

---

## `mon-04-lead-scoring`

> Every enquiry that reaches me gets a score out of 100. Not to rank people — to
> make sure the right ones get answered first.
>
> THE INPUTS — budget, urgency and fit, multiplied together. A long, specific
> message scores up, because someone who wrote three paragraphs about their
> problem has genuinely thought about it.
>
> THE BANDS —
> → Hot, 60 and above: answered today
> → Warm, 32 to 59: answered this week
> → Cold, under 32: answered, just later
>
> THE SAFEGUARD — undecided isn't uninterested. Someone who hasn't settled a
> budget but is clearly serious gets floored into warm rather than dropping to
> cold. The most valuable client I could have is often the one still working it
> out.
>
> Everyone gets a reply. The order is the only variable, and with two build
> slots, triage is the difference between fast and arbitrary.

```
#buildinpublic #saas #freelance #crm #automation #smallbusiness
#softwareengineering #webdevelopment #entrepreneur #startup #sales
#indiehacker #programming #consulting #devcommunity
```

---

## `mon-05-structured-data`

> Google is guessing what your site is. There's a way to just tell it, and most
> sites skip it entirely.
>
> THE IDEA — JSON-LD. A block of machine-readable JSON in your page that says,
> unambiguously, what this is: a professional service, an article, a product,
> a recipe, an event.
>
> WHAT IT BUYS — the rich result instead of the plain blue link. Star ratings,
> prices, opening hours, FAQ accordions in the results page. Every one of those
> is structured data, not luck.
>
> THE CATCH — it has to be true. Marking up reviews you don't have is a manual
> penalty, not a clever trick. Describe what's genuinely on the page and nothing
> else.
>
> START HERE — one Organization or LocalBusiness block on your homepage, then
> Article on your posts. Test it in Google's Rich Results tool before you ship.
> Ten minutes, and it's the highest-leverage SEO work most sites never do.

```
#seo #structureddata #jsonld #webdev #technicalseo #searchengineoptimization
#webdevelopment #digitalmarketing #nextjs #programming #smallbusiness
#marketing #webdesign #buildinpublic #googlesearch
```

---

## `mon-06-images`

> Your site is slow because of one photo. Almost always — and it's the easiest
> thing on the page to fix.
>
> THE SIZE — a phone camera shoots for print. Straight from the camera is around
> 4MB; resized and converted it's about 80KB. Nobody needs a 4000px wide image
> in a 600px wide column.
>
> THE FORMAT — JPEG isn't the only option any more. WebP and AVIF are
> dramatically smaller at the same quality and every browser that matters
> supports them. Most frameworks convert for you if you let them.
>
> THE JUMP — always set width and height. Without them the browser reserves no
> space, so everything below shifts when the image lands. That jump is the most
> common reason a fast site feels cheap.
>
> THE ORDER — lazy-load everything below the fold. Load what they can see,
> defer the rest.
>
> Four changes, no redesign, and usually the biggest speed win available to you.

```
#webperformance #webdev #frontenddeveloper #corewebvitals #webdesign
#optimization #uxdesign #javascript #webdevelopment #seo #performance
#nextjs #programming #designtips #buildinpublic
```

---

## `mon-07-mobile-nav`

> Your menu works perfectly. On a mouse. Four things that break navigation on a
> phone, all cheap to fix.
>
> SIZE — a finger isn't a cursor. Tap targets need roughly 44×44 points. A 20px
> icon with no padding is a coin toss, and the miss lands on whatever's next to
> it.
>
> REACH — phones got taller; thumbs didn't. Primary actions belong in the lower
> half of the screen, where the hand already is.
>
> HOVER — there is no hover on a phone. A dropdown that opens on hover either
> never opens, or opens on the tap that was meant to navigate. Both are broken,
> and the second is worse because it looks fine on your laptop.
>
> ESCAPE — every menu needs a way out. Close button, tap outside, and the back
> gesture. A full-screen menu with no exit is a trap, and the exit becomes the
> browser's back button.
>
> Open your own site on your phone and try all four.

```
#mobilefirst #uxdesign #uidesign #webdesign #frontenddeveloper #webdev
#responsivedesign #accessibility #designtips #userexperience #webdevelopment
#mobiledesign #uiux #productdesign #css
```

---

## `mon-08-no-cookie-banner`

> Nobody wants your cookie banner. You can usually delete it — it exists because
> of what you chose to measure.
>
> WHY IT EXISTS — the banner isn't legal decoration. It's required because the
> analytics you installed follows individuals across sites. Change that, and the
> requirement goes with it.
>
> THE SWAP — count visits, not people. Tracking uses cookies and cross-site
> identifiers, needs consent, and gets blocked anyway. Aggregate analytics gives
> you pages, referrers and countries with no identifiers and no banner.
>
> WHAT YOU LOSE — honestly, some of it matters: individual user journeys and
> long attribution windows. If you're running paid acquisition at scale you may
> genuinely need those. Most sites aren't, and never look at them.
>
> WHAT YOU GAIN — a faster site, no consent modal, and numbers that aren't
> distorted by blockers. It's in every Growth build and above.

```
#privacy #analytics #webdesign #gdpr #webdev #uxdesign #digitalmarketing
#webdevelopment #cookieless #smallbusiness #marketing #dataprivacy
#websitedesign #buildinpublic #userexperience
```

---

## `mon-09-deposit`

> I take 40% before I start. Here's exactly what that protects — on both sides.
>
> THE SPLIT —
> → 40% up front books the slot and starts the build
> → Live URL in week one
> → 60% on delivery, before handover completes
> → Handover means the domain, the repo and the accounts, in your name
>
> WHAT IT PROTECTS FOR ME — two builds at a time means saying no to other work
> to hold your place. A deposit makes that commitment mutual rather than a
> favour.
>
> WHAT IT PROTECTS FOR YOU — you're never more than 40% in before you've seen
> something real, because the site is live in week one. If it's going wrong, you
> find out early and cheaply.
>
> And the rest is fixed. No hourly billing, no surprise invoice at the end. The
> number we agree before I start is the number.

```
#freelance #clientwork #smallbusiness #businessowner #consulting #pricing
#entrepreneur #webdesign #webdevelopment #businesstips #contracts
#founders #startup #agency #solopreneur
```

---

## `mon-10-scope`

> "Can we just add one small thing?" Said nine times, it's a different project.
>
> WHY IT HAPPENS — nobody's being difficult. Seeing something real generates
> ideas you couldn't have had in a brief. That's the process working. The
> failure is having nowhere to put those ideas.
>
> THE FIX — a list, not a debate. Everything new goes on a written list instead
> of into this build. Nothing is rejected and nothing is smuggled in. Most of it
> turns out to matter less than it did on the day.
>
> VERSION TWO —
> → Ship what was agreed, on time
> → Launch, and watch real usage
> → Half the list stops mattering
> → Build the half that still does
>
> THE HONEST BIT — scope creep is usually a vague brief. If we both know what
> success looks like before I start, there's far less to renegotiate later.
> That's why the brief matters more than the contract.

```
#freelance #projectmanagement #clientwork #consulting #smallbusiness
#businessowner #entrepreneur #webdesign #webdevelopment #agency
#businesstips #founders #startup #scopecreep #digitalstrategy
```

---

## Posting notes

**Order.** Engineering decks are the reach engine here — they teach something
concrete and travel beyond your existing audience. Craft decks convert that
attention into saves. Business decks close.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `mon-01-secrets` | Strongest hook — a real risk most people haven't checked |
| 2 | `mon-06-images` | Broadest craft appeal, immediately actionable |
| 3 | `mon-02-webhooks` | Specific, credible, memorable |
| 4 | `mon-07-mobile-nav` | High save rate |
| 5 | `mon-05-structured-data` | SEO reach beyond the dev audience |
| 6 | `mon-03-rate-limit` | Engineering, pairs with deck 1 |
| 7 | `mon-08-no-cookie-banner` | Opinionated, and it sells a real feature |
| 8 | `mon-04-lead-scoring` | Build-in-public proof |
| 9 | `mon-10-scope` | Positioning, ahead of the close |
| 10 | `mon-09-deposit` | The close — terms, plainly stated |

- **Slide 01 is the cover** — the feed thumbnail, and the only slide most people
  will ever see.
- **Check the order before posting.** Filenames end `-01` to `-05`. Instagram
  honours tap order once you start selecting, so confirm the sequence.
- **Alt text:** headlines are baked into the image, so screen readers get
  nothing without it. Paste each slide's headline into Instagram's alt text
  field (Advanced settings → Write alt text).
- Rotate hashtag sets rather than reusing one block.
