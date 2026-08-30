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

## Structure

- `index.html` — home page: pick a curriculum, then a topic
- `about/teaching-style.html` — how this book expects to be taught from (theory-first, no code exercises, depth over completion, spaced repetition)
- `review-schedule.html` — spaced-repetition tracker across all topics
- `foundations/*.html` — Foundations curriculum (currently: Data Structures)
- `backend/*.html` — Web + Mobile Development / Backend topics (APIs, Auth, State & Caching, Databases)
- `style.css` — shared styling, light/dark aware
