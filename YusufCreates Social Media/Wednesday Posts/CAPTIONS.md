# Captions — Wednesday Posts

Handle: **@yusufcreatesdev** · 10 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

---

## `wed-01-404`

> Somebody landed on your 404 today. It said "Page not found" and they left.
> That page is a rescue, not an apology.
>
> WHO SEES IT — not just broken links. Old links from other sites, a mistyped
> URL, a page you deleted, an email from two years ago. These are people
> actively trying to reach you, and you're showing them a dead end.
>
> THE JOB — get them somewhere:
> → A link to the page they probably wanted
> → Search, if you have it
> → Your main navigation, still visible
> → A way to contact you
>
> THE OTHER ONE — 500 is worse and rarer. A 404 means they asked for something
> missing; a 500 means you broke. That page needs a plain apology, a retry, and
> a way to reach a human — and it must not depend on the thing that just failed.
>
> Go and type a URL that doesn't exist on your own site.

```
#webdesign #uxdesign #webdev #frontenddeveloper #userexperience #designtips
#webdevelopment #uidesign #errorpages #smallbusiness #websitedesign
#conversion #uiux #productdesign #websitetips
```

---

## `wed-02-link-preview`

> Someone shared your site and it looked broken. A grey box and a URL — the
> preview card is the first thing most people ever see of you.
>
> WHERE IT SHOWS — WhatsApp, Slack, iMessage, LinkedIn, X. Your carefully
> designed homepage is irrelevant if the card pasted into a group chat is empty.
>
> THE TAGS — four lines of metadata:
> → og:title — what it is
> → og:description — why they'd click
> → og:image — 1200×630
> → og:url — the canonical one
> Miss any and the platform guesses. It usually guesses badly.
>
> BETTER — generate it, don't draw it. A per-page image built at request time
> means every post and project gets its own card with its own title, instead of
> one generic logo everywhere.
>
> TEST IT — paste your own URL into a chat with yourself. Whatever appears is
> what everyone sharing your site is showing their friends.

```
#webdev #seo #socialmedia #webdesign #opengraph #marketing #frontenddeveloper
#digitalmarketing #webdevelopment #nextjs #smallbusiness #uidesign
#contentmarketing #websitetips #branding
```

---

## `wed-03-robots`

> Two tiny files decide what Google indexes. Most sites have neither — or have
> one that quietly blocks the entire site.
>
> ROBOTS.TXT is permission, not security. It tells well-behaved crawlers what to
> skip. It hides nothing: a page listed as disallowed is still public, and
> you've just published its address.
>
> THE DISASTER — `User-agent: * / Disallow: /` is correct on staging and
> catastrophic in production. Sites really do launch with the staging block
> still in place, and the only symptom is never appearing in search.
>
> SITEMAP.XML is a list of what you actually have, with last-modified dates.
> Generate it from your routes so it can't go stale — a hand-written sitemap is
> wrong within a month.
>
> Go and visit yourdomain.com/robots.txt right now. It takes five seconds.

```
#seo #technicalseo #webdev #searchengineoptimization #digitalmarketing
#webdevelopment #smallbusiness #marketing #websitetips #googlesearch
#nextjs #webdesign #businesstips #programming #buildinpublic
```

---

## `wed-04-indexes`

> It was fast in development. It's slow now. Almost always the same cause, and
> it doesn't show up until you have real data.
>
> WHY — a hundred rows hide everything. Without an index the database reads
> every row to answer every query. At development scale that's free; at a
> hundred thousand rows it's the whole bill.
>
> THE FIX — index what you filter and sort by. Any column in a where clause or
> an order-by is a candidate. My own schema carries 48 of them, not because it's
> huge, but because every query was written with one in mind.
>
> THE COST — indexes aren't free. Each one makes writes slower and storage
> bigger. Indexing every column is as thoughtless as indexing none.
>
> THE HABIT — seed your development database with ten thousand rows, not ten.
> Performance problems that only appear in production are usually problems you
> refused to look for.

```
#database #backend #softwareengineering #webdev #performance #sql #postgres
#programming #fullstackdeveloper #webdevelopment #optimization #devcommunity
#coding #engineering #buildinpublic
```

---

## `wed-05-timezones`

> Your date is wrong for someone. Time zones are where confident developers go
> to be humbled.
>
> THE RULE — store UTC, always. One canonical instant in the database,
> converted to local time only when it's displayed. Storing local time throws
> away the information you need to convert it correctly later.
>
> THE BUG — midnight is a different day elsewhere. A deadline stored as a date
> with no time is midnight somewhere, and already yesterday for a user eight
> hours ahead. That's how "expires today" fires a day early.
>
> THE OTHER ONE — servers lie about now. Rendering a date on the server and
> again in the browser produces two different strings when their zones differ.
> That's a hydration mismatch, and it's the most common one there is.
>
> THE HABIT — set your laptop to Tokyo for an afternoon and use your own app.
> Every date bug you have will surface within ten minutes.

```
#softwareengineering #webdev #javascript #programming #backend #debugging
#fullstackdeveloper #typescript #webdevelopment #coding #devcommunity
#nextjs #engineering #bestpractices #buildinpublic
```

---

## `wed-06-no-rag`

> My site has an AI assistant and no vector database. That was a decision, not
> an oversight.
>
> THE DEFAULT — everyone reaches for RAG. Chunk the content, embed it, store the
> vectors, retrieve the relevant ones per question. For a large corpus that's
> correct.
>
> THE MATHS — my knowledge base is a few dozen question-and-answer pairs. It all
> fits in the prompt. Adding retrieval would mean infrastructure, latency and a
> whole class of retrieval bugs, to solve a problem I don't have.
>
> THE TRADEOFF — this stops working at scale. At a few thousand documents I'd
> need retrieval, and I'd build it then.
>
> THE LESSON — the best architecture is the smallest one that still works.
> Choosing the impressive answer over the sufficient one is how projects get
> expensive without getting better.
>
> What's the most over-engineered thing you've shipped?

```
#ai #softwarearchitecture #buildinpublic #softwareengineering #llm #rag
#webdevelopment #programming #startup #indiehacker #engineering
#simplicity #devcommunity #fullstackdeveloper #aiengineering
```

---

## `wed-07-prompt-cache`

> One character can double your AI bill. A subtle caching rule that catches
> almost everyone building with an LLM.
>
> THE MECHANISM — send the same opening block and the provider can reuse its
> work instead of reprocessing it. Long system prompts get dramatically cheaper,
> as long as they're byte-identical between requests.
>
> THE BUG — a timestamp breaks it. So does a session id, a user name, or
> anything else varying at the front. Every request becomes unique, so nothing
> ever matches the last one and your cache hit rate is zero.
>
> THE FIX — static first, variable after. Everything that changes belongs in the
> messages array, not the system prompt. Mine is assembled by a single function
> precisely so it can't drift between requests.
>
> CHECK IT — your provider reports the hit rate. If it's near zero and your
> prompt is long, something in the prefix is varying and you're paying full
> price on every call.

```
#ai #llm #aiengineering #softwareengineering #webdev #programming #openai
#anthropic #costoptimization #buildinpublic #devcommunity #backend
#fullstackdeveloper #engineering #aitools
```

---

## `wed-08-proof`

> "Great to work with!" — J.S. Nobody believes that. Anonymous praise reads as
> invented, because most of it is.
>
> WHAT MAKES IT REAL — a name and a face. Full name, role, company, photo. Every
> initial you replace with a letter halves the credibility, and an unnamed quote
> is worth roughly nothing.
>
> BETTER THAN PRAISE — a number they can check. "Live in three weeks, enquiries
> doubled" beats "great to work with", because it's a claim with edges. It could
> be wrong, which is exactly why it reads as true.
>
> THE BEST PROOF — something they can open. A live URL beats any quote. Anyone
> can write a testimonial; not everyone can point at working software and say I
> built that.
>
> IF YOU HAVE NONE — say so, and show the work. Early on, honesty plus a real
> project beats a wall of invented praise. People are much better at spotting
> fake social proof than we assume.

```
#marketing #smallbusiness #freelance #socialproof #businessowner #webdesign
#entrepreneur #copywriting #conversion #businesstips #startup #branding
#digitalmarketing #consulting #cro
```

---

## `wed-09-handover-docs`

> The next developer might not be me. That's exactly why the handover has to be
> written down.
>
> NOT THIS — a folder of screenshots. Documentation describing where buttons are
> goes stale the first time anything moves, and it's the part nobody reads.
>
> THIS — the things nobody can guess:
> → Where everything is hosted
> → Which environment variables exist, and why
> → How to deploy, exactly
> → The decisions that look wrong but aren't
>
> THAT LAST ONE MATTERS MOST. Every codebase has something that looks like a
> mistake and isn't. Unexplained, the next person will "fix" it and break
> something they can't see.
>
> THE TEST — could a stranger deploy it? If the answer needs a phone call to me,
> it isn't handed over. That's the bar, and it's also what stops a client being
> quietly locked in.

```
#documentation #softwareengineering #freelance #clientwork #webdevelopment
#devcommunity #programming #consulting #bestpractices #engineering
#businesstips #handover #buildinpublic #coding #agency
```

---

## `wed-10-starting-out`

> Nobody is waiting for your portfolio. Five things I'd tell anyone trying to
> get their first paid work.
>
> 01 — SHIP SOMETHING SMALL, PUBLICLY. One live URL beats ten tutorials
> finished. Nobody can open a course certificate, and nobody hires from one.
>
> 02 — FREE WORK HAS A COST. It sets the price, and a client who paid nothing
> values it accordingly. Build your own thing for free instead — at least then
> you own it.
>
> 03 — CHARGE BEFORE YOU FEEL READY. You never feel ready. The gap between your
> first paid project and your tenth is enormous, and the only way across it is
> the first one.
>
> 04 — FINISH THINGS. A finished small thing beats an abandoned ambitious one.
>
> 05 — PUBLISH YOUR PRICES. The enquiries you lose to a visible price were never
> going to buy.
>
> What would you add?

```
#freelance #careeradvice #webdevelopment #learntocode #buildinpublic
#developer #startup #entrepreneur #indiehacker #devcommunity #programming
#webdesign #solopreneur #businesstips #juniordev
```

---

## Posting notes

**Order.** The "invisible files" decks are the strongest openers — they describe
something the reader can check on their own site in seconds, which is the
highest-converting kind of post. Engineering decks prove depth. Business decks
close.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `wed-02-link-preview` | Instantly checkable, and slightly alarming |
| 2 | `wed-01-404` | Same shape, universally applicable |
| 3 | `wed-05-timezones` | Developer-native, very high save rate |
| 4 | `wed-03-robots` | SEO reach beyond the dev audience |
| 5 | `wed-08-proof` | Business, useful to everyone |
| 6 | `wed-04-indexes` | Engineering depth |
| 7 | `wed-07-prompt-cache` | Timely, and genuinely little-known |
| 8 | `wed-06-no-rag` | Opinionated — the one most likely to start an argument |
| 9 | `wed-09-handover-docs` | Positioning, ahead of the close |
| 10 | `wed-10-starting-out` | Broadest reach, ends the run generously |

- **Slide 01 is the cover** — the feed thumbnail, and the only slide most people
  will ever see.
- **Check the order before posting.** Filenames end `-01` to `-05`. Instagram
  honours tap order once you start selecting, so confirm the sequence.
- **Alt text:** headlines are baked into the image, so screen readers get
  nothing without it. Paste each slide's headline into Instagram's alt text
  field (Advanced settings → Write alt text).
- Rotate hashtag sets rather than reusing one block.
