#!/usr/bin/env node
// ingest-inbox.mjs — turns event drafts dropped into inbox/ into numbered events in events.json.
//
// Any agent that can't write to the repo itself (Gemini in Chrome, via log.html) submits a *draft*:
// the event minus the fields only the book may set. This script is the one place those drafts
// become events, so numbering and checking can't be skipped or done twice:
//   1. reads inbox/*.json in name order (log.html names files by submit time),
//   2. checks every draft with the shared rules (scripts/lib/event-rules.mjs),
//   3. skips a draft identical to one already logged (a double paste logs once),
//   4. assigns id (highest + 1), schema 1, ts (submit time), date (Craig's local day, IST) and gap
//      ids g{id}-{n}; adds any proposed_node to nodes.json with page: null (swe-editor places it),
//   5. appends to events.json and deletes the inbox file.
// A file with any bad draft is logged in full or not at all: it moves to inbox/rejected/ with a
// .error.txt beside it listing each problem by field. Runs in the GitHub Action before the build;
// locally: node scripts/ingest-inbox.mjs. The last line printed is the commit message.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkDraft, extractDrafts, draftKey } from "./lib/event-rules.mjs";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const INBOX = join(ROOT, "inbox");
const REJECTED = join(INBOX, "rejected");
const BOOK_TZ = "Asia/Kolkata"; // `date` is Craig's local day

// events.json is written the way it always has been (2-space indent, non-ASCII as \uXXXX, no
// trailing newline) so an ingest diff shows only the new events.
const writeEvents = (evs) => writeFileSync(join(ROOT, "events.json"),
  JSON.stringify(evs, null, 2).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")));
const localDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: BOOK_TZ }).format(new Date(iso));

const files = existsSync(INBOX) ? readdirSync(INBOX).filter((f) => f.endsWith(".json")).sort() : [];
if (!files.length) { console.log("inbox empty — nothing to ingest"); process.exit(0); }

const events = JSON.parse(readFileSync(join(ROOT, "events.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(ROOT, "nodes.json"), "utf8"));
const nodeIds = new Set(registry.nodes.map((n) => n.id));
const seen = new Set(events.map(draftKey));
let nextId = Math.max(...events.map((e) => e.id)) + 1;
const logged = [], rejected = [], newNodes = [];

for (const file of files) {
  const path = join(INBOX, file);
  const raw = readFileSync(path, "utf8");
  let submittedAt = new Date().toISOString();
  try { const w = JSON.parse(raw); if (w && typeof w.submitted_at === "string" && !isNaN(Date.parse(w.submitted_at))) submittedAt = new Date(w.submitted_at).toISOString(); } catch {}
  const { drafts, error } = extractDrafts(raw);
  const problems = error ? [error] : !drafts.length ? ["no drafts in file"] : [];
  if (!problems.length) {
    drafts.forEach((d, i) => {
      const errs = checkDraft(d, nodeIds);
      problems.push(...errs.map((e) => (drafts.length > 1 ? `draft ${i + 1} ` : "") + e));
    });
  }
  if (problems.length) {
    mkdirSync(REJECTED, { recursive: true });
    renameSync(path, join(REJECTED, file));
    writeFileSync(join(REJECTED, file.replace(/\.json$/, ".error.txt")),
      `Rejected by ingest-inbox.mjs on ${new Date().toISOString()} — nothing from this file was logged.\n` +
      `Fix these and submit again:\n\n${problems.map((p) => "- " + p).join("\n")}\n`);
    rejected.push(file);
    console.log(`  ${file} — REJECTED (${problems.length} problem${problems.length > 1 ? "s" : ""}), see inbox/rejected/`);
    continue;
  }
  for (const d of drafts) {
    const key = draftKey(d);
    if (seen.has(key)) { console.log(`  ${file} — ${d.verb} ${d.node_id}: already logged, skipped`); continue; }
    if (d.proposed_node && !nodeIds.has(d.proposed_node.id)) {
      const pn = { id: d.proposed_node.id, title: d.proposed_node.title, page: null, deps: [], contrasts: [], also_in: [] };
      const parent = pn.id.split("/").slice(0, -1).join("/");
      let at = -1; // after the parent's last descendant, so nodes.json stays grouped
      registry.nodes.forEach((n, i) => { if (n.id === parent || n.id.startsWith(parent + "/")) at = i; });
      registry.nodes.splice(at + 1, 0, pn);
      nodeIds.add(pn.id); newNodes.push(pn.id);
    }
    const id = nextId++;
    const payload = JSON.parse(JSON.stringify(d.payload));
    (payload.gaps || []).forEach((g, i) => { payload.gaps[i] = { id: `g${id}-${i + 1}`, node_id: g.node_id, text: g.text }; });
    const ev = { id, schema: 1, ts: submittedAt, date: localDate(submittedAt), verb: d.verb, node_id: d.node_id, agent: d.agent };
    if (d.resource) ev.resource = d.resource;
    ev.payload = payload;
    events.push(ev); seen.add(key);
    logged.push(`#${id} ${d.verb} ${d.node_id} (${d.agent.name})`);
    console.log(`  ${file} — logged #${id} ${d.verb} ${d.node_id}`);
  }
  unlinkSync(path);
}

if (logged.length) writeEvents(events);
if (newNodes.length) writeFileSync(join(ROOT, "nodes.json"), JSON.stringify(registry, null, 2) + "\n");
const parts = [];
if (logged.length) parts.push(`log ${logged.join(", ")}`);
if (newNodes.length) parts.push(`new node ${newNodes.join(", ")}`);
if (rejected.length) parts.push(`reject ${rejected.join(", ")}`);
console.log(`ingest: ${parts.join("; ") || "duplicates only, nothing new"}`);
