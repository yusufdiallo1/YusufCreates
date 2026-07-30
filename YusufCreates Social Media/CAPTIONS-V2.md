# Captions — v2 (graphic decks)

Handle: **@yusufcreatesdev** · 12 carousels · 5 slides each · 1080×1350 (4:5)

Instagram truncates around 125 characters, so the first line of each caption is
written to stand alone before the "more" cut.

Decks v2-01 to v2-04 reuse the captions in `CAPTIONS.md` (decks 12–15), and
v2-05/v2-06 reuse decks 7 and 9. New captions for v2-07 onward are below.

---

## `v2-07-rewind`

> Claude Code broke your code? Press Esc twice. There's an undo for the last
> hour and most people don't know it exists.
>
> CHECKPOINTS — it snapshots your files before every message you send.
> Automatically, all session, no setup. It keeps the 100 most recent, saved with
> the conversation, so /rewind still works after you resume.
>
> HOW — double-Esc with an empty input, or type /rewind. Then pick a point and
> choose: restore code and conversation, conversation only, code only, or
> summarise from there to free up context.
>
> THE CATCH — two things it will NOT undo:
> → Bash changes. `rm`, `mv`, `cp` aren't checkpointed.
> → Subagent edits. They land outside your session's checkpoints.
> Only direct edits from Claude's own file tools are tracked.
>
> And it's local undo, not git. Checkpoints are deleted with the session after
> 30 days. Commit anyway.
>
> Did you know this existed?

```
#claudecode #aicoding #developertools #codingtips #devworkflow #programming
#softwareengineer #buildinpublic #terminal #devtools #productivity
#webdev #codinglife #anthropic #devcommunity
```

---

## `v2-08-permission-modes`

> You're clicking approve 200 times a day. There's a key for that: Shift+Tab.
>
> It cycles permission modes, and most people never press it:
>
> → default — asks before it touches anything
> → acceptEdits — files yes, commands still ask
> → plan — reads and proposes, writes blocked
> → auto — runs, with a classifier watching
>
> PLAN MODE is the one to learn first. It explores the codebase and comes back
> with a plan; nothing is written until you approve. Best mode for a task you
> can't yet describe precisely.
>
> AUTO MODE isn't "no supervision" — a classifier still blocks the things you'd
> regret: deploys, mass deletions, force pushes, anything leaking secrets.
>
> The habit: match the mode to the risk. Plan for anything architectural.
> acceptEdits for a refactor you understand. default when you're somewhere
> unfamiliar.
>
> One keypress, not a setting you forget.

```
#claudecode #aicoding #developerproductivity #codingworkflow #devtools
#softwaredevelopment #programming #terminal #cli #buildinpublic
#techtips #webdev #engineeringculture #devcommunity #productivity
```

---

## `v2-09-context`

> It forgot what you told it an hour ago. Not a bug — you ran out of context,
> and there are two different fixes people constantly mix up.
>
> /clear — starts a new conversation with empty context. Use it BETWEEN
> unrelated tasks.
>
> /compact — summarises and keeps going in the same session. Use it MID-TASK
> when the window is filling up.
>
> Both keep CLAUDE.md. Your instructions are never what gets dropped.
>
> SEE IT FIRST — /context shows a coloured grid of what's actually filling the
> window: which tools, which files, how much memory. Usually it's one enormous
> file you pasted an hour ago.
>
> SHARPER — in the /rewind menu, "Summarize from here" compresses a verbose
> debugging stretch while leaving your original instructions intact. Better than
> compacting the lot.
>
> The habit: most context problems are one long session doing four unrelated
> jobs. Finish a thing, /clear, start the next one clean.

```
#claudecode #aitools #developertools #codingtips #devworkflow #programming
#softwareengineer #contextwindow #buildinpublic #devtools #webdev
#codinglife #productivity #techtips #devcommunity
```

---

## `v2-10-headless`

> Claude Code runs without the chat window. One flag turns it into something you
> can script, and almost nobody uses it.
>
> `claude -p "summarise today's commits"`
>
> Non-interactive. Runs, prints, exits — like any other command.
>
> STRUCTURED — add `--output-format json` and you can pipe it into anything.
> Add `--max-budget-usd 2.00` so a loop can't run away with your bill.
>
> WHAT FOR — the jobs nobody wants to do:
> → Release notes from the commit log
> → A first-pass review on every PR
> → Triaging what broke overnight
> → Codemods across a hundred files
>
> The moment it runs in a script, it stops being something you visit and starts
> being part of how the project builds itself.
>
> What would you automate first?

```
#claudecode #devops #automation #cicd #developertools #cli #terminal
#softwareengineering #buildinpublic #programming #devworkflow #scripting
#aicoding #devtools #engineering
```

---

## `v2-11-fast-sites`

> Your site loads fast. It still feels slow. Speed you measure and speed people
> feel are two different things.
>
> THE JUMP — an image without width and height reserves no space, so the text
> under it jumps when it arrives. The single most common reason a fast site
> feels cheap.
>
> FONTS — a web font loading without a fallback strategy leaves the page blank,
> then repaints. font-display and a matched fallback metric make it a
> non-event.
>
> THE REAL ONE — a button that waits for the server before acknowledging your
> tap feels broken, even at 300ms. Under 100ms feels instant. Respond
> immediately, reconcile after.
>
> Perceived speed is a design decision, not a server upgrade. Reserve the space,
> own the first frame, answer every tap straight away.
>
> Which one is your site guilty of?

```
#webperformance #webdev #frontenddeveloper #uxdesign #corewebvitals
#webdesign #performance #uidesign #javascript #webdevelopment #designtips
#userexperience #buildinpublic #nextjs #creativedeveloper
```

---

## `v2-12-one-person`

> One person. Accounts, payments, admin, native apps. Not because the work got
> smaller — because nothing starts from an empty file now.
>
> THE STACK — boring where it doesn't show:
> → Next.js, routing and rendering already solved
> → TypeScript, catches it before the user does
> → Convex, realtime backend with zero ops
> → Stripe, payments you don't rebuild
>
> THE MULTIPLIER — setup, not prompting. CLAUDE.md so conventions are never
> re-explained. Skills for anything done twice. Hooks for rules that must not be
> talked past. The tooling knows the project.
>
> THE HONEST PART — review is now the whole job. Generating code stopped being
> the constraint, so judging it became the constraint. Everything I ship is
> still read line by line, because it's still mine when it breaks.
>
> Two builds at a time, built by the person you spoke to. That's the whole
> model, and it only works because the tooling carries the parts that don't
> need judgement.

```
#buildinpublic #indiehacker #solofounder #freelancedeveloper #webdevelopment
#softwareengineer #fullstackdeveloper #aicoding #nextjs #startup
#devlife #programming #webdev #entrepreneur #techfounder
```

---

## `v2-13-skills`

> Stop pasting the same instructions into Claude Code. A skill turns a checklist
> you keep re-typing into a command.
>
> THE FILE — one folder, one SKILL.md:
>
> ```
> ---
> name: ship
> description: Pre-deploy checklist
> ---
> 1. Typecheck, then build.
> 2. Prices match pricing.ts?
> 3. No secrets in the bundle.
> ```
>
> That's the whole thing. It becomes /ship.
>
> WHY IT BEATS CLAUDE.md — a skill's body only loads when it's used. CLAUDE.md
> loads every session. So a long reference document costs almost nothing until
> you need it. Move anything from CLAUDE.md that's a procedure rather than a
> fact.
>
> TWO SWITCHES WORTH KNOWING —
> → `disable-model-invocation: true` — only you can run it. For anything with
> side effects; Claude shouldn't decide to deploy.
> → `user-invocable: false` — only Claude can. For background knowledge that
> isn't a useful command.
>
> Skills follow the open Agent Skills standard, so they're not locked to one
> tool. The rule: written it twice? Make it a skill.

```
#claudecode #aicoding #developertools #devworkflow #automation #codingtips
#softwareengineer #buildinpublic #programming #devtools #productivity
#webdev #agentskills #devcommunity #techtips
```

---

## `v2-14-ultrathink`

> One word makes Claude think harder. It's in the docs, it costs nothing, and
> almost nobody types it.
>
> THE WORD — `ultrathink`, anywhere in your prompt.
>
> Not a mode you switch on. A keyword you include, for the one question that
> deserves it.
>
> WHEN — hard calls, not easy edits:
> → A bug that only happens in production
> → Choosing between two architectures
> → Anything you'd normally sleep on
> → Reviewing your own reasoning
>
> THE DIAL — you can also set `effort` in a skill's frontmatter:
> `low · medium · high · xhigh · max`
> It overrides the session level whenever that skill runs. So an
> architecture-review skill can think hard by default, without you remembering.
>
> Most prompts don't need it. The ones where being wrong costs you a day
> absolutely do — and it's one word.
>
> Try it on the next bug that doesn't make sense.

```
#claudecode #aicoding #promptengineering #developertools #codingtips
#softwareengineer #devworkflow #buildinpublic #programming #aitools
#devtools #techtips #webdev #productivity #devcommunity
```

---

## `v2-15-hooks-automation`

> Make Claude Code finish the job without you. The commands you've seen that
> keep an agent working are mostly hooks — here's the actual mechanism.
>
> THE EVENT — a Stop hook fires when Claude tries to end its turn, and it can
> refuse. Claude wanted to stop; the hook says the goal isn't met yet, so it
> carries on. That's the whole trick behind "keep going until it's done".
>
> FOUR YOU'LL ACTUALLY USE —
> → PreToolUse — block a command before it runs
> → PostToolUse — format or lint after every edit
> → SessionStart — load context at the start of each session
> → Stop — refuse to finish until the work is done
>
> THE HONEST BIT — a lot of the slash commands you see in demos come from
> plugins or someone's personal setup. If it isn't in the docs, it isn't
> standard. But you can usually build it yourself from a hook and a skill.
>
> Prompting harder has a ceiling. A hook is a file you commit, so it works the
> same tomorrow and for anyone else who clones the repo.

```
#claudecode #automation #devops #developertools #devworkflow #cicd
#softwareengineering #buildinpublic #programming #cli #terminal
#aicoding #devtools #engineering #techtips
```

---

## `v2-16-who-to-follow`

> Who to follow if you want signal instead of hype. Most AI content is a
> thumbnail and a promise — these people ship things and show the work.
>
> NATE HERK — n8n workflows and AI agents. Left Goldman Sachs for automation
> full time, and builds real systems on camera for people who don't come from a
> technical background.
>
> ALSO WORTH IT —
> → Nick Saraev — automation as an actual business
> → Jono Catliff — no-code, end to end
> → Simon Scrapes — scraping and pipelines
> → Anthropic's own docs — the actual source
>
> THE FILTER — do they show the failures? Anyone whose builds always work first
> try is editing, not teaching. The useful channels show the thing breaking and
> what they did about it.
>
> And the best source is still the docs. Every Claude Code deck I post is
> checked against code.claude.com before it goes out — tutorials go stale in
> weeks, the docs update the day a feature ships.
>
> Who's actually taught you something? Drop them below 👇

```
#aicommunity #claudecode #aiautomation #n8n #buildinpublic #aitools
#developercommunity #contentcreator #learninpublic #automation
#aiagents #devcommunity #programming #techcreators #nocode
```

---

## Posting notes

**Order.** Tools decks are the reach engine — they teach, so they cost nothing
to publish and travel furthest. Craft and work decks convert the audience they
bring. Don't lead with pricing to a cold following.

| Week | Deck | Why here |
|---|---|---|
| 1 | `v2-07-rewind` | Strongest hook of the set — a feature most people don't know exists |
| 1 | `v2-11-fast-sites` | Craft, saveable |
| 2 | `v2-01-claude-code-context` | The habit deck |
| 2 | `v2-08-permission-modes` | Practical, high save rate |
| 3 | `v2-09-context` | Solves a problem everyone has hit |
| 3 | `v2-05-pricing` | First sell, after three teaching posts |
| 4 | `v2-02-claude-code-setup` | Deeper, for the audience built by now |
| 4 | `v2-03-cursor-rules` | Catches the Cursor half of the audience |
| 5 | `v2-10-headless` | Most impressive, least known |
| 5 | `v2-12-one-person` | Sells the model without quoting a price |
| 6 | `v2-04-ai-tools-honestly` | The credibility deck |
| 6 | `v2-06-promo-slots` | Close, with real scarcity |

- **Slide 01 is the cover** — the feed thumbnail, and the only slide most people
  will ever see.
- **Check the order before posting.** Filenames end `-01` to `-05`. Instagram
  honours tap order once you start selecting, so confirm the sequence.
- **Alt text:** headlines are baked into the image, so screen readers get
  nothing without it. Paste each slide's headline into Instagram's alt text
  field (Advanced settings → Write alt text).
- Rotate hashtag sets rather than reusing one block.
