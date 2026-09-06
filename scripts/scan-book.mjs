#!/usr/bin/env node
// scan-book.mjs — derived-index generator for the software-engineering-book graph.
//
// Reads every *.graph.json sidecar (authored structure — deps/contrasts/
// children, never scores) plus events.json (raw truth), and computes a live
// fresh/solid/needs-review status per node. Nothing here is hand-edited — this
// file is fully regenerable from its inputs.
//
// Moved here from life-os/scripts/scan-book.mjs on 2026-09-05 so the CS/SWE
// book system is fully self-contained in this repo — no dependency on
// life-os/config.json. Previously it resolved its own location via
// dirname(config.learningEventsPath), a Windows-style path whose dirname()
// silently resolves to "." on a non-Windows shell (the exact bug that once
// left two stale, empty book-graph-data.json files sitting in life-os). Now
// that this script lives inside the book repo, its own folder *is* the book
// root, so there's nothing to resolve.
//
// See life-os/docs/book-graph-migration-spec.md for the full spec this
// implements (node model, scoring formula, "one score per node" guarantee) —
// that document predates the move and still describes the algorithm
// accurately, just with an outdated file location for this script.
//
// Usage: node scan-book.mjs
// Writes book-graph-data.json into this repo's root (one level up from
// scripts/). BOOK_ROOT env var overrides the root for testing.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 1. Locate the book repo and find every sidecar ----------

function findBookRoot() {
  // BOOK_ROOT env override is for testing (e.g. a sandbox where this repo is
  // mounted at a different path than __dirname's parent would suggest).
  // Normal runs need nothing: this script lives in {book root}/scripts/, so
  // its own parent directory always is the book root.
  if (process.env.BOOK_ROOT) return process.env.BOOK_ROOT;
  return dirname(__dirname);
}

function findSidecars(root, dir = root, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      findSidecars(root, full, acc);
    } else if (name.endsWith(".graph.json")) {
      acc.push(full);
    }
  }
  return acc;
}

// ---------- 2. Build the node table from sidecars (authored structure only) ----------

function buildNodes(sidecarPaths) {
  const nodes = new Map(); // id -> node record

  for (const path of sidecarPaths) {
    let sidecar;
    try {
      sidecar = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      console.error(`Skipping unreadable sidecar ${path}: ${e.message}`);
      continue;
    }
    const pageId = `book:${sidecar.page}`;
    const pageParent = sidecar.parent ? `book:${sidecar.parent}` : null;

    const pageNode = nodes.get(pageId) || {
      id: pageId,
      title: sidecar.title,
      materialization: "page",
      parent: pageParent,
      deps: sidecar.deps || [],
      contrasts: sidecar.contrasts || [],
      children: [],
    };
    pageNode.title = sidecar.title;
    pageNode.parent = pageParent;
    pageNode.deps = sidecar.deps || [];
    pageNode.contrasts = sidecar.contrasts || [];
    nodes.set(pageId, pageNode);

    for (const section of sidecar.sections || []) {
      const sectionId = `${pageId}#${section.id}`;
      nodes.set(sectionId, {
        id: sectionId,
        title: section.title,
        materialization: "section",
        parent: pageId,
        deps: section.deps || [],
        contrasts: section.contrasts || [],
        children: [],
      });
      if (!pageNode.children.includes(sectionId)) pageNode.children.push(sectionId);
    }
  }

  return nodes;
}

// ---------- 3. Load book: events, grouped by node_id ----------

function loadBookEvents(root) {
  let all = [];
  try {
    all = JSON.parse(readFileSync(join(root, "events.json"), "utf8"));
  } catch {
    return new Map();
  }
  const byNode = new Map();
  for (const ev of all) {
    if (ev.source !== "book" || !ev.node_id) continue;
    const arr = byNode.get(ev.node_id) || [];
    arr.push(ev);
    byNode.set(ev.node_id, arr);
  }
  for (const arr of byNode.values()) arr.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return byNode;
}

// ---------- 4. Direct status per node, from its own events only ----------

const INTERVAL_DAYS = { 1: 3, 2: 7, 3: 14, 4: 30 }; // 5+ -> 60
const dayMs = 86400000;

function intervalFor(streak) {
  return INTERVAL_DAYS[streak] ?? 60;
}

function eventWrongCount(ev) {
  if (Array.isArray(ev.payload?.questions)) {
    return ev.payload.questions.filter((q) => q.correct === false).length;
  }
  return typeof ev.payload?.wrong === "number" ? ev.payload.wrong : 0;
}

function eventDate(ev) {
  return ev.payload?.date || (ev.ts ? ev.ts.slice(0, 10) : null);
}

// Returns { status, timesReviewed, lastScored, lastSuccess, dueDate } | null if no quiz events.
function directStatus(events, today = new Date()) {
  const quizzes = (events || []).filter((e) => e.verb === "quiz_answered");
  if (!quizzes.length) return null;

  let streak = 0;
  let lastSuccessDate = null;
  let lastWasWrong = false;

  for (const ev of quizzes) {
    const wrong = eventWrongCount(ev);
    const d = eventDate(ev);
    if (wrong > 0) {
      streak = 1; // "1 (reset)" — the attempt still counts as a review, just resets the streak
      lastWasWrong = true;
    } else {
      streak += 1;
      lastSuccessDate = d;
      lastWasWrong = false;
    }
  }

  const lastScored = eventDate(quizzes[quizzes.length - 1]);
  let dueDate = null;
  if (lastSuccessDate) {
    const due = new Date(lastSuccessDate + "T00:00:00");
    due.setDate(due.getDate() + intervalFor(streak));
    dueDate = due.toISOString().slice(0, 10);
  }

  let status;
  if (lastWasWrong) {
    status = "needs-review";
  } else if (dueDate && today.toISOString().slice(0, 10) > dueDate) {
    status = "needs-review";
  } else if (streak <= 1) {
    status = "fresh";
  } else {
    status = "solid";
  }

  return { status, timesReviewed: streak, lastScored, lastSuccess: lastSuccessDate, dueDate };
}

// ---------- 5. Recursive combine: status(node) = weakest_link(direct, rollup(children)) ----------

const RANK = { "needs-review": 0, fresh: 1, solid: 2 };
function worse(a, b) {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] <= RANK[b] ? a : b;
}

function computeAll(nodes, eventsByNode) {
  const memo = new Map();

  function statusOf(id) {
    if (memo.has(id)) return memo.get(id);
    const node = nodes.get(id);
    if (!node) return null;

    const direct = directStatus(eventsByNode.get(id));
    let rollup = null;
    for (const childId of node.children) {
      rollup = worse(rollup, statusOf(childId));
    }

    const combined = direct && rollup ? worse(direct.status, rollup) : direct ? direct.status : rollup;

    memo.set(id, combined);
    node._direct = direct;
    node._status = combined || "needs-review"; // no evidence at all anywhere under this node
    return node._status;
  }

  for (const id of nodes.keys()) statusOf(id);
  return nodes;
}

// ---------- 6. unlocks (deps-inverse) — kept distinct from `children` ----------

function computeUnlocks(nodes) {
  const byTitle = new Map();
  for (const n of nodes.values()) byTitle.set(n.title, n.id);

  const unlockCount = new Map();
  for (const n of nodes.values()) {
    for (const depTitle of n.deps) {
      const depId = byTitle.get(depTitle);
      if (!depId) continue; // dep not found among known nodes — leave unresolved
      unlockCount.set(depId, (unlockCount.get(depId) || 0) + 1);
    }
  }
  for (const n of nodes.values()) n.unlocks = unlockCount.get(n.id) || 0;
}

// ---------- main ----------

function main() {
  const root = findBookRoot();
  const sidecars = findSidecars(root);
  const nodes = buildNodes(sidecars);
  const eventsByNode = loadBookEvents(root);

  computeAll(nodes, eventsByNode);
  computeUnlocks(nodes);

  const out = {
    generated_at: new Date().toISOString(),
    nodes: [...nodes.values()].map((n) => ({
      id: n.id,
      title: n.title,
      materialization: n.materialization,
      parent: n.parent,
      children: n.children,
      deps: n.deps,
      contrasts: n.contrasts,
      unlocks: n.unlocks,
      status: n._status,
      direct: n._direct, // null if this node has never been quizzed directly
    })),
  };

  const outPath = join(root, "book-graph-data.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${outPath} — ${out.nodes.length} nodes.`);
  for (const n of out.nodes) {
    console.log(`  ${n.id.padEnd(40)} ${n.status.padEnd(13)} (${n.materialization})`);
  }
}

main();
