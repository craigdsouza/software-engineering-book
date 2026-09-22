#!/usr/bin/env node
// migrate-to-v1.mjs — ONE-OFF migration (2026-09-21). Kept for the record; do not re-run
// against a v1 log. Read the pre-v1 backup + the six *.graph.json sidecars (deleted after the migration; see git history) and writes:
//   nodes.json      — the node registry (replaces the sidecars once scripts are rebuilt)
//   events.v1.json  — the 35 book events converted to schema 1 (the 50 concept: events are dropped;
//                     they stay in events.pre-v1-backup-2026-09-20.json, which life-os now reads)
// events.json itself is NOT touched: the current scripts keep working until they're rebuilt.
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const old = JSON.parse(readFileSync(join(ROOT, "events.pre-v1-backup-2026-09-20.json"), "utf8"));

// ---------- 1. domains (top level) ----------
const DOMAINS = [
  ["computer-science", "Computer Science", "Data structures, algorithms, complexity, computability, automata."],
  ["mathematics", "Mathematics", "Discrete maths, linear algebra, probability & statistics, calculus."],
  ["computer-architecture", "Computer Architecture", "CPUs, the memory hierarchy, caches, GPUs."],
  ["operating-systems", "Operating Systems", "Processes, scheduling, virtual memory, concurrency."],
  ["networking", "Networking", "TCP/IP, DNS, TLS, HTTP."],
  ["distributed-systems", "Distributed Systems", "Replication, consensus, CAP, sharding."],
  ["databases", "Databases", "Data models, transactions, indexes, query engines."],
  ["programming-languages", "Programming Languages", "Type systems, paradigms, compilers, runtimes."],
  ["software-engineering", "Software Engineering", "Design patterns, testing, architecture, version control."],
  ["backend", "Backend", "APIs, auth flows, server-side caching."],
  ["frontend", "Frontend", "The browser, rendering, client state."],
  ["mobile", "Mobile", "Native and cross-platform apps."],
  ["devops-cloud", "DevOps & Cloud", "CI/CD, containers, infrastructure as code."],
  ["security", "Security", "Cryptography, authentication, web security."],
  ["machine-learning", "Machine Learning", "Classical ML, deep learning, LLMs."],
];

// ---------- 2. old id -> new id (judgement calls noted) ----------
const MAP = {
  "book:foundations/data-structures": "computer-science/data-structures",
  "book:foundations/data-structures#arrays": "computer-science/data-structures/arrays",
  "book:foundations/data-structures#linked-lists": "computer-science/data-structures/linked-lists",
  "book:foundations/data-structures#doubly-linked-lists": "computer-science/data-structures/doubly-linked-lists",
  "book:foundations/data-structures#stacks": "computer-science/data-structures/stacks",
  "book:foundations/data-structures#queues": "computer-science/data-structures/queues",
  // Big O is complexity analysis, not a data structure: moved, but still listed under DS via also_in
  "book:foundations/data-structures#big-o": "computer-science/complexity/big-o",
  "book:foundations/data-structures#hash-tables": "computer-science/data-structures/hash-tables",
  "book:foundations/trees": "computer-science/data-structures/trees",
  "book:foundations/trees#bst": "computer-science/data-structures/trees/bst",
  "book:backend/apis": "backend/apis",
  "book:backend/auth": "backend/auth",                       // also_in security
  "book:backend/databases": "databases/fundamentals",        // also_in distributed-systems (replication, sharding, CAP)
  "book:backend/state-caching": "frontend/state-caching",    // client vs server state is a client-side concern; also_in backend
};
const ALSO_IN = {
  "computer-science/complexity/big-o": ["computer-science/data-structures"],
  "backend/auth": ["security"],
  "databases/fundamentals": ["distributed-systems"],
  "frontend/state-caching": ["backend"],
};
const PAGE = (oldId) => { const r = oldId.replace(/^book:/, ""); const h = r.indexOf("#");
  return h === -1 ? `${r}.html` : `${r.slice(0, h)}.html#${r.slice(h + 1)}`; };

// ---------- 3. build nodes from sidecars ----------
function sidecars(dir = ROOT, acc = []) {
  for (const n of readdirSync(dir)) { if (n.startsWith(".") || n === "node_modules") continue;
    const p = join(dir, n); if (statSync(p).isDirectory()) sidecars(p, acc); else if (n.endsWith(".graph.json")) acc.push(p); }
  return acc;
}
const nodes = new Map();
for (const [id, title, summary] of DOMAINS) nodes.set(id, { id, title, summary, page: null, deps: [], contrasts: [], also_in: [] });
nodes.set("computer-science/complexity", { id: "computer-science/complexity", title: "Complexity", page: null, deps: [], contrasts: [], also_in: [] });

const titleToId = {}; const pending = []; const fwd = [];
for (const path of sidecars()) {
  const s = JSON.parse(readFileSync(path, "utf8"));
  const pageOld = `book:${s.page}`;
  const entries = [[pageOld, s.title, s.deps || [], s.contrasts || []],
    ...(s.sections || []).map((x) => [`${pageOld}#${x.id}`, x.title, x.deps || [], x.contrasts || []])];
  for (const [oldId, title, deps, contrasts] of entries) {
    const id = MAP[oldId]; if (!id) throw new Error(`no mapping for ${oldId}`);
    titleToId[title] = id;
    pending.push({ id, title, page: PAGE(oldId), deps, contrasts });
  }
  for (const f of s.forward_pointers || [])
    fwd.push({ id: f.id, title: f.title, tier: f.tier, under: MAP[f.under ? `${pageOld}#${f.under}` : pageOld], note: f.note || "" });
}
for (const p of pending) nodes.set(p.id, { id: p.id, title: p.title, page: p.page,
  deps: p.deps.map((t) => titleToId[t] || t), contrasts: p.contrasts.map((t) => titleToId[t] || t), also_in: ALSO_IN[p.id] || [] });
for (const n of nodes.values()) for (const r of [...n.deps, ...n.contrasts, ...n.also_in])
  if (!nodes.has(r)) throw new Error(`${n.id} references unknown node ${r}`);

writeFileSync(join(ROOT, "nodes.json"), JSON.stringify({
  schema: 1,
  note: "Node registry. id = domain/concept/sub-concept (1-4 segments); parent = the id minus its last segment. " +
        "page = where the prose lives (null for grouping nodes). deps/contrasts/also_in hold node ids. Status is never stored here.",
  nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
  forward_pointers: fwd,
}, null, 2) + "\n");

// ---------- 4. convert events ----------
// gap strings in the old log that are really assessment notes, not gaps: [eventId, index]
const NOT_GAPS = new Set(["68:0", "68:2", "68:3", "69:3", "85:0"]);
const QUIZ_DEPTH = { 59: "intermediate" }; // #59 reached isolation-level ID, replication, sharding, CAP; everything else is undergrad
const iso = (ts) => new Date(ts).toISOString();
const sentence = (s) => { s = String(s).trim(); return /[.!?]$/.test(s) ? s : s + "."; };

const out = [];
for (const ev of old) {
  if (!String(ev.node_id).startsWith("book:")) continue;
  const node_id = MAP[ev.node_id]; if (!node_id) throw new Error(`unmapped ${ev.node_id}`);
  const p = ev.payload || {};
  const base = { id: ev.id, schema: 1, ts: iso(ev.ts), date: p.date || iso(ev.ts).slice(0, 10), verb: ev.verb, node_id,
    agent: { name: "claude", surface: "cowork", skill: ev.actor === "quizmaster" ? "swe-quizmaster" : "swe-teacher" } };
  if (ev.verb === "taught") {
    out.push({ ...base, payload: { depth: "intro",
      content: (p.concepts_written || []).map(sentence).join(" "), notes: p.note || "" } });
  } else {
    let questions;
    if (Array.isArray(p.questions)) {
      questions = p.questions.map((q) => ({ tag: q.tag, question: null, answer: null, correct: q.correct, node_id, feedback: q.note || null }));
    } else {
      const right = p.correct || 0, wrong = p.wrong || 0;
      const stub = (c) => ({ tag: null, question: null, answer: null, correct: c, node_id, feedback: null, synthesized: true });
      questions = [...Array(right)].map(() => stub(true)).concat([...Array(wrong)].map(() => stub(false)));
    }
    const gaps = [], moved = [];
    (p.gaps || []).forEach((g, i) => (NOT_GAPS.has(`${ev.id}:${i}`) ? moved : gaps).push(g));
    const notes = [p.note || "", moved.length ? "Assessment notes: " + moved.join(" ") : ""].filter(Boolean).join("\n\n");
    out.push({ ...base, payload: { depth: QUIZ_DEPTH[ev.id] || "intro", questions,
      gaps: gaps.map((text, i) => ({ id: `g${ev.id}-${i + 1}`, node_id, text })), notes } });
  }
}
writeFileSync(join(ROOT, "events.v1.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`nodes.json: ${nodes.size} nodes, ${fwd.length} forward pointers`);
console.log(`events.v1.json: ${out.length} events (ids ${out[0].id}-${out[out.length - 1].id})`);
