# SWE Book — Editor (v2)

Events are the raw record; the prose is the book. Any agent (Claude, Gemini,
a script) can append events, but only this skill rewrites prose, so two
writers never overwrite each other. Your job: turn the events a page hasn't
absorbed yet into a clean, timeless explanation, and move the page's
`prose_through` marker forward.

`ROOT` is the clone of the repo that the loader found and pulled. The rules of the
site (levels, ids, scoring, display) are on `about/readme.html`.

Use these words with Craig: **domain**, **topic**, **sub-topic**. Never "node", "unit" or
"section". The files still use `node_id` and `nodes.json`.

| File | You may |
|---|---|
| `{id}.md` (next to each topic page) | edit — this is the prose; format in `docs/prose-format.md` |
| `nodes.json` | edit `page` fields (placing and promoting) and `forward_pointers`; and ids only in a rename (step 2) |
| `events.json` | read only — never append. The one exception is an id rename (step 2), where you may rewrite ids inside it and nothing else |
| `*.html`, `book-graph-data.json`, `progress-data.json` | never — all generated |

## 1. Get the backlog

Run `node ROOT/scripts/rebuild.mjs`, then `node ROOT/scripts/prose-backlog.mjs`
(add an id or page file to limit it to one page). It prints, per page that
is behind: the page's topics and sub-topics with their current status, then every backlog
event in full — `content`, `notes`, each quiz question with Craig's answer and
the feedback, `gaps`, `resource`. It also lists **unplaced** ones (events but
no `page`). No backlog and nothing unplaced → say so and stop.

## 2. Place unplaced topics and sub-topics

An id is a path and the path is the hierarchy: a parent is the id minus its last part, and
the home page indents by it. A sub-topic's page is its parent's page unless it has sub-topics
of its own.

- **Section** (the default): add `## Title {#anchor}` to the **parent's** page `.md` and set
  `page` to `parent.html#anchor`. If the unplaced id sits under a different parent than the
  page you think it belongs on, don't place it there. Flag it to Craig; the fix is an id
  rename, which `skills/swe-teacher.md` step 4 describes.
- **Own page**, only when it's a new topic under its domain: set `page` to `{id}.html`
  and create `{id}.md` with front matter `prose_through: 0` (step 3 moves it forward).
- **Promote** a sub-topic once it needs sub-topics of its own (Trees and Stacks & Queues are
  the precedents): move its prose into `{id}.md`, set `page` for it and its sub-topics, leave
  one callout on the old page ("X is now its own page"), and fix links to it in every `.md`.
  **If the promoted page groups existing siblings** (Stacks and Queues became sub-topics of
  Stacks & Queues), their ids must be renamed to nest under it, or the home page shows them
  beside it. Follow the rename steps in `skills/swe-teacher.md` step 4, then check that no
  status, due date or review count changed.

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
  next. Rewrite it whole from the packet's statuses plus the events —
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
- Plain words, short sentences, concrete numbers. Define any term the first time it appears.
- Finally set the front matter `prose_through` to the highest event id in
  this page's backlog — whether or not it changed the body.

## 4. Rebuild

Run `node ROOT/scripts/rebuild.mjs`. `render-pages.mjs` rejects raw HTML,
unclosed fences, and a sub-topic whose `{#anchor}` heading is missing —
fix the `.md` and rerun. The page's status line should no longer say
"not yet written up".

## 5. Report and push

Report per page: the events folded (`#86, #87`), the sections you changed and in one
line each what changed, anything you flagged or left out, and `git diff --stat`.

Then save it:

- **Called by `swe-teacher`** → don't commit; the teacher commits and pushes everything together.
- **Run on its own** ("update the book") → commit and push without asking. Stage only the
  `.md` pages, `nodes.json` (and `events.json` and `docs/events-v1.md` after an id rename).
  Never stage `_site/`, `book-graph-data.json` or `progress-data.json`. `git fetch origin master`
  first and rebase if master moved (the Action also commits to master). Commit message: one line
  such as `Write up <page>: fold events #86–#87`, followed by the attribution trailers the session
  asks for. Then `git push origin master`. If the push is rejected or the repo can't be reached,
  say so plainly, keep the commit, and tell Craig what is and isn't saved. Never claim a push
  that didn't happen.
