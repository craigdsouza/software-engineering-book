#!/usr/bin/env node
// render-agent-guide.mjs — writes _site/agent-guide.html, the page an outside agent (Gemini in
// Chrome today) reads before tutoring Craig. It is generated on every build so it can't drift from
// the book: every valid node_id with its current status, open gaps and recent questions, plus the
// draft format with examples that pass the same checks ingest runs (scripts/lib/event-rules.mjs).
// Reads nodes.json, events.json and book-graph-data.json; run after scan-book.mjs.
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkDraft, DEPTHS, TAGS } from "./lib/event-rules.mjs";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const registry = read("nodes.json");
const events = read("events.json");
const graph = new Map(read("book-graph-data.json").nodes.map((n) => [n.id, n]));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nodeIds = new Set(registry.nodes.map((n) => n.id));

// ---- examples: checked at build time, so the guide can never show a draft ingest would reject ----
const AGENT = { name: "gemini", surface: "chrome", skill: "book-tutor" };
const EXAMPLES = [
  { verb: "taught", node_id: "backend/auth", agent: AGENT,
    resource: { url: "https://example.com/article-craig-was-reading", title: "Title of the page", kind: "article" },
    payload: { depth: "intro",
      content: "Everything taught, complete enough to write the book page from: definitions, the worked example with its real numbers, each distinct case, the tempting-but-wrong idea and its counterexample, links to other topics. Several paragraphs is fine; ASCII diagrams go in as text with \\n line breaks.",
      notes: "What Craig found hard or got wrong while being taught; anything beyond current depth." } },
  { verb: "quiz_answered", node_id: "backend/auth", agent: AGENT,
    payload: { depth: "intro",
      questions: [
        { tag: "predict", question: "The full question as asked, e.g. a 50-server API must revoke a stolen credential within seconds: sessions or JWTs, and what does the other choice cost?",
          answer: "A summary of Craig's answer.", correct: true, node_id: "backend/auth",
          feedback: "Your response. After a miss, put the whole explanation here — it is written into the book." },
        { tag: "explain", question: "…", answer: "…", correct: false, node_id: "backend/auth", feedback: "…" } ],
      gaps: [ { node_id: "backend/auth", text: "A real misconception that surfaced, specific enough to retest next time." } ],
      notes: "How it went; which earlier gaps were retested and whether they are resolved." } },
  { verb: "taught", node_id: "computer-science/data-structures/heaps",
    proposed_node: { id: "computer-science/data-structures/heaps", title: "Heaps" }, agent: AGENT,
    payload: { depth: "intro", content: "…", notes: "" } },
];
for (const ex of EXAMPLES) {
  const errs = checkDraft(ex, nodeIds);
  if (errs.length) throw new Error(`agent-guide example ${ex.verb} ${ex.node_id} fails the draft rules:\n${errs.join("\n")}`);
}

// ---- per-node view: status, open gaps (from the node's latest quiz), recent question texts ----
const touching = (e, id) => e.node_id === id || (e.payload?.questions || []).some((q) => q.node_id === id);
function nodeRow(n) {
  const g = graph.get(n.id) || {};
  const quizzes = events.filter((e) => e.verb === "quiz_answered" && touching(e, n.id));
  const last = quizzes[quizzes.length - 1];
  const gaps = (last?.payload?.gaps || []).filter((x) => x.node_id === n.id).map((x) => x.text);
  const asked = quizzes.flatMap((e) => (e.payload.questions || []).filter((q) => q.node_id === n.id && q.question).map((q) => q.question)).slice(-4);
  const taught = events.some((e) => e.verb === "taught" && e.node_id === n.id);
  const depth = n.id.split("/").length - 1;
  const page = n.page ? `<a href="${esc(n.page)}">${esc(n.page)}</a>` : n.id.includes("/") ? "not placed yet" : "domain (no page)";
  const active = events.some((e) => e.node_id === n.id || e.node_id.startsWith(n.id + "/") || (e.payload?.questions || []).some((q) => q.node_id?.startsWith(n.id + "/")));
  const status = g.direct ? `${esc(g.status)}${g.direct.dueDate ? ` · due ${esc(g.direct.dueDate)}` : ""}`
    : taught ? "taught, never quizzed"
    : (g.children || []).length && active ? `${esc(g.status)} (weakest of its topics)`
    : "no events of its own yet";
  const extra = [
    gaps.length ? `<div class="ag-note"><strong>Open gaps:</strong> ${gaps.map(esc).join(" · ")}</div>` : "",
    asked.length ? `<div class="ag-note"><strong>Asked before (don't repeat):</strong> ${asked.map((q) => esc(q.length > 160 ? q.slice(0, 157) + "…" : q)).join(" · ")}</div>` : "",
  ].join("");
  return `      <tr><td style="padding-left:${0.6 + depth * 1.1}em"><code>${esc(n.id)}</code>${extra}</td><td>${esc(n.title)}</td><td>${status}</td><td>${page}</td></tr>`;
}

const rows = registry.nodes.map(nodeRow).join("\n");
const ex = (d) => esc(JSON.stringify(d, null, 2));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent guide — Software Engineering Book</title>
<link rel="stylesheet" href="style.css">
<style>
  .ag-note { font-size: 0.85em; margin-top: 0.3em; opacity: 0.85; }
  pre { white-space: pre-wrap; }
</style>
</head>
<body>
<!-- GENERATED by scripts/render-agent-guide.mjs on every build — do not edit -->
<header class="site-header">
  <div class="inner">
    <a class="brand" href="index.html">Software Engineering — A Study Book</a>
    <nav class="tracks">
      <a href="index.html">Home</a>
      <a href="review-schedule.html">Review Schedule</a>
      <a href="activity.html">Activity</a>
      <a href="about/teaching-style.html">Teaching Style</a>
      <a href="about/architecture.html">Architecture</a>
    </nav>
  </div>
</header>

<main>
  <div class="breadcrumb"><a href="index.html">Home</a> / Agent guide</div>
  <h1>Agent guide</h1>
  <p class="subtitle">For AI agents that teach or quiz Craig and log the session to this book. Generated from the book's own data on every build (${esc(new Date().toISOString().slice(0, 10))}).</p>

  <h2 id="how">How logging works</h2>
  <p>At the end of a session you output the session as <strong>JSON drafts</strong> in one code block. Craig copies it into <a href="log.html">log.html</a>, which checks it and drops it into the book's inbox; the book then numbers each draft, adds it to the event log and updates the site within a few minutes. You never set <code>id</code>, <code>schema</code>, <code>ts</code>, <code>date</code> or gap ids — the book does.</p>
  <ul>
    <li>Output a JSON <strong>list</strong> of drafts: usually one <code>taught</code> and/or one <code>quiz_answered</code> per topic covered.</li>
    <li><code>node_id</code> must be an id from the <a href="#topics">topic list</a>. Pick the most specific one that fits. A quiz question can name a different topic than its draft; it then counts as a review of that topic.</li>
    <li>If nothing fits, add <code>"proposed_node": { "id": "parent/new-topic", "title": "New Topic" }</code> and use that id. The parent must already exist; ids are lowercase words-with-hyphens, 2–4 parts.</li>
    <li><code>depth</code> rates the material, not the session: <code>${DEPTHS[0]}</code> = undergraduate, <code>${DEPTHS[1]}</code> = graduate, <code>${DEPTHS[2]}</code> = beyond graduate. Most core data structures, algorithms and web fundamentals are <code>intro</code>.</li>
    <li>Question <code>tag</code>: <code>${TAGS[0]}</code> (define, name properties), <code>${TAGS[1]}</code> (how it works, why X over Y), <code>${TAGS[2]}</code> (what happens if, edge cases, judgment calls).</li>
    <li><code>correct</code> is <code>true</code> or <code>false</code> only. Mostly right with one real misconception is <code>false</code>.</li>
    <li>Add <code>resource</code> when the session was about a specific page or paper: <code>{ "url", "title", "kind" }</code> with kind one of article, paper, docs, video, book.</li>
  </ul>

  <h2 id="examples">Examples</h2>
  <p>A <code>taught</code> draft — <code>content</code> is the only thing the book page is written from, so make it complete:</p>
  <pre><code>${ex(EXAMPLES[0])}</code></pre>
  <p>A <code>quiz_answered</code> draft — at least 3 questions in a real session, full question text, Craig's answer summarised:</p>
  <pre><code>${ex(EXAMPLES[1])}</code></pre>
  <p>A topic the book doesn't have yet:</p>
  <pre><code>${ex(EXAMPLES[2])}</code></pre>

  <h2 id="topics">Topics (valid node ids)</h2>
  <p>Status comes from the quiz history: <em>solid</em> = last review clean and not yet due; <em>needs-review</em> = last review had a miss, or it's past due. Retest open gaps first, with a fresh scenario.</p>
  <div class="table-scroll">
    <table>
      <tr><th>node_id</th><th>Title</th><th>Status</th><th>Book page</th></tr>
${rows}
    </table>
  </div>
</main>
<footer class="site-footer">Built topic by topic. Depth over completion.</footer>
</body>
</html>
`;
writeFileSync(join(ROOT, "_site", "agent-guide.html"), html);
console.log(`  _site/agent-guide.html — ${registry.nodes.length} topics, ${EXAMPLES.length} checked examples`);
