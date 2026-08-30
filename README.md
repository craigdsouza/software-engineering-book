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
- `review-schedule.html` — spaced-repetition tracker across all topics
- `activity.html` — GitHub-style daily activity grid, built from `events.json`
- `foundations/*.html` — Foundations curriculum (currently: Data Structures)
- `backend/*.html` — Web + Mobile Development / Backend topics (APIs, Auth, State & Caching, Databases)
- `style.css` — shared styling, light/dark aware
- `events.json` — event log of teaching/quiz activity, shared with the separate life-os knowledge-graph project

## events.json

This file is **shared** with a separate "life-os" project (a personal knowledge-graph/vault system), which originated it. It's an append-only array of event objects:

```json
{
  "id": 51,
  "ts": "2026-08-25T00:00:00Z",
  "actor": "teacher" | "quizmaster",
  "verb": "taught" | "quiz_answered",
  "node_id": "book:backend/apis",
  "source": "book",
  "payload": { ... }
}
```

Two conventions distinguish the two sources sharing this file:

- **Node ID namespace.** life-os events use `concept:kebab-slug`, tied to an actual vault note in that project. Events logged from this book use `book:path/to/page` (matching the page's path here, e.g. `book:foundations/data-structures`), and additionally carry `"source": "book"` so they're easy to filter.
- **Mastery scoring.** life-os `quiz_answered` events carry `score` (0–1), `max_level_reached`, and `level_breakdown` — the output of a leveled Recall→Explain→Predict→Design mastery formula requiring five-correct-in-a-row per level to advance. Book-tutoring sessions don't run that leveled format, so `book:` quiz events deliberately omit those three fields rather than fabricate them. They still carry `questions_asked`, `correct`, `wrong`, and `gaps`.

**Adding new events:** append to the end of the array with the next sequential `id` — never renumber or reorder existing entries (ids 1–50 predate this book and belong to life-os; don't touch them here). A `taught` event goes in when a topic is first covered or substantially re-taught; a `quiz_answered` event goes in per quiz/recall round, aggregated per topic per day if multiple questions were asked in one sitting. Update both `events.json` and the corresponding topic page's coverage-log table and `review-schedule.html` together, per the pattern already used for the existing topics.
