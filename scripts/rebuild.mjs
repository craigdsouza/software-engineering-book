#!/usr/bin/env node
// rebuild.mjs — the one command to run after changing events.json, nodes.json or any {id}.md.
// Validates the log, recomputes status, copies the sources into a fresh _site/, renders topic
// pages from their .md prose, then fills every generated region. The site is _site/ (git ignores
// it); preview with: python -m http.server -d _site
// Stops at the first failure, so a malformed event never reaches the site.
//   node scripts/rebuild.mjs
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
for (const step of ["validate-events.mjs", "scan-book.mjs", "copy-sources.mjs", "render-pages.mjs", "build-progress.mjs", "render-agent-guide.mjs"]) {
  try {
    execFileSync(process.execPath, [join(here, step)], { stdio: "inherit" });
  } catch {
    console.error(`\nrebuild stopped: ${step} failed — fix the error above and run again.`);
    process.exit(1);
  }
}
