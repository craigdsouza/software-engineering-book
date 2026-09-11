# Handoff — progress views for software-engineering-book

**For:** Claude Code, working in the `software-engineering-book` repo.
**Visual spec:** `Home Page.dc.html` (and `Book Progress.dc.html` for the due strip, section 04). Open them and match layout, type scale and color exactly. Where this doc and the DCs disagree, the DCs win on visuals and this doc wins on data and rules.

## Goal

The skills (`swe-teacher`, `swe-quizmaster`) currently write status into the site by hand. Stop doing that. The skills write **events**; a script derives **views**. Everything below is deterministic and safe to re-run.

Pipeline:

```
events.json + *.graph.json  ──scan-book.mjs──▶  book-graph-data.json
                                                      │
                                                      ├─▶ progress-data.json   (new: derived view data)
                                                      │
                                            build-progress.mjs
                                                      │
                          ┌───────────────────────────┼──────────────────────┐
                          ▼                           ▼                      ▼
                     index.html              review-schedule.html      (nothing else)
```

Two scripts, both idempotent. Step 6 of each skill gains one line: run `scan-book.mjs` then `build-progress.mjs`. No other skill changes.

## Scope — four views, two pages

**`index.html`** — replace the current body content entirely, in this order:

1. **Cadence strip** — 28 day cells, activity ramp, with active-days / longest-run / days-since-last.
2. **Next up card** — the dark `--code-bg` card, including the four-clause rule with the fired clause marked. Only the card; no ledger rows beneath it.
3. **The spine** — every unit in curriculum order, collapsed to a tick row, expanding on click into per-section rows with recall / explain / predict cells.

**`review-schedule.html`** — add the **due strip** at the top (`Book Progress.dc.html` section 04): one lane per scheduled node, label growing rightward from the dot, upcoming above the axis and overdue below, plus the unscheduled list. Existing tables stay for now; we'll redesign them later.

**Not building:** book-growth charts (rejected), session receipts (these stay in chat, printed by the skills — never written to the site).

## Data contract — `progress-data.json`

`scan-book.mjs` emits this alongside `book-graph-data.json`. `build-progress.mjs` reads only this file — it must never re-derive status or re-read `events.json`.

```jsonc
{
  "generated_at": "2026-09-07T10:00:00.000Z",
  "today": "2026-09-07",                  // the date all offsets are computed against

  "cadence": {
    "days": [ { "date": "2026-08-11", "questions": 0, "level": 0 } ],  // oldest → newest, 84 entries
    "active_days": 9,                      // within the rendered window
    "longest_run": 4,
    "days_since_last": 1
  },

  "next": {                                // see "Frontier rule" below
    "node_id": "book:foundations/trees",
    "title": "Trees",
    "path": ["Foundations", "1.1 Data Structures", "Trees"],
    "href": "foundations/trees.html",
    "clause": 1,                           // 1-4, which clause selected it
    "why": "Five days overdue, and the only node in the book that is. …"
  },

  "spine": [
    {
      "name": "Foundations",
      "meta": "track 1 · in progress",
      "units": [
        {
          "ord": "1.1",
          "title": "Data Structures",
          "note": "you are here · 8 nodes",
          "count": "1 / 8 solid",
          "here": true,                    // exactly one unit is `here` (contains `next`)
          "footnote": "…",                 // optional, shown at the foot of the expanded panel
          "nodes": [                       // omit entirely for unwritten units; use `blank: 6` instead
            {
              "node_id": "book:foundations/data-structures#arrays",
              "title": "Arrays",
              "kind": "section",           // "page" | "section"
              "depth": 0,                  // 1 = nested under the preceding page row
              "status": "fresh",           // solid | fresh | needs-review | ungraded | unwritten
              "meta": "due 09-08 · reviewed 1x",
              "tags": { "recall": [1,1], "explain": null, "predict": [2,2] },  // [right, asked]; null = never asked
              "stands": "Address arithmetic and amortized doubling both clean. …"
            }
          ]
        },
        { "ord": "1.2", "title": "Algorithms", "note": "opens when 1.1 is solid", "count": "—", "blank": 6 }
      ]
    }
  ],

  "due": {
    "scheduled": [
      { "node_id": "book:foundations/trees", "title": "Trees", "due": "2026-09-02", "status": "needs-review", "offset_days": -5 }
    ],
    "unscheduled": [
      { "node_id": "…#linked-lists", "title": "Linked Lists", "last": "never scored" }
    ],
    "advice": "Six nodes carry no due date because they've never been scored on their own. …"
  }
}
```

Notes on fields:

- `meta`, `note`, `count`, `stands`, `why`, `advice`, `footnote` are **prose composed by the script**, not by the renderer. Keep the sentence templates in one place in `scan-book.mjs` so wording stays consistent.
- `stands` is the one field worth care: prefer the most recent unresolved gap from `events.json` for that node, falling back to a summary of what was taught. It is what makes the accordion worth opening.
- `tags` aggregates every `questions[]` entry ever logged for that node. Pre-`questions[]` events (before event 72, 2026-09-03) contribute nothing — leave the tags `null` rather than inventing shape from an aggregate score.
- `level` in cadence: `0` for 0 questions, then `1` ≤2, `2` ≤5, `3` ≤9, `4` for 10+.
- `offset_days` is signed, negative = overdue. The renderer must not recompute dates.

## Frontier rule

Confirmed. Evaluate in order; first clause that matches wins, and record which one in `next.clause`:

1. **Any node past its due date, oldest first.** Review debt beats new ground.
2. Otherwise walk **tracks in curriculum order, then units in order, then sections in order**, and take the first node that is not `solid`.
3. If that node has a declared **dep** that is not `solid`, take the dep instead (recursively, deps first).
4. **Sections before their parent page** — a page's status is a roll-up of its children, so it cannot be cleared directly.

Curriculum track order is fixed and must be read from the curriculum definition, never sorted alphabetically or by activity: Foundations (Data Structures → Algorithms → Complexity Theory → Discrete Math → Programming Concepts) → Systems → Mathematics → Software Engineering → Theory → Specialization.

Today this yields **Trees** via clause 1. With clause 1 removed it would yield Arrays via clause 2 — that alternative was considered and rejected, so clause 1 stays first.

Render the whole clause list in the card, marking the fired one with `→` and dimming the rest. The point is that the pick is auditable, not just asserted.

## Colors — use the tokens, don't invent

Everything in the DCs traces to `style.css` except the status ramp. Use `var(--…)` in the real pages; the DCs inline the resolved values only because they can't use stylesheets.

| Use | Token |
|---|---|
| Page ground | `--bg` `#fdfcfa` |
| Expanded accordion panel | `--bg-alt` `#f3f1ec` |
| Body text | `--text` `#26241f` |
| All secondary text, metas, counts, axis labels | `--text-dim` `#5b5847` |
| Accent, carets, active unit's left rule | `--accent` `#8a5a2b` |
| needs-review swatch fill | `--accent-bg` `#f1e6d8` |
| Hairlines, borders, unwritten swatch edge | `--border` `#ddd8cb` |
| Next-up card ground / its text / its accent | `--code-bg` `#2b2a26` / `--code-text` `#f0ede4` / dark `--accent` `#d99a5c` |
| solid | `--solid` `#3a7d5c` |
| Due strip: overdue / upcoming | `--overdue` `#b3452c` / `--upcoming` `#a8791f` |

**Add these three to `:root`** — status tints have no existing token, and they need dark-mode counterparts:

```css
--status-solid:  #3a7d5c;   /* = --solid */
--status-fresh:  #a9cdb7;
--status-faint:  #6ba585;   /* mid ramp step, cadence level 3 */
```

Swatch states, which must stay visually distinct:

- `solid` — filled `--status-solid`
- `fresh` — filled `--status-fresh`, `#6ba585` edge
- `needs-review` — filled `--accent-bg`, `--accent` edge
- `ungraded` — filled `--border`, `--text-dim` edge
- `unwritten` — transparent, `--border` hairline

`ungraded` and `unwritten` are semantically opposite (real teaching that can't be scored vs. nothing written) and were accidentally identical at one point. Keep them apart.

## Requirements

- **Static output.** The accordion is the only interactive element — `<details>`/`<summary>` or ~20 lines of vanilla JS, no framework, no build step. Everything else is server-rendered HTML.
- **Accordion:** keyboard-operable, headers ≥44px, open state keyed on unit `ord`, the `here` unit open by default. Units with no `nodes` are inert (no caret, `cursor: default`).
- **Due strip:** every pin gets its own 30px lane and its label grows **rightward** from the dot — never centered. A day is ~36px of travel but labels run 40–120px wide, so centered labels collide. Overdue pins hang below the axis with the connector running **up** to it.
- **No hand-written status anywhere.** If a number can't be derived from `progress-data.json`, it doesn't go on the page.
- **Dark mode** must work — the `@media (prefers-color-scheme: dark)` block already overrides every token used here except the three new ones.
- Print styles: no need, these pages aren't printed.

## Acceptance

Run the pipeline on the current repo and check:

- Cadence shows 9 active days, longest run 4, 1 day since last.
- Next-up card reads **Trees**, clause 1 marked, path `Foundations → 1.1 Data Structures → Trees`.
- Data Structures shows `1 / 8 solid`, is open by default, and lists 8 rows with BST indented under Trees.
- Only three rows have any tag cells (Arrays, Hash Tables, BST); the other five are all dashes.
- Due strip: Trees below the axis at −5d, Arrays +1d and BST +2d above it in separate lanes, 6 unscheduled.
- 6.1 Web + Mobile Dev expands to 4 `ungraded` rows, visually distinct from 2.0 Systems' `unwritten` ticks.
- Re-running the scripts with no new events produces byte-identical HTML.

## Two data problems to raise, not fix

Worth telling the user about; don't silently work around them.

1. **Four Specialization pages have no `.graph.json` sidecar** (APIs, Auth, State & Caching, Databases) despite real taught and quizzed events, so `scan-book.mjs` can't score them. They can only ever render as `ungraded`. Adding one sidecar each pulls them into the spine properly.
2. **Six of eight Data Structures nodes have no `dueDate`** because the 2026-08-30 review graded the whole page in one aggregate. They are permanent debt in the due strip until each gets one section-level check.
