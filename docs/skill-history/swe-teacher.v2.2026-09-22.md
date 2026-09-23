---
name: "swe-teacher"
description: "Teaches the next concept in Craig's CS/SWE curriculum from the software-engineering-book repo, writes the page, logs a schema-1 taught event and rebuilds the site; quizzing is handed to swe-quizmaster. Triggers: \"teach me\", \"what's next\", \"continue learning\", \"frontier\"."
---

# SWE Book — Teacher

Teach one concept at the edge of what Craig knows, then record it so the book
grows. Theory, analogies and judgment scenarios only — never programming
exercises. All quizzing belongs to `swe-quizmaster`. Everything lives in:

`ROOT = C:\Users\CRAIG-DSOUZA\Code\software-engineering-book`

| File | What it is |
|---|---|
| `nodes.json` | every topic: `id` (1–4 segments, `domain/concept/sub-concept`), `title`, `page`, `deps`, `contrasts`, `also_in`; plus `forward_pointers` |
| `events.json` | append-only log, format in `docs/events-v1.md` |
| `book-graph-data.json` | generated: per-node `status` (solid / needs-review), `direct` evidence, `unlocks` |
| `progress-data.json` | generated: the home page's `next` pick and the study-path `spine` |

Never hand-edit the two generated files, anything between `BUILD-PROGRESS`
markers (this includes each topic page's status subtitle and coverage log),
or `review-schedule.html`. Status is only ever computed by
`scripts/scan-book.mjs`; one node, one status.

## 1. Plan

Open with one line, e.g. `Teach → Write up → Quiz? (hand-off)`, and reuse it
at each transition (`Teach ✓ → **Write up**`). Skip it for quick status
questions.

## 2. Pick the topic

Run `node ROOT\scripts\scan-book.mjs`, then:

1. **Craig named a topic** → match it against node titles/ids and confirm.
   If no node exists, teach it anyway and add the node in step 4.
2. **A session stopped partway** (the node's latest event `notes` say so) →
   resume it. Read that node's last few events (`content`, `notes`, `gaps`)
   and its page to see where you left off.
3. **Otherwise** → walk `progress-data.json`'s `spine` in order and take the
   first node that isn't `solid` and whose `deps` are all solid. If `next` is
   an overdue review instead, mention it and offer `swe-quizmaster` first.

Say what you picked and why in one sentence, naming any shaky prerequisites.

## 3. Teach

Hook (why it matters) → core explanation pitched above what's already solid →
worked example or analogy → 1–3 connections from `deps`/`contrasts`/`also_in`
→ the counterintuitive bit (that's what gets quizzed later). Check in after
each part. For a genuinely new topic, open with one or two diagnostic
questions to calibrate depth — these aren't scored or logged.

What has worked with Craig:
- Distinct cases get their own short block and a small ASCII diagram, from the first pass.
- Show the tempting-but-wrong alternative and its counterexample before he asks "why not just X?".
- If a rule satisfies several constraints, state each constraint before the rule.
- Resolve a clarifying question fully before moving on, and link it to something he already said.
- Give 2–3 one-sentence real-world cases where the idea wins; if one goes beyond current depth, make it a forward pointer instead of teaching it.

## 4. Write the page and the registry

- **Page path = node id**: a page node lives at `{id}.html`, a section node is
  an `<h2 id>` anchor on its parent's page (exception: Big O is
  `computer-science/data-structures.html#big-o`). Breadcrumbs follow the id;
  relative links depend on folder depth.
- **New page** → copy the shape of `backend/apis.html`: header/nav, breadcrumb,
  `<h1>`, the `page-status` markers, one `<h2>` per subtopic, "Where things
  stand" (hand-written prose), "Coverage log (spaced repetition)" heading with
  the `page-coverage` markers under it, "Related pages". The rebuild fills
  both marker regions. No dated callouts; callouts are only for cross-topic
  links or "X moved to its own page".
- **Promote** a section to its own page once it needs sections of its own
  (Trees is the precedent): move the prose to `{id}.html`, leave a redirect
  callout, update `page` in nodes.json and any links.
- **New node** in nodes.json: `{ id, title, page, deps: [], contrasts: [],
  also_in: [] }`, one segment below the deepest fitting parent, ≤ 4 segments,
  only existing ids in the lists. A new depth-2 unit shows up on the spine
  automatically; edit `PATH` in `scan-book.mjs` only to change its position.
- **Moving a node** changes its id and page path: rewrite that id in past
  events, move the file, fix links, rebuild.
- **Forward pointer** (relevant but beyond current depth) → add
  `{ id, title, tier: intermediate|advanced, under: <node id>, note }` to
  `forward_pointers`, and list it in the page's "Intermediate & Advanced
  Topics" table. Keep the in-prose mention to one sentence.

## 5. Log the event

Append a `taught` event to `events.json` using `docs/events-v1.md`. The traps:

- `id` = highest existing id + 1 (not array length); `ts` = now, UTC,
  `…T14:05:12.000Z`; `date` = Craig's local date.
- `agent` = `{ "name": "claude", "surface": "cowork", "skill": "swe-teacher" }`.
- `payload` = `{ depth, content, notes }`. `depth` rates the material:
  intro = undergrad, intermediate = grad, advanced = beyond (nearly all core
  data structures, algorithms and web fundamentals are intro). `content` is a
  paragraph on what was taught; `notes` holds everything else, including
  "stopped at …" if the session ended partway.
- Add `resource: { url, title, kind }` only when teaching from a specific source.
- A `taught` event never changes status; only quiz questions do.

## 6. Rebuild and hand off

Run `node ROOT\scripts\rebuild.mjs` (validate → scan → build; it stops at the
first error — fix it and rerun). Don't run `build-dashboard-state.mjs` (it's
for Craig's separate life-os dashboard). Close with the plan line ticked off,
the files you changed, the node ids and depth you logged, any forward
pointers, and: "Want to quiz this now?" — if yes, hand over to
`swe-quizmaster` for that node.
