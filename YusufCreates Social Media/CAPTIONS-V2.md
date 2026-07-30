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

## `v2-17-first-session`

> Everyone types their first prompt in under a minute. The people getting real
> value spent five on this screen first.
>
> READ THE BANNER — model, context size, effort level, working directory. Every
> one of those is a setting you can change, and most people never look.
>
> MINUTE ONE — run `/init`. It writes a CLAUDE.md by reading your codebase. Then
> edit it: the generated file is a starting point, not the answer. Cut it to
> what's actually true and keep it short.
>
> MINUTE TWO —
> → `/context` — what's filling the window right now
> → `/doctor` — setup problems, and it can fix them
> → `/mcp` — which servers are connected
> → Shift+Tab — pick a permission mode before you start
>
> Set up once, benefit daily. Five minutes decides whether it's a chat window or
> a system that knows your project.

```
#claudecode #aicoding #developertools #devworkflow #codingtips #terminal
#softwareengineer #buildinpublic #programming #devtools #productivity
#setup #webdev #techtips #devcommunity
```

---

## `v2-18-mcp`

> Stop pasting data into the chat. MCP lets Claude query your actual tools —
> and most people never connect one.
>
> WITHOUT IT you're the integration: copy, paste, hope it's still current. It's
> stale the moment you paste it.
>
> WITH IT it queries the source. Live data, every time it asks.
>
> WHAT CONNECTS —
> → GitHub — issues, PRs, workflows
> → Databases — query the real schema
> → Figma — read the actual design
> → Sentry, Linear, Slack, Notion
>
> SETUP is config, not code. Run `/mcp`, authenticate, done. It's an open
> standard, so the same servers work in other tools too.
>
> The difference between an assistant that reasons about your codebase and one
> that can look at the database it's writing queries against.
>
> Which would you connect first?

```
#mcp #claudecode #aitools #developertools #integration #devworkflow
#softwareengineering #buildinpublic #programming #api #devtools
#automation #webdev #techtips #devcommunity
```

---

## `v2-19-subagents`

> Your context is full of things you'll never read again. Every file it searched
> is still sitting there, crowding out the actual work.
>
> A SUBAGENT is just markdown:
>
> ```
> ---
> name: auditor
> description: Reviews, never edits
> tools: [Read, Grep, Glob]
> ---
> Report findings. Do not fix them.
> ```
>
> WHY IT WORKS — it reads a thousand lines in its own context and hands you back
> the conclusion. Inline, all of that lands in yours and stays there.
>
> THE SAFETY — an agent given only Read and Grep cannot edit anything, whatever
> it decides. That's a guarantee from the tool list, not a promise in a prompt.
>
> THE CATCH — subagent edits land outside your session's checkpoints. If one
> writes, use git. `/rewind` won't bring it back.

```
#claudecode #aiagents #developertools #devworkflow #softwareengineering
#codingtips #buildinpublic #programming #automation #devtools
#contextwindow #webdev #techtips #aicoding #devcommunity
```

---

## `v2-20-cursor-agent`

> You're using Cursor like autocomplete. Tab is the famous part — Agent is the
> part that does the work.
>
> TAB predicts your next edit. Fast, local, inline. Best when you already know
> the shape of what you're writing.
>
> AGENT plans across files. Reads the codebase, edits many files, runs commands.
>
> PLAN FIRST — Agent works best on an outcome: "make the checkout handle a
> declined card", not a sequence of instructions. If you already know every
> step, Tab is faster.
>
> GIVE IT RULES — without `.cursor/rules` or AGENTS.md it writes generic code
> that passes review and matches nothing around it. Rules are what make Agent
> output look like your codebase.
>
> Tab for typing. Agent for thinking. Most people use one and ignore the other —
> knowing which you're in is most of the skill.

```
#cursor #cursorai #aicoding #developertools #codeeditor #vibecoding
#programming #webdevelopment #devtips #softwareengineer #aitools
#codingsetup #buildinpublic #frontenddeveloper #productivity
```

---

## `v2-21-better-prompts`

> It keeps giving you the wrong thing. Usually the prompt described a solution
> instead of a problem.
>
> THE SWAP —
> ❌ "make the form better" — better how? It guesses, and it guesses generically.
> ✅ "show errors inline, on blur" — one outcome, checkable.
>
> GIVE IT THE MAP — @-mention the file instead of describing it. Reading the
> real thing beats inferring it from your summary, every time.
>
> SAY WHAT NOT TO DO — constraints are the useful part:
> → Don't add a dependency for this
> → Match the pattern in the file above
> → Leave the public API unchanged
> → Show me the plan before editing
>
> THE RULE — before sending, ask how you'd know it succeeded. If you can't
> answer, neither can it. That's the prompt to rewrite.

```
#promptengineering #aicoding #claudecode #cursor #developertools
#codingtips #softwareengineer #devworkflow #buildinpublic #programming
#aitools #devtools #webdev #techtips #productivity
```

---

## `v2-22-nate-herk`

> He left Goldman Sachs to build automations. Nate Herk is the clearest teacher
> in AI automation right now — here's what's worth taking from him.
>
> THE PERSON — founder of Uppit AI, 30M+ views, and the largest AI automation
> community on Skool. Teaches n8n workflows and AI agents to people who don't
> come from a technical background.
>
> HIS 2026 CALL — speed-to-lead is the number one workflow to build.
> (Paraphrased from his 2026 automation guidance.)
>
> WHY IT HOLDS — nothing clever in it. The first credible reply usually takes
> the work. Reply in five minutes and you're in the conversation; reply the next
> day and they've moved on. That's an automation, not a personality trait.
>
> THE FILTER — his builds break on camera and he fixes them. That's the
> difference between teaching and editing, and it's what to look for in anyone
> you follow.

```
#nateherk #aiautomation #n8n #aiagents #automation #buildinpublic
#nocode #aitools #learninpublic #devcommunity #workflow #aicommunity
#entrepreneur #productivity #techcreators
```

---

## `v2-23-follow-list`

> Five people worth your feed. Most AI content is a thumbnail and a promise —
> these ship things.
>
> → NATE HERK (@nateherk) — n8n workflows and AI agents, built end to end on
> camera.
> → NICK SARAEV (nicksaraev.com) — automation as an actual business, not just a
> demo.
> → JONO CATLIFF — end-to-end no-code builds for non-technical founders.
> → SIMON SCRAPES — scraping and data pipelines, the unglamorous half that makes
> agents useful.
> → code.claude.com/docs — updated the day a feature ships. Every Claude Code
> deck I post is checked against it first.
>
> THE FILTER — do they show it breaking? Anyone whose builds always work first
> try is editing, not teaching. Follow the ones who leave the failure in.
>
> Who did I miss? 👇

```
#aicommunity #aiautomation #claudecode #buildinpublic #learninpublic
#aitools #developercommunity #nocode #n8n #aiagents #techcreators
#devcommunity #programming #automation #contentcreator
```

---

## `v2-24-cost`

> Your context is the bill. Not the number of prompts — the amount you're
> carrying when you send them.
>
> SEE IT — `/cost` shows what this session has spent. `/context` shows what's
> filling the window. Usually one giant file pasted an hour ago and never used
> again.
>
> THE HABIT — `/clear` between tasks. You pay to re-send everything already in
> the window, so a stale conversation costs money on every single turn. One long
> session doing four unrelated jobs is the expensive pattern.
>
> DELEGATE — a subagent with a smaller model can do the searching and hand back
> a paragraph. You pay for a thousand lines once, in its context, not in yours
> forever.
>
> THE CAP — in scripts, `--max-budget-usd 2.00`. A loop that misbehaves stops at
> two dollars, not two hundred.

```
#claudecode #aitools #developertools #costoptimization #devworkflow
#softwareengineering #buildinpublic #programming #cli #devtools
#productivity #aicoding #techtips #webdev #devcommunity
```

---

## `v2-25-git-discipline`

> Let it run. But commit first. Every "I let the agent go wild" story that ends
> badly has the same missing step.
>
> CHECKPOINTS AREN'T HISTORY — session only, deleted after 30 days, and they
> don't track bash changes or subagent edits. Git is permanent, branchable, and
> someone else can read it.
>
> THE MOVE — a branch costs you nothing:
>
> ```
> git checkout -b agent-refactor
> git commit -am 'before'
> ```
>
> Now let it do whatever it wants.
>
> REVIEW THE DIFF, NOT THE SUMMARY. The summary is written by the thing that
> made the changes. `git diff` is written by git. Only one of those is evidence.
>
> Autonomy needs an undo. The faster you let it work, the more you need a clean
> commit behind you — that's not caution, it's what makes going fast survivable.

```
#git #versioncontrol #claudecode #aicoding #developertools #devworkflow
#softwareengineering #codereview #buildinpublic #programming #devtools
#bestpractices #webdev #techtips #devcommunity
```

---

## `v2-26-what-changed`

> The job changed. The standard didn't. A year of building with these tools,
> honestly summarised.
>
> FASTER — nothing starts from empty. Scaffolding, boilerplate, the third CRUD
> screen, the migration nobody wants to write. That work didn't get easier, it
> got delegated.
>
> HARDER — reviewing is now the job. Generating stopped being the constraint, so
> judging became the constraint. Time writing code went down; time reading code
> went up.
>
> UNCHANGED — it's yours when it breaks. Nobody accepts "the AI wrote it" at
> 2am. Everything I ship is still read line by line, because the responsibility
> never moved.
>
> Two builds at a time, built by the person you spoke to. The tooling carries
> the parts that don't need judgement. That's the whole model.

```
#buildinpublic #softwareengineering #aicoding #devlife #indiehacker
#solofounder #freelancedeveloper #webdevelopment #codequality #craftsmanship
#programming #techfounder #devcommunity #startup #webdev
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
