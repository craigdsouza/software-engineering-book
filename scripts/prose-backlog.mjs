#!/usr/bin/env node
// prose-backlog.mjs — the editor's input packet. Read-only.
//
// For every page whose prose is behind the event log (events after the .md's prose_through that
// touch the page's nodes), prints everything the editor needs to fold them in: the page's nodes
// and their current status, then each backlog event in full (content, notes, questions with
// answers and feedback, gaps, resource). Also lists nodes that have events but no page yet.
// Reads progress-data.json, so run scan-book.mjs (or rebuild.mjs) first.
//
// Usage: node scripts/prose-backlog.mjs                 all pages that are behind
//        node scripts/prose-backlog.mjs backend/auth    one page, by any node id on it, or its file
//                                                   (unplaced nodes are always listed)
//        node scripts/prose-backlog.mjs --json          the same, as JSON
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const progress = read("progress-data.json");
const events = new Map(read("events.json").map((e) => [e.id, e]));
const nodes = new Map(read("nodes.json").nodes.map((n) => [n.id, n]));
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = args.find((a) => !a.startsWith("--"));

// a node id (page or section) resolves to the file its prose lives on
const onlyFile = only && (nodes.get(only)?.page?.split("#")[0] || (only.endsWith(".html") ? only : only + ".html"));
const pages = Object.entries(progress.pages)
  .filter(([file, p]) => (only ? file === onlyFile : p.prose?.backlog?.length))
  .map(([file, p]) => ({
    page: file,
    prose_file: file.replace(/\.html$/, ".md"),
    prose_through: p.prose?.through ?? null,
    nodes: p.rows.map((r) => ({ node_id: r.node_id, title: r.title, anchor: r.anchor, status: r.status, due: r.due, streak: r.streak })),
    backlog: (p.prose?.backlog || []).map((id) => events.get(id)),
  }));
const unplaced = (progress.prose_unplaced || []).map((u) => ({ ...u, title: nodes.get(u.node_id)?.title, events: u.events.map((id) => events.get(id)) }));

if (asJson) {
  console.log(JSON.stringify({ pages, unplaced }, null, 2));
} else {
  if (!pages.length && !unplaced.length) console.log("No backlog: every page's prose is caught up with the event log.");
  for (const p of pages) {
    console.log(`\n=== ${p.prose_file}  (prose_through ${p.prose_through}; ${p.backlog.length} event(s) behind)`);
    for (const n of p.nodes) console.log(`  node ${n.node_id}${n.anchor ? ` ${n.anchor}` : ""} — ${n.status}${n.due ? `, due ${n.due}` : ""}, streak ${n.streak}`);
    for (const e of p.backlog) printEvent(e);
  }
  for (const u of unplaced) {
    console.log(`\n=== UNPLACED node ${u.node_id} ("${u.title}") has events but no page — place it first`);
    for (const e of u.events) printEvent(e);
  }
}

function printEvent(e) {
  const pl = e.payload || {};
  console.log(`\n  --- #${e.id} ${e.date} ${e.verb} ${e.node_id}  by ${e.agent?.name}/${e.agent?.skill || e.agent?.surface}${pl.depth ? `  depth ${pl.depth}` : ""}`);
  if (e.resource) console.log(`  resource: ${e.resource.title} <${e.resource.url}> (${e.resource.kind})`);
  if (pl.content) console.log(`  content: ${pl.content}`);
  for (const x of pl.nodes || []) console.log(`  read → ${x.node_id}: ${x.content}${x.notes ? `  [notes: ${x.notes}]` : ""}`);
  for (const [i, q] of (pl.questions || []).entries()) {
    console.log(`  Q${i + 1} [${q.tag}] ${q.node_id} — ${q.correct === true ? "correct" : q.correct === false ? "WRONG" : "?"}`);
    if (q.question) console.log(`     asked: ${q.question}`);
    if (q.answer) console.log(`     answer: ${q.answer}`);
    if (q.feedback) console.log(`     feedback: ${q.feedback}`);
  }
  for (const g of pl.gaps || []) console.log(`  gap ${g.id} (${g.node_id}): ${g.text}`);
  if (pl.notes) console.log(`  notes: ${pl.notes}`);
}
