# Events — schema 1

The event log is the only record of what was taught, read and quizzed. Every status on the site
is computed from it; nothing else is hand-written. `scripts/validate-events.mjs` enforces
everything below, and the REST API will run the same checks on every write.

Files: `events.json` (the log), `nodes.json` (the node registry every `node_id` must come from).
A page node's prose lives at `{id}.html` (e.g. `computer-science/data-structures.html`); a section node is an
`#anchor` on its parent's page. One deliberate exception: `computer-science/complexity/big-o` still lives at
`computer-science/data-structures.html#big-o`, where it was taught.

## Outer fields (every event)

| Field | Set by | Values |
|---|---|---|
| `id` | server | increasing integer (the migrated log keeps 51–85; next is 86) |
| `schema` | server | `1` |
| `ts` | server | UTC, always `2026-09-21T14:05:12.000Z` |
| `date` | server | `YYYY-MM-DD`, Craig's local day |
| `verb` | agent | `taught` \| `quiz_answered` \| `read` |
| `node_id` | agent | an id from `nodes.json`, e.g. `computer-science/data-structures/hash-tables` |
| `agent` | agent (+ server key) | `{ name, surface, skill }`, e.g. `{ "gemini", "chrome", "paper-tutor" }` |
| `resource` | agent, optional | `{ url, title, kind }`; absent = taught from the model's own knowledge |
| `payload` | agent | depends on `verb`, below |

## payload by verb

**taught** — `{ depth, content, notes }`
- `depth`: `intro` (undergrad) \| `intermediate` (grad) \| `advanced` (beyond grad), the agent's judgement
- `content`: everything taught for this node, complete enough to write the page from — `swe-editor` builds
  the page's prose from it (see `docs/prose-format.md`). Several paragraphs and text diagrams are fine.
- `notes`: anything else worth keeping

**quiz_answered** — `{ depth, questions[], gaps[], notes }`
- `questions[]`: `{ tag: recall|explain|predict, question, answer, correct: true|false, node_id, feedback }`
  - `question` is the full text asked; `answer` summarises Craig's reply; `feedback` is the agent's response,
    including any explanation given after a miss (the editor writes that into the page)
  - each question names its own `node_id`, so one quiz (e.g. on a paper) can score several nodes
- `gaps[]`: `{ id, node_id, text }`, with `id` like `g86-1` (event id + position)

**read** — `{ nodes[] }`, each `{ node_id, content, notes }`

## Scoring

Per node: a quiz event counts as a review of every node its questions name. A review with any
wrong answer for that node resets its streak to 1; a clean one adds 1. Streak → next review gap:
1→3d, 2→7d, 3→14d, 4→30d, 5+→60d. The gap is counted from the node's latest review, clean or missed, so a
miss on 09-22 makes the node due on 09-25. A node that has never been quizzed has no due date. `taught` and `read` never change status.

## Migration notes (2026-09-21, `scripts/migrate-to-v1.mjs`)

- The 50 `concept:` events were dropped. They live on in `events.pre-v1-backup-2026-09-20.json`,
  which life-os now reads (`learningEventsPath` in life-os/config.json).
- 12 old quiz events stored only totals. Their questions are rebuilt as stubs
  (`synthesized: true`, `tag`/`question`/`answer`/`feedback` null) so scoring is unchanged —
  verified identical for all 14 scored nodes.
- The 8 quiz events that had per-question detail keep `tag` and `correct`; the old one-line note
  becomes `feedback`, and `question`/`answer` are null (the text was never recorded).
- All 15 taught events and 19 of 20 quiz events are `intro`; #59 (isolation levels, replication,
  sharding, CAP) is `intermediate`.
- Five old "gap" entries that were really assessment notes (#68 ×3, #69 ×1, #85 ×1) moved into `notes`.
- Old fields dropped: `source`, `actor`, `vault_note`, `catalog_video`, `mode`, `session_depth`,
  `concepts_written` (folded into `content`), `questions_asked`/`correct`/`wrong` (derived now).

## Drafts (agents that can't write to the repo)

An agent without repo access submits a **draft**: an event minus everything the book assigns. Today
that's Gemini in Chrome (Skill: `docs/skill-history/gemini-book-tutor.*`), pasted through `log.html`.

- Allowed fields: `verb`, `node_id`, `agent`, `resource`, `payload`, and optional
  `proposed_node: { id, title }` for a topic the registry doesn't have yet (its parent must exist).
- Never in a draft: `id`, `schema`, `ts`, `date`, or gap ids. Gaps are `{ node_id, text }`.
- `log.html` checks the paste with `scripts/lib/event-rules.mjs` (`checkDraft`) and creates
  `inbox/<submit time>-<random>.json` = `{ submitted_at, via, drafts: [...] }` through GitHub's API.
- On push, the Action runs `scripts/ingest-inbox.mjs`: same checks; a draft identical to one already
  logged is skipped; `id` = highest + 1, `ts` = `submitted_at`, `date` = that moment in IST, gap ids
  `g{id}-{n}`; a proposed node is added to `nodes.json` with `page: null` (swe-editor places it).
  Any bad draft sends the whole file to `inbox/rejected/` with a `.error.txt` naming each field.
  The Action commits the result to master, then builds and deploys.
- The generated `agent-guide.html` lists every valid `node_id` with status, open gaps and recent
  questions, plus examples that are checked against these rules on every build.

