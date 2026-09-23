---
name: "swe-editor"
description: "The single writer of the software-engineering-book's topic prose ({id}.md): folds events newer than each page's prose_through into the prose, places new nodes, and rebuilds. Triggers: \"update the book\", \"fold the backlog\", \"write up the prose\", end of every swe-teacher session."
---

# SWE Book — Editor

Events are the raw record; the prose is the book. Any agent (Claude, Gemini,
a script) can append events, but only this skill rewrites prose, so two
writers never overwrite each other. Your job: turn the events a page hasn't
absorbed yet into a clean, timeless explanation, and move the page's
`prose_through` marker forward. Everything lives in:

`ROOT = C:\Users\CRAIG-DSOUZA\Code\software-engineering-book`

| File | You may |
|---|---|
| `{id}.md` (next to each topic page) | edit — this is the prose; format in `docs/prose-format.md` |
| `nodes.json` | edit only `page` fields (placing/promoting nodes) and `forward_pointers` |
| `events.json` | read only — never edit, never append |
| `*.html`, `book-graph-data.json`, `progress-data.json` | never — all generated |

## 1. Get the backlog

Run `node ROOT\scripts\rebuild.mjs`, then `node ROOT\scripts\prose-backlog.mjs`
(add a node id or page file to limit it to one page). It prints, per page that
is behind: the page's nodes with their current status, then every backlog
event in full — `content`, `notes`, each quiz question with Craig's answer and
the feedback, `gaps`, `resource`. It also lists **unplaced** nodes (events but
no `page`). No backlog and nothing unplaced → say so and stop.

## 2. Place unplaced nodes

- **Section** (the default): add `## Title {#anchor}` to the parent page's
  `.md` and set the node's `page` to `parent.html#anchor`.
- **Own page**, only when it's a new top-level topic under its domain: set
  `page` to `{id}.html` and create `{id}.md` with front matter
  `prose_through: 0` (step 3 moves it forward).
- **Promote** a section once it needs sections of its own (Trees is the
  precedent): move its prose into `{id}.md`, set `page` for it and its
  section nodes, leave one callout on the old page ("X is now its own page"),
  and fix links to it in every `.md`.

## 3. Fold each page

Read the page's `.md`, `docs/prose-format.md`, and its packet. Then rewrite:

- **Body sections explain the topic, timelessly.** Taught/read `content`, and
  any explanation inside quiz `feedback` (e.g. "a WebView is a full embedded
  browser engine, so it has a cookie jar"), goes into the section it belongs
  to. Merge — rewrite the section so it reads as one explanation, never tack
  on a paragraph per event. A misconception worth warning any reader about
  becomes a "tempting but wrong" sentence with its counterexample.
- **Learner state goes only in "Where things stand"**: what's solid, what's
  shaky, which misconceptions came up and whether they're resolved, what's
  next. Rewrite it whole from the packet's node statuses plus the events —
  one paragraph, plain language, no gap ids, no event ids.
- **No dates or session history in body prose**, and no dated callouts.
  Callouts are only for cross-topic links or "moved to its own page". Older
  paragraphs still carry a few dates; when you rewrite one, move that history
  into "Where things stand" or drop it.
- **Never go beyond the events.** Don't add facts, examples or depth that no
  event contains; you may smooth wording, reorder, and link to existing pages
  and anchors. If an event looks factually wrong, leave it out and flag it to
  Craig instead of silently correcting it.
- **Other agents' events** (Gemini, a paper reading) get the same treatment
  in the book's voice. When an event has a `resource`, cite it inline:
  `[title](url)`.
- **Beyond current depth** → one sentence in the prose plus a row in the
  page's "Intermediate & Advanced Topics" table and an entry in nodes.json
  `forward_pointers` (`{ id, title, tier, under, note }`).
- **Nothing prose-worthy** (e.g. a clean confirm-only quiz) → just update
  "Where things stand".
- Finally set the front matter `prose_through` to the highest event id in
  this page's backlog — whether or not it changed the body.

## 4. Rebuild

Run `node ROOT\scripts\rebuild.mjs`. `render-pages.mjs` rejects raw HTML,
unclosed fences, and a section node whose `{#anchor}` heading is missing —
fix the `.md` and rerun. The page's status line should no longer say
"not yet written up".

## 5. Report

Per page: the events folded (`#86, #87`), the sections you changed and in one
line each what changed, anything you flagged or left out, and
`git diff --stat`. Don't commit — Craig reviews and commits.