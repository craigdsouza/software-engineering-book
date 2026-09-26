#!/usr/bin/env node
// copy-sources.mjs — starts a fresh build of the site in _site/.
//
// The repo holds only sources (events.json, nodes.json, {id}.md prose, page templates, style.css,
// scripts, docs). Everything the site serves is assembled in _site/, which git ignores and the
// GitHub Action publishes:
//   1. this script wipes _site/ and copies every source file into it, plus the two JSON files
//      scan-book.mjs just wrote (so agents can read them from the published site),
//   2. render-pages.mjs writes each topic page ({id}.html) into _site/ from its .md,
//   3. build-progress.mjs fills the generated regions — index.html and review-schedule.html come
//      from the templates at the repo root; topic pages are updated in place in _site/.
// rebuild.mjs runs all of these in order. Preview locally with: python -m http.server -d _site
import { rmSync, mkdirSync, cpSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "_site");
// never published: git internals, the build output itself, CI config, editor clutter
const SKIP = new Set([".git", "_site", ".github", "node_modules", ".vscode", ".gitignore", "inbox"]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let n = 0;
for (const entry of readdirSync(ROOT)) {
  if (SKIP.has(entry)) continue;
  cpSync(join(ROOT, entry), join(OUT, entry), { recursive: true });
  n++;
}
for (const f of ["book-graph-data.json", "progress-data.json"]) {
  if (!existsSync(join(OUT, f))) throw new Error(`${f} missing — run scan-book.mjs first`);
}
console.log(`  _site/ — fresh copy of ${n} top-level source entries`);
