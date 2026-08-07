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

---

# Golden Gate series — `v2-27` to `v2-34`

Eight decks on one release, on the warm `goldengate` theme. They are a series:
the cover of each assumes you have not read the others, but the running order
below builds from the change everyone can see to the work only developers have
to do.

**These go stale on a date.** Golden Gate ships in September 2026. From the day
it ships, every "ships in September" line is wrong and the ship-checklist deck
is a post-mortem. Re-read them before re-posting, or retire them.

---

## `v2-27-liquid-glass`

> Apple just fixed Liquid Glass. The slider everyone asked for is in macOS 27
> Golden Gate, and it ships in September.
>
> THE SLIDER — System Settings → Appearance. iOS 26 gave you two looks, Clear or
> Tinted, and made you choose. 27 gives you the whole range between them,
> systemwide. It still respects Reduce Transparency and Increase Contrast.
>
> THE MATERIAL — three changes, and they're the ones that answer the actual
> complaint:
> → A darkened edge just inside the bright rim
> → Brighter specular highlights
> → It diffuses busy content instead of smearing it
>
> People said transparency was the problem. It wasn't. Legibility over complex
> backgrounds was the problem, and that's what got fixed.
>
> FOR ANYONE SHIPPING — the slider belongs to the user, not to your app. If your
> layout only holds up at one end of it, it's broken for somebody. Never let
> blur alone carry legibility; put a real fill behind text.
>
> Have you tried the beta yet?

```
#macos #ios27 #liquidglass #apple #uidesign #swiftui #iosdev #appledesign
#designsystems #uxdesign #macosdev #wwdc #appdevelopment #productdesign #ui
```

---

## `v2-28-mac-windows`

> Sidebars stopped floating. The half of the macOS 27 redesign nobody
> screenshots — and the half most likely to break your layout.
>
> FOUR CHANGES:
> → Sidebars run to the window edge instead of floating inset
> → Coloured sidebar icons are back after Tahoe greyed them out
> → Corner radii are uniform again, not dramatically rounded
> → Window shadows retuned so active and inactive windows read apart
>
> THE TOOLBAR — when content scrolls under a floating bar, a uniform toolbar now
> keeps the text legible. Standard toolbars get this automatically. Custom ones
> go through the scroll edge effect APIs, which means anything you drew yourself
> needs checking.
>
> These are layout changes, not a repaint. "It still compiles" proves nothing
> here. Open your app on the beta and look at it.
>
> What's the first thing you'd check?

```
#macos #macosdev #swiftui #apple #uidesign #appkit #iosdev #appledesign
#wwdc #developer #softwaredesign #ux #interfacedesign #buildinpublic #coding
```

---

## `v2-29-app-icons`

> Icons bend light on purpose now. If yours is one flat PNG, that's the thing
> that's about to look dated.
>
> PER-LAYER REFRACTION — a layer can pick up and bend what sits behind it, or
> stay flat. It's a dial rather than a switch, and it's set per layer, not per
> icon. Selectively applied is the whole point.
>
> ICON COMPOSER WAS REBUILT:
> → Build the icon from multiple Liquid Glass layers
> → Annotate a layer to add refraction or tune content effects
> → Interactive preview shows how it actually renders
>
> ALSO — icons render sharper and with more definition than 26. The glass now
> reads as a finish over your artwork instead of an overlay sitting on top of
> it, which was the other half of the complaint.
>
> THE WORK — a flattened image can't take part in any of this. Splitting the
> artwork back into layers is the job, and it's the one part of the September
> list you can't automate or defer to a script.
>
> When did you last touch your app icon?

```
#appicon #iosdev #icondesign #apple #ios27 #liquidglass #graphicdesign
#appdesign #uidesign #designer #brandidentity #visualdesign #ux #swift #app
```

---

## `v2-30-foundation-models`

> Apple opened its AI framework to everyone. Any LLM provider can now plug into
> the same framework Apple's own models use.
>
> ONE CALL SITE, ANY MODEL — every model conforms to the same LanguageModel
> protocol, so swapping the model doesn't change your code:
>
> let model = SystemLanguageModel()
> let session = LanguageModelSession(model: model)
> let reply = try await session.respond(to: prompt)
>
> Swap in PrivateCloudComputeLanguageModel, CoreAILanguageModel for local
> models, or MLXLanguageModel for anything on Hugging Face. Same three lines.
>
> WHO'S COMING — Anthropic and Google both announced Swift packages that extend
> the framework, bringing Claude and Gemini to it. Announced at WWDC26 as coming
> soon, so not in your Package.resolved yet — but the shape is set.
>
> A provider ships one Swift package implementing LanguageModel and
> LanguageModelExecutor. Your app selects it and calls it identically.
>
> ALSO — the framework core is going open source, with a Python SDK and an fm
> CLI on macOS 27.
>
> WHY IT MATTERS — the provider used to be baked into the integration. Now it's
> a line. That changes what it costs to be wrong about which model you picked.
>
> Which model would you reach for first?

```
#swift #iosdev #ai #apple #foundationmodels #llm #claude #gemini #wwdc
#machinelearning #appdevelopment #softwareengineering #ondeviceai #swiftui #dev
```

---

## `v2-31-on-device-ai`

> The on-device model can see now. Images go straight into the prompt — free,
> local and offline.
>
> MULTIMODAL:
>
> let response = try await session.respond {
>   "What animal is this?"
>   Attachment(UIImage(…))
> }
>
> UIImage, NSImage, CGImage, Core Image, CoreVideo buffers or a file URL. Any
> size, any aspect ratio.
>
> CONTEXT STOPPED BEING A GUESS:
> → model.contextSize — 8192 on device
> → model.tokenCount(for:) before you send
> → Private Cloud Compute gives you 32K
> → response.usage breaks out cached and reasoning tokens
>
> FAILURE GOT TYPED — contextSizeExceeded, rateLimited, refusal,
> guardrailViolation, timeout. Typed cases instead of one opaque error, so an
> app can degrade instead of dying. Guardrails were retuned to cut false
> positives, and there are built-in OCR and barcode tools plus Spotlight-backed
> search for local RAG.
>
> THE HONEST PART — 8K on device is 8K. This is for classification, extraction
> and short structured generation. It is not the thing you'd hand to a frontier
> model, and knowing which is which is the actual skill.
>
> What would you build with a free local model?

```
#iosdev #swift #ai #ondeviceai #apple #machinelearning #foundationmodels
#privacy #appdevelopment #wwdc #softwareengineering #mobiledev #llm #ios27 #dev
```

---

## `v2-32-siri-ai`

> Siri got rebuilt. Now read the fine print, because it isn't for everyone in
> September.
>
> WHAT IT DOES — four things it genuinely couldn't before:
> → Answers questions about what's on your screen
> → Searches your own messages, mail and photos
> → Goes to the web for current information
> → Takes actions across apps, systemwide
>
> Siri is also an app now, with conversation history synced through iCloud, plus
> a more expressive voice with controls for pace and expressiveness.
>
> THE FINE PRINT:
> → iPhone 15 Pro or later — Apple Intelligence devices only
> → Not in the EU at launch on iOS, iPadOS or watchOS
> → Not in China, pending regulatory approval
> → Server-backed features carry daily usage limits
>
> IF YOU SHIP APPS — "takes actions across apps" means the actions you expose
> through App Intents. An app with no intents is an app Siri cannot drive, and
> that gap is about to become visible to ordinary users for the first time.
>
> Are you shipping intents yet?

```
#siri #ios27 #apple #appleintelligence #iosdev #appintents #ai #swift
#mobiledev #appdevelopment #technews #wwdc #voiceassistant #ux #ios
```

---

## `v2-33-swiftui`

> The SwiftUI changes nobody talked about. No keynote slide, and they'll still
> delete more of your code than anything that got one.
>
> TOOLBARS — you finally control what survives a resize:
> → visibilityPriority — what drops first when space runs out
> → toolbarOverflowMenu — park the low-priority items
> → topBarPinnedTrailing — pin the one action that matters
> → toolbarMinimizeBehavior — collapse the bar on scroll
>
> FREE PERFORMANCE — AsyncImage now respects standard HTTP cache headers by
> default. No code change. And @State became a macro, so a class stored in
> @State initialises lazily, once per view lifetime.
>
> INTERACTION:
> → Reorderable containers — List, LazyVGrid, the lot
> → swipeActionsContainer on any ScrollView
> → Alerts and confirmation dialogs take item bindings, like sheets already did
> → Reordering lands on watchOS for the first time
>
> THE PATTERN — image caching, reordering, overflow menus. Every team wrote
> these by hand. The win isn't the feature, it's the code you get to delete.
>
> Which one are you deleting first?

```
#swiftui #swift #iosdev #apple #wwdc #mobiledev #appdevelopment #ios27
#programming #softwareengineering #coding #developer #uidesign #xcode #dev
```

---

## `v2-34-ship-checklist`

> You have weeks, not months. Golden Gate and iOS 27 ship in September — here's
> the list, in the order it'll hurt.
>
> 01 — HARDWARE. Golden Gate needs M1 or newer. Tahoe was the last release for
> Intel Macs, and Golden Gate is the last one with full Rosetta 2, so shipping
> an x86 binary now has a visible end date. Ship arm64 or universal, audit your
> dependencies for x86-only blobs.
>
> 02 — LAYOUT. Edge-to-edge sidebars, uniform toolbars and tighter corner radii
> are layout changes, not a repaint. Check every custom toolbar and floating
> bar. Test at both ends of the Liquid Glass slider. Confirm text has a real
> fill behind it, not just blur.
>
> 03 — ICON. A flat image can't take part in per-layer refraction. Icon Composer
> wants layers, and that's manual work.
>
> 04 — INTENTS. Siri AI acts across apps through the intents you expose. Ship
> none and you're invisible to the most promoted feature of the release.
>
> THE HONEST VERSION — most of this is half a day. The icon and the intents
> aren't. Those are the two worth starting now, and the two everyone leaves
> until the release notes are already out.
>
> Where are you on this list?

```
#iosdev #macos #apple #ios27 #appdevelopment #swiftui #shipping #indiedev
#softwareengineering #mobiledev #developer #buildinpublic #wwdc #xcode #app
```

---

## Posting order — Golden Gate series

Two a week over four weeks, widest audience first, narrowest last. The checklist
deck is deliberately last: it is the one with a call to action, and it lands
best on an audience that has already read the four decks describing the work.

| Week | Deck | Why here |
|---|---|---|
| 1 | `v2-27-liquid-glass` | Everyone can see this one — widest reach, best cover |
| 1 | `v2-29-app-icons` | Visual, saveable, no code required to care |
| 2 | `v2-32-siri-ai` | Consumer headline, developer sting in the tail |
| 2 | `v2-28-mac-windows` | First properly technical deck |
| 3 | `v2-33-swiftui` | High save rate — it's a reference card |
| 3 | `v2-30-foundation-models` | The one this audience will actually argue about |
| 4 | `v2-31-on-device-ai` | Deepest, for the audience built by now |
| 4 | `v2-34-ship-checklist` | Close, with a real deadline behind the CTA |

---

# Promotional series — `v2-35` to `v2-42`

Eight decks selling the site, on the `brandglass` theme — house indigo palette,
Golden Gate material. Site: **www.yusufcreates.app** · **@yusufcreatesdev**

Every figure in these came out of the repo, not out of a draft:
`src/lib/pricing.ts`, `convex/capacity.ts`, `convex/seed.ts`,
`HowIWork.tsx`, `Process.tsx`. **If a price changes on the site, these captions
and the decks are both wrong** — check both before re-posting.

No deck claims traffic, revenue, client counts or testimonials. None of that is
recorded anywhere in the repo, and invented social proof is the easiest kind to
disprove.

---

## `v2-35-express`

> Your site live in two hours — or you don't pay the balance. $69.
>
> 40% up front ($27.60). The remaining $41.40 is due on delivery, and if I miss
> the two hours it's written off. Not discounted — written off. That guarantee
> is the product; without it this is just a cheap page.
>
> WHAT YOU GET:
> → Up to two pages, whatever you need on them
> → Mobile and desktop, both done properly
> → A live countdown you can watch
> → Yours outright, hosting and domain in your name
>
> THE HONEST PART — the clock doesn't start when you pay. Paying moves the
> request to review and pings me. I check what actually arrived first, because a
> card clearing at 3am, or a brief with no copy in it, shouldn't burn a window
> nobody can work in.
>
> Priced under seventy dollars deliberately. This is something you decide in one
> sitting, not something you collect three quotes for.
>
> yusufcreates.app/express

```
#webdesign #smallbusiness #startup #webdeveloper #entrepreneur #website
#freelance #landingpage #uae #abudhabi #dubai #businessowner #founder #dev #web
```

---

## `v2-36-revive`

> You probably don't need a rebuild. $650 to fix the site you already have.
>
> "Start again" is the expensive answer, and usually the wrong one. Most sites
> that feel broken have four or five specific problems, not a fundamental one —
> and quoting a rebuild is how that gets hidden.
>
> WHAT REVIVE INCLUDES:
> → A full audit of what is actually wrong
> → Speed, accessibility and SEO fixes applied
> → Broken links, forms and checkout paths repaired
> → Mobile layout fixed properly, not patched
> → Dependencies and security patches brought current
> → An admin you can use, if there isn't one
> → Handover notes so the next person isn't stuck
>
> A site rescued once and abandoned again is back where it started inside a
> year. That's what the Care Plan is for, and it's optional.
>
> FREE FIRST STEP — run the audit. Speed, accessibility and SEO in plain
> language with three specific fixes. Costs nothing, obliges nothing.
>
> yusufcreates.app/audit

```
#webdesign #websiterefresh #seo #webdeveloper #smallbusiness #website
#webdevelopment #freelance #entrepreneur #businessowner #uae #dubai #wordpress
#pagespeed #dev
```

---

## `v2-37-how-i-work`

> Six promises, all in writing. The things that actually go wrong with
> freelancers, answered before you ask.
>
> 01 — I reply within one business day. Every message, including the ones that
> turn out not to be a fit. If I can't help I'll say so quickly and point you
> somewhere better rather than going quiet.
>
> 02 — A written update every week: what shipped, what's next, what changed. And
> you email me directly, not a form.
>
> 03 — You own everything. Code, designs, domains, accounts, transferred on
> final payment. No licence, no lock-in, no ongoing fee to keep using the thing
> you paid for.
>
> 04 — Two rounds of revisions per milestone. If it still isn't right, you can
> end the project there and pay only for milestones already delivered.
>
> 05 — If I'm unavailable you're not stranded. Repos and accounts are in your
> name from day one, so another developer can pick it up without me.
>
> 06 — Send your NDA and I'll sign it, or I'll provide a standard mutual one.
>
> None of this is unusual. It's just written down — because most of what goes
> wrong is an expectation nobody agreed to out loud.
>
> yusufcreates.app/about

```
#freelance #webdeveloper #clientwork #smallbusiness #entrepreneur #business
#webdesign #contractor #founder #startup #transparency #freelancer #dev #web
#businessowner
```

---

## `v2-38-real-work`

> Two products, both live, both with paying users. Not concepts — sites you can
> open right now.
>
> DOCUTRACKR FAMILY — a document vault that catches passport and visa expiries
> before the airport does. Alerts at 90, 60, 30 and 7 days, a six-month passport
> rule check against upcoming flights, household sharing for up to ten people,
> and a Peace of Mind Score that reduces document health to one number.
>
> The OCR runs in your browser. Not on a server that promises not to look —
> Tesseract.js reads the document on the device, and sensitive fields are
> encrypted with AES-256-GCM.
>
> DOCUTRACKR BUSINESS — HR document compliance for GCC companies, replacing the
> spreadsheet that quietly costs them fines. Role-based access, renewal guides
> covering 87 countries with real fee and lead-time data, AI contract extraction
> that pulls parties, dates and risks from PDFs and flags renewal clauses, and a
> daily compliance report scored out of 100.
>
> Every project on the site links to the live thing, with the problem, the
> approach and the result written out. No case study you can't click.
>
> yusufcreates.app/work

```
#saas #webdevelopment #portfolio #startup #productdesign #nextjs #webdeveloper
#buildinpublic #indiehacker #software #uae #compliance #hrtech #dev #founder
```

---

## `v2-39-native-apps`

> A real native iOS or macOS app, from $3,200 — and no App Store listing. No
> review queue, no store cut, no waiting a week to ship a fix.
>
> NOT A WRAPPED WEBSITE:
> → Native iOS, macOS, or both
> → Works offline, syncs when it reconnects
> → Push notifications
> → Signed builds distributed straight to your users
>
> WHY IT ISN'T DOUBLE THE WEB APP — it's a second codebase with its own build,
> signing and distribution, so it costs more than the $2,500 web app. But the
> backend, auth and admin are shared rather than rebuilt. That's the whole
> reason the number isn't twice as big.
>
> THE DISTRIBUTION PART — going direct means nothing sits between you and your
> users. For internal tools and business apps that isn't a compromise, it's the
> entire reason to do it this way.
>
> "From" means from. Native work is scoped on a free thirty-minute call, because
> the range is genuinely wide. You get a real number before anything starts.
>
> yusufcreates.app/services

```
#ios #macos #swift #appdevelopment #nativeapp #iosdev #mobileapp #startup
#business #softwaredevelopment #apple #entrepreneur #enterprise #dev #app
```

---

## `v2-40-care-plan`

> Most people quote the build and vanish. The part after launch is where sites
> actually die. Care Plan, $180/month.
>
> WHAT'S IN IT:
> → Hosting and maintenance
> → 100 small fixes a month
> → 20 big fixes a month
> → SEO monitoring
> → Monthly analytics report
> → Priority support
>
> NUMBERS, NOT "UNLIMITED" — because unlimited was never true in the way anyone
> reads it. It invites the one client who tests it and gives me nothing to point
> at when they do. A hundred a month is past what any normal site needs, and
> it's a promise I can actually keep.
>
> THE SPLIT MATTERS AS MUCH AS THE COUNTS. A small fix is a copy change, a
> price, an image, a broken link — the stuff you'd otherwise sit on for weeks. A
> big fix is a new section, a new page, a behaviour change: work with design and
> testing in it.
>
> ANNUAL — $1,800 instead of $2,160. Twelve months for the price of ten.
>
> yusufcreates.app/pricing

```
#webmaintenance #smallbusiness #website #webdeveloper #seo #businessowner
#entrepreneur #webdesign #hosting #freelance #saas #uae #dubai #dev #business
```

---

## `v2-41-free-audit`

> I'll tell you what's wrong with your site. Free, in plain language, whether or
> not you ever hire me.
>
> THREE SPECIFIC THINGS TO FIX. Not a 40-page PDF full of colour-coded severity
> levels you'll never open. Three things, in order, that would actually make a
> difference:
>
> → Speed — what's slow, and what's making it slow
> → Accessibility — what a screen reader can't get to
> → SEO — what search engines can't see
>
> Written for you, not for a developer. If a report needs a developer to
> interpret it, it isn't a report — it's a sales funnel with extra steps.
>
> THE CATCH — there isn't one. Take the three fixes to whoever already maintains
> your site. Genuinely. A site that gets better is a better advert for how I
> work than a report you ignored.
>
> Paste your URL. That's the whole thing.
>
> yusufcreates.app/audit

```
#seo #websiteaudit #pagespeed #accessibility #webdesign #smallbusiness
#freetool #webdeveloper #marketing #businessowner #entrepreneur #wcag #website
#dev #growth
```

---

## `v2-42-arabic-rtl`

> Arabic isn't a flipped stylesheet. Most "RTL support" is `direction: rtl` and
> hope, and it shows immediately.
>
> WHAT ACTUALLY BREAKS:
> → Icons with direction — arrows, chevrons, progress indicators
> → Numbers and dates, which stay left-to-right inside RTL text
> → Shadows and gradients that had a light source
> → Form layouts, tables, and anything with a fixed side
>
> FIVE LANGUAGES, PROPERLY — English, Arabic, French, Russian and Swedish, with
> real right-to-left mirroring where it applies rather than a stylesheet flip
> that leaves the icons pointing the wrong way.
>
> A GCC business needs both, not an English site with an Arabic page bolted on.
> Bilingual English and Arabic with full RTL mirroring is part of the Enterprise
> tier, built in from the first layout instead of retrofitted at the end.
>
> Thirty minutes, free, to talk about what the business needs to happen — not
> how many pages it has. Two build slots at a time; that's the whole capacity.
>
> yusufcreates.app

```
#arabic #rtl #webdesign #uae #dubai #abudhabi #saudiarabia #gcc #bilingual
#localization #webdeveloper #mena #business #i18n #web
```

---

## Posting order — promotional series

Interleave these with teaching decks rather than running eight sells in a row.
Free-first, cheapest-first: the two decks that ask for no money lead, and the
recurring-revenue and enterprise angles land last on a warmer audience.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `v2-41-free-audit` | Asks for nothing, useful to everyone, best top-of-funnel |
| 2 | `v2-35-express` | Cheapest yes on the site, strongest single hook |
| 3 | `v2-37-how-i-work` | Trust before any bigger number gets mentioned |
| 4 | `v2-38-real-work` | Proof, right after the promises |
| 5 | `v2-36-revive` | Different audience — people who already have a site |
| 6 | `v2-40-care-plan` | Recurring revenue, once they believe the build |
| 7 | `v2-39-native-apps` | Highest ticket, narrowest audience |
| 8 | `v2-42-arabic-rtl` | Regional differentiator, closes on the capacity line |

**Every deck ends on a URL.** `@yusufcreatesdev` is baked into every slide's
footer, so the caption's job is the link — Instagram doesn't linkify it, so keep
it short enough to retype and put it in the bio too.

---

# Tips series — `v2-43` to `v2-50`

Eight craft decks on the `brandglass` theme. **Every one is a mistake actually
made in this repo, with the real number attached** — sources are named in the
`content.js` comment above each deck.

That constraint is the whole reason these are worth posting. "Watch your bundle
size" is a platitude nobody saves. "A wildcard import cost 5.0 MB — 58% of all
the JavaScript on the page — to draw twenty-two 24px glyphs" is a thing someone
sends to a colleague. If a new deck in this series has no number in it, it isn't
finished.

---

## `v2-43-bundle-bloat`

> One import cost me 5 megabytes. 58% of all the JavaScript on the page, to draw
> twenty-two 24px logos.
>
> THE LINE:
> import * as simpleIcons from "simple-icons"
> const ALL = Object.values(simpleIcons).filter(…)
>
> A namespace import reads every export at module scope. The bundler cannot
> prove which of 3,450 brands are reachable, so it ships all of them.
>
> THE FIX — import by name, one per brand. Twenty-two named imports instead of
> one wildcard.
>
> THE OBJECTION I had at the time: export names are unstable across versions, so
> looking up by title is safer. That trade is the wrong way round. A named import
> that stops resolving is a BUILD ERROR. A title lookup that stops matching is a
> logo silently vanishing from a live page — and you find out from a user.
>
> THE HABIT — open your bundle analyser once a month. Nobody notices five
> megabytes arriving one dependency at a time. This was invisible in code review
> and obvious in one look.
>
> When did you last check yours?

```
#webperformance #javascript #react #nextjs #webdev #frontend #optimization
#coding #programming #webdeveloper #performance #bundlesize #devtips #js #dev
```

---

## `v2-44-glass-legibility`

> Your blur isn't doing the work. Frosted glass that only works when
> backdrop-filter renders is glass that doesn't work.
>
> BACKDROP-FILTER IS ALLOWED TO FAIL, in three ways you'll never see on your own
> machine:
> → Dropped under prefers-reduced-transparency
> → Unsupported on older engines
> → Quietly skipped by some compositors
>
> THE RULE — the fill has to guarantee legibility on its own. Set the background
> opacity so text behind the panel is unreadable with the blur switched off
> entirely, then let the blur make it beautiful.
>
> I went through this twice. At 62% fill a paragraph scrolling underneath was
> still legible straight across the nav labels. 84% leaves 16% bleeding through
> as a faint wash — enough that light and colour still pass and it reads as
> glass, far too little for letterforms to resolve.
>
> ONE MORE — push brightness above 1. Without it the panel darkens what's behind
> it and reads as a drop shadow. Real glass brightens.
>
> THE TEST — comment out the backdrop-filter and scroll a paragraph underneath.
> Read a single word through the panel? Fill's too light.
>
> #glassmorphism done properly.

```
#uidesign #css #frontend #webdesign #glassmorphism #accessibility #webdev
#designsystems #ux #frontenddeveloper #webdeveloper #uiux #devtips #design #dev
```

---

## `v2-45-contrast`

> Your accent colour passes and fails at the same time. Same colour, two
> contexts, two different thresholds — almost everyone ships this bug.
>
> TWO THRESHOLDS:
> → 4.5:1 for body text against its background
> → 3:1 for borders, icons, large text and UI indicators
> → Pure decoration that carries no meaning is exempt
>
> THE TRAP — my accent measures 4.42:1 under white text. Perfectly fine as a
> border or an icon, because that only needs 3:1. Not fine as a filled button,
> where the label is body text and needs 4.5:1. One colour, one number, passing
> in one place and failing in the other.
>
> THE FIX — ship two tokens:
>
> --accent: #5e6ad2        /* borders, icons, large text */
> --accent-solid: #5560c4  /* under white text only */
>
> One step darker, same hue. The brand doesn't change; the button becomes
> legible.
>
> WHERE TO LOOK — buttons, badges, toasts, selected rows. Anywhere your brand
> colour sits under white text. The failures are never in the paragraph you
> actually tested.
>
> Run a checker on your own buttons. I'll wait.

```
#accessibility #a11y #wcag #uidesign #webdev #frontend #inclusivedesign
#designsystems #ux #css #webdeveloper #uiux #devtips #design #dev
```

---

## `v2-46-money-rounding`

> My deposit and balance didn't add up. Every euro order quietly undercharged by
> €5. Nothing errored, nothing logged.
>
> THE BUG — converting each half separately. Take a dollar price, convert the
> deposit, convert the balance, and each one rounds its own way. €65 total shown
> on the card, €30 deposit, €35 balance… that summed to €60.
>
> THE RULE — split the CONVERTED total, never convert the halves:
>
> const total = convert(usd, currency)
> const deposit = Math.round(total * fraction)
> const balance = total - deposit
>
> The deposit absorbs the rounding. The balance is whatever's left. Now the two
> always sum to exactly the price on the card.
>
> THE SECOND BUG — a fixed rounding step isn't fair across magnitudes. "Nearest
> 25" is a 0.1% error on a $5,500 price and 8% on a $34.50 one. Small prices came
> out visibly wrong while big ones looked perfect, which is why nobody noticed.
> The step now scales: under 100 round to 1, under 1000 round to 5, above that
> 25. Everything stays inside ~1%.
>
> THE HABIT — assert deposit + balance === total, in every currency you support.
> One line. It's the only thing between you and a month of undercharging that
> nobody reports.
>
> Check yours tonight.

```
#stripe #payments #saas #webdev #ecommerce #programming #javascript #fintech
#softwareengineering #indiehacker #buildinpublic #devtips #coding #dev #startup
```

---

## `v2-47-hydration`

> Stop fixing hydration mismatches with useEffect. It works, and it guarantees
> one frame of the wrong thing on every single load.
>
> THE SETUP — an inline script sets a theme before paint to avoid a flash. A
> module reads the same value after hydration. They disagree, React throws a
> mismatch warning, and everyone reaches for the effect.
>
> THE USUAL FIX:
> const [v, setV] = useState(DEFAULT)
> useEffect(() => { setV(read()) }, [])
>
> The warning goes away because the first render is now deliberately wrong. The
> flash it was warning about does not go away.
>
> THE PRIMITIVE — useSyncExternalStore. It's built for exactly this: an external
> source React doesn't own. Pass subscribe, getSnapshot for the client, and
> getServerSnapshot for SSR. The first client render gets the real value.
>
> THE OTHER HALF, and this is the part people miss — your CSS no-JS default and
> the value your inline script writes have to be the same number. Two sources of
> truth for one value is the actual bug. The hydration warning was only ever the
> symptom.
>
> Which one are you doing right now?

```
#react #nextjs #javascript #webdev #frontend #ssr #reactjs #typescript
#programming #webdeveloper #coding #frontenddeveloper #devtips #js #dev
```

---

## `v2-48-auth-mistakes`

> Your login form is leaking half the answer. If you sign in with an email
> address, you've already published the username.
>
> THE LEAK — most auth libraries validate the identifier as an email. So the one
> admin account ends up named after a real inbox: an address that's in the page,
> in a WHOIS record, and on your contact page. Attackers now need one factor, not
> two.
>
> THE FIX — sign in by username. Override the profile handler rather than the
> validator: take the identifier as an opaque string and store it on whichever
> column the library keys accounts on. It's a name, not an address, and nothing
> ever tries to post mail to it.
>
> THE OTHER ONE — locking sign-up to a single address at the form is a
> suggestion, not a control. Anyone who completes the flow another way still gets
> a row in your users table. Delete the user and abort the sign-in server-side,
> so no account is ever created.
>
> ALSO: verify the password server-side against a stored hash. Never compare
> credentials in the browser — nothing sensitive should reach the JS bundle.
>
> THE PRINCIPLE — assume the form is skipped. Every check that lives in the UI is
> decoration. The only question that matters is what happens when someone posts
> straight to the endpoint.
>
> Go look at your sign-in page.

```
#security #websecurity #authentication #webdev #backend #appsec #programming
#softwareengineering #infosec #devtips #coding #webdeveloper #saas #dev #auth
```

---

## `v2-49-csp`

> Ship a Content Security Policy without breaking your site. Everyone who
> enforces it on day one reverts it by day two.
>
> THE MOVE — Report-Only first:
>
> { key: "Content-Security-Policy-Report-Only", value: csp }
>
> Same policy, same violation reports, nothing blocked. You find out what your
> own site actually loads before you switch it on. Swap the header name to
> Content-Security-Policy when you're ready.
>
> WHAT YOU'LL FIND — third parties you forgot:
> → Your payment provider's script host
> → Whatever your captcha or bot check loads
> → Fonts, analytics, and one embed from two years ago
>
> FREE WIN — frame-ancestors 'none'. Nobody can put your site in an iframe.
> That's clickjacking closed in a single directive, and unlike the script rules
> it will not break anything you own. Start there.
>
> THE HONEST BIT — 'unsafe-inline' is a compromise. Most frameworks inline styles
> or scripts, so a genuinely strict policy needs nonces threaded through the whole
> render. Report-Only with unsafe-inline is still enormously better than no
> header at all. Don't let perfect stop you shipping it this week.
>
> Do you have one? Be honest.

```
#security #websecurity #csp #headers #webdev #appsec #infosec #backend
#programming #devops #webdeveloper #softwareengineering #devtips #dev #web
```

---

## `v2-50-blur-performance`

> Never animate a blurred layer. Two rules about blur that cost me a lot of
> frames on real phones.
>
> RULE ONE — opacity only. Resize or reposition anything with a backdrop-filter
> and the compositor re-snapshots what's behind it every single frame. Transform,
> width, top — all of them force it. Opacity is the one property that doesn't.
>
> RULE TWO — your phone is not your laptop. Touch devices are overwhelmingly on
> integrated GPUs, where blur radius is the single most expensive part of the
> effect, and the cost scales with the radius rather than the element:
>
> @media (hover: none) {
>   backdrop-filter: blur(calc(var(--glass-blur) * 0.6));
> }
>
> Sixty percent of the blur, on touch devices only. Nobody has ever noticed. A
> phone is smaller, denser and further from your eye than a monitor — the radius
> that reads as glass there is smaller than the one you tuned on a laptop.
>
> HOW TO CATCH IT — 6x CPU slowdown in devtools, then scroll past every glass
> surface on the page. Effects that are free on your machine are exactly where
> mid-range Android drops to fifteen frames a second.
>
> Have you tested yours throttled?

```
#webperformance #css #frontend #webdev #optimization #mobileweb #uidesign
#javascript #webdeveloper #performance #frontenddeveloper #devtips #ux #dev #web
```

---

## Posting order — tips series

Alternate with the promotional decks rather than running eight teaching posts in
a row. Broadest-appeal first; the two security decks sit mid-run where they get
saved rather than scrolled.

| Slot | Deck | Why here |
|---|---|---|
| 1 | `v2-43-bundle-bloat` | Best numbers, widest appeal, most shareable |
| 2 | `v2-45-contrast` | Everyone has this bug and can check it in a minute |
| 3 | `v2-47-hydration` | Huge React audience, strong opinion, invites argument |
| 4 | `v2-44-glass-legibility` | Visual, on-brand, pairs with the Apple series |
| 5 | `v2-46-money-rounding` | Alarming — the "check yours tonight" deck |
| 6 | `v2-48-auth-mistakes` | Security saves well; specific enough to be credible |
| 7 | `v2-50-blur-performance` | Non-obvious, practical, quick win |
| 8 | `v2-49-csp` | Narrowest audience, best comments |
