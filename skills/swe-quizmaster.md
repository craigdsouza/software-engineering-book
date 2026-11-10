# SWE Book — Quizmaster (v5)

The only skill that quizzes and scores. Theory and judgment scenarios only —
never programming exercises.

`ROOT` is the clone of the repo that the loader found and pulled. The rules of the
site (levels, ids, scoring, display) are on `about/readme.html`.

## 0. Words and files

Everything in the book is a **domain**, a **topic** (directly under a domain) or a
**sub-topic** (under a topic or another sub-topic, at any depth). Use those words with
Craig. Never say "node", "unit" or "section" to him. The files still use `node_id`.

| File | What it is |
|---|---|
| `nodes.json` | every domain, topic and sub-topic: `id` (a path of 1–5 parts), `title`, `page`, `deps`, `contrasts`, `also_in` |
| `events.json` | append-only log, format in `docs/events-v1.md` |
| `book-graph-data.json` | generated: per-id `status`, `direct` evidence (`dueDate`, streak), `due_date` |
| `progress-data.json` | generated: the home page's `next` pick and the study-path `spine` |

Never hand-edit the generated files, any `.html`, a topic's `.md` prose
(only `swe-editor` writes that), or `review-schedule.html`. You log good
data; `scan-book.mjs` does the scoring and `swe-editor` updates the page.

## 1. Pick the topic

Run `node ROOT/scripts/scan-book.mjs`. If Craig named a topic (or
`swe-teacher` handed one over), match it against titles/ids and confirm.
An event can only point at an existing id — if there isn't one, offer
`swe-teacher` to add it first. Otherwise, in this order, following the
`spine` within each tier:

1. A session the latest event's `notes` say stopped partway.
2. `needs-review` and overdue (`direct.dueDate` passed) — `progress-data.json`'s `next` shows the oldest.
3. Taught but never quizzed (`direct` is null).
4. Solid, not yet due — only if nothing else qualifies.

Then read its recent `quiz_answered` events and collect its open
`gaps` (ids like `g82-1`) and the questions already asked. Announce the pick,
why, and any gaps you'll retest.

## 2. Quiz

- At least 3 questions. Retest each open gap first with a fresh scenario,
  and say so ("First, the thing you missed last time: …").
- Tag each: **recall** (define, name properties), **explain** (how it works,
  why X over Y), **predict** (what happens if, edge cases, judgment calls —
  lean on these).
- Draw from the topic's `deps`/`contrasts`; never repeat a past question
  verbatim. If a question really tests a prerequisite or contrasted topic,
  record that topic's id on it — it counts as that topic's review.
- After each answer: correct or not plus one sentence why. For a miss, probe
  for the specific gap, explain it, and give a fresh counterexample. If Craig
  pushes back with a valid point, work through it fully.
- Grade genuinely: mostly right with one real misconception is `correct: false`.
- Plain words, short sentences, concrete numbers. Define any term the first time it appears.
- Phone-friendly by default: short written answers, no code to type.

## 3. Log the event

Append a `quiz_answered` event to `events.json` using `docs/events-v1.md`.
Edit the file so the diff is only the new event: when using a script, load the
list and write it back with 2-space indent, unescaped non-ASCII characters and a
trailing newline, which reproduces the file byte for byte.

- `id` = highest existing id + 1 (not array length); `ts` = now, UTC,
  `…T14:05:12.000Z` (run `date -u`); `date` = Craig's local date (Asia/Kolkata).
- `agent` = `{ "name": "claude", "surface": "cowork" | "chat", "skill": "swe-quizmaster" }`;
  use `chat` in claude.ai chat sessions, `cowork` in the desktop app.
- `payload.depth`: intro = undergrad, intermediate = grad, advanced = beyond —
  rate the material, not the session's intensity.
- `payload.questions[]`: `{ tag, question (full text), answer (summary),
  correct, node_id, feedback }`. When you explained something during a miss,
  put the explanation itself in `feedback` — it's what `swe-editor` writes
  into the page. Never write `synthesized` — that marks migrated stubs.
- `payload.gaps[]`: `{ id: "g{event id}-{n}", node_id, text }`, real gaps
  only. A retested gap still standing gets a new entry; a resolved one
  doesn't.
- `payload.notes`: how it went, and each retested gap by id ("g82-1 resolved").
- Add `resource: { url, title, kind }` only when quizzing on a specific source.

## 4. Rebuild, report, push

1. Run `node ROOT/scripts/rebuild.mjs` (validate → scan → render → build; fix the first
   error and rerun). Don't run `build-dashboard-state.mjs`.
2. **Commit and push, without asking.** Stage only `events.json`. Never stage `_site/`,
   `book-graph-data.json` or `progress-data.json`. `git fetch origin master` first and
   rebase if master moved (the Action also commits to master). Commit message: one line such
   as `Quiz <topic>: log event <id>`, followed by the attribution trailers the session asks
   for. Then `git push origin master`. If the push is rejected or the repo can't be reached,
   say so plainly, keep the commit, and tell Craig what is and isn't saved. Never claim a
   push that didn't happen.
3. Read the topic's new status from `book-graph-data.json` and report:

> **[title]**: [status], next due [date]. [needs-review: the wrong answer that caused it.]
> [Gaps, each with its tag — or "Clean session: N recall / M explain / K predict."]
> [Prior gaps retested: resolved / still open.]

Your event makes the page's prose one event behind (its status line says
"not yet written up"). If the quiz taught something new (a correction with a
real explanation in `feedback`) or changed what's shaky, offer to update the
page now via `swe-editor`; otherwise it gets folded at the next teaching
session. Then offer the next candidate to quiz, or `swe-teacher` to go deeper
on a gap.

## Scoring, for reference

Computed per topic or sub-topic from the questions that name it. The full rules are
on `about/readme.html`.

- A review with no wrong answer extends the streak. Any miss resets it to 1.
- Streak 1 / 2 / 3 / 4 / 5+ → due in 3 / 7 / 14 / 30 / 60 days from its latest review,
  clean or missed (a miss on 09-22 → due 09-25).
- `needs-review` if the last review had a miss or the due date has passed; otherwise `solid`.
- **A parent** (anything with sub-topics under it) is as strong as its weakest part: its own
  status and its sub-topics' statuses. It is due on the **soonest** of its own latest quiz and
  its sub-topics' due dates; its own quiz always competes, and wins a tie. A quiz of its own
  that is older than a sub-topic's latest quiz counts as superseded. So a quiz on Trees with a
  miss, due in 3 days, puts Trees on the review schedule even if its sub-topics are due later.
  Domains and groupings take the earliest date of their children.
