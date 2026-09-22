# Events — schema 1

The event log is the only record of what was taught, read and quizzed. Every status on the site
is computed from it; nothing else is hand-written. `scripts/validate-events.mjs` enforces
everything below, and the REST API will run the same checks on every write.

Files: `events.json` (the log), `nodes.json` (the node registry every `node_id` must come from).

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
- `content`: a paragraph on what was taught for this node
- `notes`: anything else worth keeping

**quiz_answered** — `{ depth, questions[], gaps[], notes }`
- `questions[]`: `{ tag: recall|explain|predict, question, answer, correct: true|false, node_id, feedback }`
  - `question` is the full text asked; `answer` summarises Craig's reply; `feedback` is the agent's response
  - each question names its own `node_id`, so one quiz (e.g. on a paper) can score several nodes
- `gaps[]`: `{ id, node_id, text }`, with `id` like `g86-1` (event id + position)

**read** — `{ nodes[] }`, each `{ node_id, content, notes }`

## Scoring

Per node: a quiz event counts as a review of every node its questions name. A review with any
wrong answer for that node resets its streak to 1; a clean one adds 1. Streak → next review gap:
1→3d, 2→7d, 3→14d, 4→30d, 5+→60d. `taught` and `read` never change status.

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
