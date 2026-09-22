#!/usr/bin/env node
// validate-events.mjs — checks an events file against the v1 schema and nodes.json.
// Usage: node scripts/validate-events.mjs [events.json]. Exits 1 on any error.
// The same rules are what the REST API will enforce on write.
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const file = process.argv[2] || "events.json";
const events = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
const nodeIds = new Set(JSON.parse(readFileSync(join(ROOT, "nodes.json"), "utf8")).nodes.map((n) => n.id));

const VERBS = ["taught", "quiz_answered", "read"];
const DEPTHS = ["intro", "intermediate", "advanced"];
const TAGS = ["recall", "explain", "predict"];
const ENVELOPE = ["id", "schema", "ts", "date", "verb", "node_id", "agent", "resource", "payload"];
const PAYLOAD = {
  taught: ["depth", "content", "notes"],
  quiz_answered: ["depth", "questions", "gaps", "notes"],
  read: ["nodes"],
};
// Events up to this id were migrated from the pre-v1 log, which never stored question/answer text.
const LEGACY_MAX_ID = 85;
const QUESTION = ["tag", "question", "answer", "correct", "node_id", "feedback", "synthesized"];

const errors = [];
const err = (ev, msg) => errors.push(`#${ev.id ?? "?"}: ${msg}`);
const extra = (obj, allowed) => Object.keys(obj).filter((k) => !allowed.includes(k));
const node = (ev, id, where) => { if (!nodeIds.has(id)) err(ev, `${where}: unknown node_id "${id}"`); };

let lastId = 0; const gapIds = new Set();
for (const ev of events) {
  for (const k of extra(ev, ENVELOPE)) err(ev, `unexpected field "${k}"`);
  if (!Number.isInteger(ev.id) || ev.id <= lastId) err(ev, "id must be an increasing integer"); lastId = ev.id;
  if (ev.schema !== 1) err(ev, "schema must be 1");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ev.ts || "")) err(ev, "ts must be UTC like 2026-09-21T14:05:12.000Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date || "")) err(ev, "date must be YYYY-MM-DD");
  if (!VERBS.includes(ev.verb)) err(ev, `verb must be one of ${VERBS.join("|")}`);
  node(ev, ev.node_id, "node_id");
  if (!ev.agent?.name) err(ev, "agent.name is required");
  if (ev.resource && !ev.resource.url && !ev.resource.title) err(ev, "resource needs a url or title");
  const p = ev.payload || {};
  for (const k of extra(p, PAYLOAD[ev.verb] || [])) err(ev, `unexpected payload field "${k}"`);
  if (ev.verb !== "read" && !DEPTHS.includes(p.depth)) err(ev, `depth must be one of ${DEPTHS.join("|")}`);
  if (ev.verb === "taught" && !p.content) err(ev, "taught needs content");
  if (ev.verb === "quiz_answered") {
    if (!Array.isArray(p.questions) || !p.questions.length) err(ev, "quiz_answered needs questions[]");
    (p.questions || []).forEach((q, i) => {
      for (const k of extra(q, QUESTION)) err(ev, `question ${i + 1}: unexpected field "${k}"`);
      if (typeof q.correct !== "boolean") err(ev, `question ${i + 1}: correct must be true|false`);
      node(ev, q.node_id, `question ${i + 1}`);
      if (q.synthesized) return; // legacy stubs rebuilt from old totals: tag/question/answer are null by design
      if (!TAGS.includes(q.tag)) err(ev, `question ${i + 1}: tag must be one of ${TAGS.join("|")}`);
      if (ev.id > LEGACY_MAX_ID && (!q.question || !q.answer)) err(ev, `question ${i + 1}: question and answer text are required`);
    });
    (p.gaps || []).forEach((g, i) => {
      if (!g.id || gapIds.has(g.id)) err(ev, `gap ${i + 1}: id missing or duplicated`); gapIds.add(g.id);
      node(ev, g.node_id, `gap ${i + 1}`);
      if (!g.text) err(ev, `gap ${i + 1}: text is required`);
    });
  }
  if (ev.verb === "read") {
    if (!Array.isArray(p.nodes) || !p.nodes.length) err(ev, "read needs nodes[]");
    (p.nodes || []).forEach((n, i) => node(ev, n.node_id, `nodes[${i}]`));
  }
}
if (errors.length) { console.error(errors.join("\n")); console.error(`\n${errors.length} error(s) in ${file}`); process.exit(1); }
console.log(`${file}: ${events.length} events valid against schema 1 and ${nodeIds.size} nodes`);
