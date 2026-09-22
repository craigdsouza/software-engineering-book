# Software Engineering — A Study Book

A self-contained static HTML site — no build step, no dependencies. Open `index.html` directly in a browser to read it locally.

Spans the full curriculum as it's covered: Foundations (Data Structures, Algorithms, ...), Systems, Mathematics, Software Engineering, Theory, and specializations (currently Web + Mobile Development). Nothing in it is ever marked "finished" — see `about/teaching-style.html` for why.

## Publishing to GitHub Pages

1. Create a new repository on GitHub (public, if you want Pages to work on the free tier without extra config).
2. From this folder, connect it to that repo and push:
   ```
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git branch -M main
   git push -u origin main
   ```
3. On GitHub: go to the repo's **Settings → Pages**. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
4. GitHub will give you a URL, typically `https://<your-username>.github.io/<your-repo>/`, live within a minute or two.

## Updating later

Any time new content gets added (new topics, review-schedule changes), the files here get rewritten, then:
```
git add -A
git commit -m "update: <what changed>"
git push
```
GitHub Pages redeploys automatically on every push to `main`.

## Notes

- The branch is currently named `master`, not `main` — the `git branch -M main` step above (run from your own machine) renames it.
- This folder was renamed from an earlier `web-mobile-dev-book` before ever being pushed, so there's no stale remote or URL to worry about.
- `activity.html` loads `events.json` with a browser `fetch()` call, which most browsers block for local `file://` pages. It works once published to GitHub Pages; to preview locally, run a static server in this folder (e.g. `python3 -m http.server`) and open `http://localhost:8000/activity.html`.

## Structure

- `index.html` — home page: pick a curriculum, then a topic
- `about/teaching-style.html` — how this book expects to be taught from (theory-first, no code exercises, depth over completion, spaced repetition)
- `about/architecture.html` — clickable diagram of how `events.json`, `nodes.json`, the scripts and the generated JSON feed each page
- `review-schedule.html` — spaced-repetition tracker across all topics (fully generated; no hand-edited tables)
- `activity.html` — GitHub-style daily activity grid, built from `events.json`
- `foundations/*.html` — Computer Science topic pages (Data Structures, Trees); the folder name predates the domain reorg
- `backend/*.html` — Web + Mobile Development / Backend topics (APIs, Auth, State & Caching, Databases)
- `style.css` — shared styling, light/dark aware
- `events.json` — event log of teaching, reading and quiz activity (schema 1)
- `nodes.json` — the topic registry: domains, topics, pages, deps, contrasts, also_in

## events.json and nodes.json

`events.json` is the append-only log of every `taught`, `read` and `quiz_answered` event (schema 1).
`nodes.json` is the registry of topics every event must point at: ids like
`computer-science/data-structures/hash-tables`, grouped under 15 subject domains. The full format,
and what changed when the old log was migrated on 2026-09-21, is in [`docs/events-v1.md`](docs/events-v1.md).

After appending an event:

```
node scripts/validate-events.mjs events.json   # format + node ids
node scripts/scan-book.mjs                      # status per node -> book-graph-data.json, progress-data.json
node scripts/build-progress.mjs                 # renders index.html + review-schedule.html
```

The pre-migration log is kept as `events.pre-v1-backup-2026-09-20.json`; the separate life-os project
reads that file, and `scripts/build-dashboard-state.mjs` (life-os only) still builds from it.
