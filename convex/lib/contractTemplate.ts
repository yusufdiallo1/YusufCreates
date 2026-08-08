/**
 * The starting contract, seeded as version 1.
 *
 * DELIBERATELY NOT A LEGAL DOCUMENT. No governing law, no jurisdiction, no
 * limitation-of-liability boilerplate, no defined terms in capitals. It is a
 * plain-English working agreement: what is being built, what is not, what I am
 * not responsible for, what it costs and when, who owns the domain and the
 * code, and what I need from the client.
 *
 * That is a real trade and worth naming: boilerplate is what a court reads
 * when a deal goes badly wrong, and this has none. What it buys instead is a
 * document a client will actually read before signing — which prevents far
 * more disputes than it loses. The signature record attached to it (IP,
 * timestamp, consent, hash of this exact text) is unchanged either way.
 *
 * WRITTEN WITHIN THE MARKDOWN SUBSET src/lib/markdown.tsx renders. No tables,
 * no nested lists, no images — the renderer supports none of them, and
 * extending a renderer the blog also uses to serve one document is the wrong
 * trade. Anything that wants to be a table is a flat list here.
 */

export const SEED_TEMPLATE_NAME = "Project Agreement";

export const SEED_CONTRACT_BODY = `# Project Agreement

Between **{{supplierName}}**{{supplierTradingClause}} — "I" and "me" below — and **{{clientName}}**{{clientCompanyClause}}, "you".

This covers the work quoted in proposal **{{proposalReference}}**. It starts when you sign it.

---

## What I'm building

**{{siteType}}.**

{{projectScope}}

If it isn't written above or in the proposal, it isn't included. That's not me being difficult — it's so neither of us is surprised later.

## What's not included

{{exclusions}}

Anything here can be added. It just needs agreeing in writing first, and it will be quoted separately.

## What I'm not responsible for

I build the thing well. I can't be responsible for:

- **Anything you supply.** Text, images, logos, video — if you don't have the right to use it, that's on you, not me.
- **Services I don't run.** Hosting outages, domain registrars, payment providers, email deliverability, analytics, third-party plugins and APIs. If one of them breaks, I'll help you sort it, but I didn't build it.
- **Results.** Traffic, rankings, conversions, sales. I'll build something fast, accessible and sensibly structured. Nobody can promise what the market does with it.
- **Changes made after handover.** Once the code is yours, if you or someone else edits it and something breaks, fixing that is separate work.
- **Losses beyond what you paid me.** If something does go wrong, what I owe you is capped at what you've paid for the project. I won't be liable for lost profit, lost data or knock-on costs.

None of this is me dodging. If I break something, I fix it.

## What it costs

Total: **{{currency}} {{totalAmount}}**.

1. **{{currency}} {{depositAmount}}** — 40%, before I start. Work begins when it clears.
2. **{{currency}} {{balanceAmount}}** — 60%, when the work is done and before the final files move across.

Invoices are due within 14 days. The deposit isn't refundable once I've started, because it's holding time in my calendar that I've turned other work away for.

## Timeline

{{timeline}}

Starting {{startDate}}.

That assumes you get me what I need when I ask. If you're a week late with feedback, the end date moves by at least a week — I'll usually have booked that time to someone else.

## Revisions

**{{revisionLimit}}** rounds are included.

A round is one set of feedback, gathered up and sent together, and me acting on it. Sending me eleven separate messages over three days is fine, as long as they arrive before I start that round.

Not revisions:

- Changing direction after you've approved that direction
- New pages, screens or features that weren't in the scope
- Going back to something you'd already rejected
- Redoing work because the information I was given was wrong

## Your domain

**{{domain}}**

The domain is yours. You register it, you pay for it, and it stays in your account in your name — I'll never hold a client's domain hostage, and I don't want to be the reason your site goes down because a renewal I forgot about lapsed.

I'll happily do the DNS setup. Give me access when we get to that point.

## Hosting

Hosting is in your name and billed to you, for the same reason as the domain. I'll recommend something appropriate and set it up.

If you'd rather I host it under my account, that's a separate arrangement with a monthly cost — ask and I'll quote it.

## The code

The code is yours once the final payment clears. Not before.

When it does:

- You get the repository, the full history, and whatever it takes to run and deploy it
- You can change it, extend it, or have someone else take it over — no permission needed
- I'll keep a copy for my own records unless you ask me not to

Two things stay mine, and you get to use both forever as part of your site: my own reusable components and tooling that predate your project, and anything I've built for general use rather than specifically for you.

Third-party things — fonts, stock images, paid plugins, APIs — keep their own licences. Where one needs paying for on an ongoing basis, that's yours after handover. I'll tell you which ones before we get there.

Until the final payment clears, none of it is licensed to you, including anything you've seen in progress.

## What I need from you

- Content, images, brand files, logins and access, in a usable state
- Answers on feedback and sign-off within **{{feedbackDays}} working days**
- One person who can actually approve things — design by committee is what makes projects overrun
- Invoices paid on time

If I don't hear from you for 30 days, I'll treat the project as paused and give your slot to someone else. Picking it back up means a new timeline and possibly a restart fee.

## Showing the work

I'd like to show the finished site in my portfolio. If you'd rather I didn't, or need me to wait until you've launched, just say — it's a no either way and I won't ask twice.

## Keeping things private

Anything you tell me that isn't public stays between us, and I'll only use it for this project. Same the other way. That holds for two years after we finish.

## Cancelling

Either of us can stop, in writing, at any time.

If you stop: the deposit covers what I've done up to that point. If I've done more than the deposit covers, I'll invoice the difference. If less, we're square and I keep the deposit. Nothing transfers to you.

If I stop: I refund whatever part of the deposit I haven't earned, and we're square.

Either way, neither of us owes the other anything beyond that.

## Changing this agreement

Anything in here can change. It just has to be in writing and we both have to agree to it. A conversation isn't a change.

## Signing

Signing this electronically counts. When you sign, the date and time, your network address and browser, and a fingerprint of this exact text are recorded and attached to it — so we both have proof of what was agreed and when.
`;

/**
 * The wording the client ticks, stored verbatim on the contract.
 *
 * Stored rather than referenced, because "they consented" is worth nothing
 * without "to this". If this string is ever reworded, every contract signed
 * before the change still carries the words its signer actually saw.
 */
export const CONSENT_TEXT =
  "I've read this agreement and I'm signing it electronically. I understand " +
  "that counts the same as signing it by hand.";

/** Placeholder that blocks generation until it is replaced. */
export const UNSET_MARKER = "[SET THIS]";
