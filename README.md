# Web + Mobile Dev — Study Book

A self-contained static HTML site — no build step, no dependencies. Open `index.html` directly in a browser to read it locally.

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

## Structure

- `index.html` — home page / table of contents
- `review-schedule.html` — spaced-repetition tracker
- `backend/*.html` — one page per Backend topic (APIs, Auth, State & Caching, Databases)
- `style.css` — shared styling, light/dark aware
