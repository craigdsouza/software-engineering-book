# Software Engineering — A Study Book

A static HTML site built from sources by a few dependency-free Node scripts. Live at
<https://craigdsouza.in/software-engineering-book/>.

Spans the full curriculum as it's covered: Foundations (Data Structures, Algorithms, ...), Systems, Mathematics, Software Engineering, Theory, and specializations (currently Web + Mobile Development). Nothing in it is ever marked "finished" — see `about/teaching-style.html` for why.

## Sources vs. the built site

Git holds **only sources**: `events.json`, `nodes.json`, each topic's `{id}.md` prose, the page
templates (`index.html`, `review-schedule.html`), the hand-written pages (`activity.html`, `about/`),
`style.css`, the scripts and the docs. Everything generated goes into `_site/`, which git ignores:

```
node scripts/rebuild.mjs
  validate-events → scan-book → copy-sources → render-pages → build-progress → render-agent-guide
                    (writes book-graph-data.json and progress-data.json at the root, also ignored)
```

`copy-sources` starts a fresh `_site/` with a copy of every source file; `render-pages` writes each
topic page into it from its `.md`; `build-progress` fills the generated regions (home page, review-debt
chart, each topic page's status line and coverage log). The copies of `index.html` and
`review-schedule.html` at the root are templates — their generated regions are empty in git.

Preview locally: `python -m http.server -d _site`, then open <http://localhost:8000/>.

## Publishing

`.github/workflows/pages.yml` runs `rebuild.mjs` on every push to `master`, and daily at 06:00 IST so
"overdue" counts and "Next up" stay current, then publishes `_site/` to GitHub Pages. One-time setup:
**Settings → Pages → Build and deployment → Source: GitHub Actions**. (Before 2026-09-23 the site was
published straight from the branch, with generated files committed.)

## Structure

- `index.html` — home page template: cadence strip, next up, curriculum spine (filled in `_site/`)
- `about/teaching-style.html` — how this book expects to be taught from (theory-first, no code exercises, depth over completion, spaced repetition)
- `about/architecture.html` — clickable diagram of how `events.json`, `nodes.json`, the scripts and the generated JSON feed each page
- `review-schedule.html` — spaced-repetition tracker template (the review-debt chart is generated into `_site/`)
- `activity.html` — GitHub-style daily activity grid, built from `events.json`
- Topic prose lives at `{node id}.md`; the page is generated at `_site/{node id}.html` (format: [`docs/prose-format.md`](docs/prose-format.md)), so the path mirrors `nodes.json`: `computer-science/data-structures.html`, `computer-science/data-structures/trees.html`, `databases/fundamentals.html`, `backend/apis.html`, `backend/auth.html`, `frontend/state-caching.html`. Smaller topics are `#anchors` on their parent's page.
- `style.css` — shared styling, light/dark aware
- `events.json` — event log of teaching, reading and quiz activity (schema 1)
- `nodes.json` — the topic registry: domains, topics, pages, deps, contrasts, also_in

## Logging from other agents (inbox)

Agents that can't write to the repo (Gemini in Chrome) end a session by printing JSON *drafts*. Paste
them into **`log.html`** on the site: it checks them in the browser, then creates a file in `inbox/`
via GitHub's API (one-time: save a fine-grained token with Contents read/write on this repo only).
The Action's first step, `scripts/ingest-inbox.mjs`, numbers the drafts, appends them to
`events.json`, commits, then builds and deploys. Rejected drafts go to `inbox/rejected/` with the
reason. Agents read **`agent-guide.html`** (generated) for valid topic ids and the draft format.

Because the Action now commits to `master`, **pull before working locally** (`git pull`), or a
local session's `events.json` edit will conflict with an ingested one.

## events.json and nodes.json

`events.json` is the append-only log of every `taught`, `read` and `quiz_answered` event (schema 1).
`nodes.json` is the registry of topics every event must point at: ids like
`computer-science/data-structures/hash-tables`, grouped under 15 subject domains. The full format,
and what changed when the old log was migrated on 2026-09-21, is in [`docs/events-v1.md`](docs/events-v1.md).

After appending an event:

```
node scripts/rebuild.mjs   # validate-events -> scan-book -> copy-sources -> render-pages -> build-progress -> render-agent-guide, stops at the first failure
```

`render-pages.mjs` builds each topic page's shell (head, nav, breadcrumb, title) around the prose in its
`.md`; `build-progress.mjs` then fills every generated region: the home page, the review-debt chart, and each
topic page's status line and coverage log. The only hand-written content on a topic page is its `.md`
prose — topic `.html` files exist only in `_site/`.

The `.md` prose has a single writer, the `swe-editor` skill; every other agent only appends events. Each
`.md` records how far it has caught up (`prose_through`), a page's status line shows any events not yet
written up, and `node scripts/prose-backlog.mjs` prints them for the editor. Details in
[`docs/prose-format.md`](docs/prose-format.md).

The pre-migration log is kept as `events.pre-v1-backup-2026-09-20.json`; the separate life-os project
reads that file, and `scripts/build-dashboard-state.mjs` (life-os only) still builds from it.
