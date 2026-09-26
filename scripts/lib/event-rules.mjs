// event-rules.mjs — the one copy of the event rules, shared by every writer.
//
// Used by scripts/validate-events.mjs (the whole log), scripts/ingest-inbox.mjs (drafts arriving
// through inbox/) and log.html in the browser (checks a paste before it is sent). Plain ES module,
// no Node or browser APIs, so the exact same file runs in both places. Format: docs/events-v1.md.

export const VERBS = ["taught", "quiz_answered", "read"];
export const DEPTHS = ["intro", "intermediate", "advanced"];
export const TAGS = ["recall", "explain", "predict"];
const ENVELOPE = ["id", "schema", "ts", "date", "verb", "node_id", "agent", "resource", "payload"];
const PAYLOAD = {
  taught: ["depth", "content", "notes"],
  quiz_answered: ["depth", "questions", "gaps", "notes"],
  read: ["nodes"],
};
const QUESTION = ["tag", "question", "answer", "correct", "node_id", "feedback", "synthesized"];
// Events up to this id were migrated from the pre-v1 log, which never stored question/answer text.
export const LEGACY_MAX_ID = 85;

const extra = (obj, allowed) => Object.keys(obj || {}).filter((k) => !allowed.includes(k));
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const show = (v) => (typeof v === "string" ? `"${v}"` : JSON.stringify(v));

// ---------- full events (events.json) ----------
// state carries what spans events: { lastId, gapIds }. Returns error strings prefixed "#id: ".
export function checkEvent(ev, nodeIds, state = { lastId: 0, gapIds: new Set() }) {
  const errors = [];
  const err = (msg) => errors.push(`#${ev.id ?? "?"}: ${msg}`);
  const node = (id, where) => { if (!nodeIds.has(id)) err(`${where}: unknown node_id "${id}"`); };
  for (const k of extra(ev, ENVELOPE)) err(`unexpected field "${k}"`);
  if (!Number.isInteger(ev.id) || ev.id <= state.lastId) err("id must be an increasing integer");
  state.lastId = ev.id;
  if (ev.schema !== 1) err("schema must be 1");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ev.ts || "")) err("ts must be UTC like 2026-09-21T14:05:12.000Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date || "")) err("date must be YYYY-MM-DD");
  if (!VERBS.includes(ev.verb)) err(`verb must be one of ${VERBS.join("|")}`);
  node(ev.node_id, "node_id");
  if (!ev.agent?.name) err("agent.name is required");
  if (ev.resource && !ev.resource.url && !ev.resource.title) err("resource needs a url or title");
  const p = ev.payload || {};
  for (const k of extra(p, PAYLOAD[ev.verb] || [])) err(`unexpected payload field "${k}"`);
  if (ev.verb !== "read" && !DEPTHS.includes(p.depth)) err(`depth must be one of ${DEPTHS.join("|")}`);
  if (ev.verb === "taught" && !p.content) err("taught needs content");
  if (ev.verb === "quiz_answered") {
    if (!Array.isArray(p.questions) || !p.questions.length) err("quiz_answered needs questions[]");
    (p.questions || []).forEach((q, i) => {
      for (const k of extra(q, QUESTION)) err(`question ${i + 1}: unexpected field "${k}"`);
      if (typeof q.correct !== "boolean") err(`question ${i + 1}: correct must be true|false`);
      node(q.node_id, `question ${i + 1}`);
      if (q.synthesized) return; // legacy stubs rebuilt from old totals: tag/question/answer are null by design
      if (!TAGS.includes(q.tag)) err(`question ${i + 1}: tag must be one of ${TAGS.join("|")}`);
      if (ev.id > LEGACY_MAX_ID && (!q.question || !q.answer)) err(`question ${i + 1}: question and answer text are required`);
    });
    (p.gaps || []).forEach((g, i) => {
      if (!g.id || state.gapIds.has(g.id)) err(`gap ${i + 1}: id missing or duplicated`);
      state.gapIds.add(g.id);
      node(g.node_id, `gap ${i + 1}`);
      if (!g.text) err(`gap ${i + 1}: text is required`);
    });
  }
  if (ev.verb === "read") {
    if (!Array.isArray(p.nodes) || !p.nodes.length) err("read needs nodes[]");
    (p.nodes || []).forEach((n, i) => node(n.node_id, `nodes[${i}]`));
  }
  return errors;
}

// ---------- drafts (what an agent submits; the server fills id, schema, ts, date, gap ids) ----------
const DRAFT = ["verb", "node_id", "agent", "resource", "payload", "proposed_node"];
const SERVER_SET = ["id", "schema", "ts", "date"];
const DRAFT_QUESTION = ["tag", "question", "answer", "correct", "node_id", "feedback"];
export const NODE_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*){0,3}$/;

// Returns error strings, each naming the exact field, e.g. `questions[1].correct: must be true or false (got "partly")`.
export function checkDraft(d, nodeIds) {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  if (!isObj(d)) return ["draft: must be a JSON object"];
  for (const k of Object.keys(d)) {
    if (SERVER_SET.includes(k)) err(k, "remove it — the book sets this when the event is logged");
    else if (!DRAFT.includes(k)) err(k, `unexpected field (allowed: ${DRAFT.join(", ")})`);
  }
  // a proposed node (a topic the book doesn't have yet) counts as valid everywhere in this draft
  const valid = new Set(nodeIds);
  if (d.proposed_node !== undefined) {
    const pn = d.proposed_node;
    if (!isObj(pn) || typeof pn.id !== "string" || !pn.title) err("proposed_node", 'must be { "id": "...", "title": "..." }');
    else if (nodeIds.has(pn.id)) err("proposed_node.id", `"${pn.id}" already exists — use it as node_id and drop proposed_node`);
    else if (!NODE_ID_RE.test(pn.id) || pn.id.split("/").length < 2) err("proposed_node.id", "must be lowercase words-with-hyphens, 2–4 parts separated by /, e.g. computer-science/algorithms/binary-search");
    else if (!nodeIds.has(pn.id.split("/").slice(0, -1).join("/"))) err("proposed_node.id", `parent "${pn.id.split("/").slice(0, -1).join("/")}" doesn't exist — pick a parent from the agent guide`);
    else valid.add(pn.id);
  }
  const node = (path, id) => {
    if (typeof id !== "string" || !id) err(path, "node_id is required");
    else if (!valid.has(id)) err(path, `unknown node_id "${id}" — use an id from the agent guide, or add proposed_node`);
  };
  if (!VERBS.includes(d.verb)) err("verb", `must be one of ${VERBS.join(", ")} (got ${show(d.verb)})`);
  node("node_id", d.node_id);
  if (!isObj(d.agent) || typeof d.agent.name !== "string" || !d.agent.name) err("agent", 'must be { "name": "...", "surface": "...", "skill": "..." }');
  else for (const k of extra(d.agent, ["name", "surface", "skill"])) err(`agent.${k}`, "unexpected field");
  if (d.resource !== undefined) {
    if (!isObj(d.resource) || (!d.resource.url && !d.resource.title)) err("resource", 'must be { "url": "...", "title": "...", "kind": "..." } with a url or title');
    else for (const k of extra(d.resource, ["url", "title", "kind"])) err(`resource.${k}`, "unexpected field");
  }
  const p = d.payload;
  if (!isObj(p)) { err("payload", "must be an object"); return errors; }
  for (const k of extra(p, PAYLOAD[d.verb] || [])) err(`payload.${k}`, "unexpected field");
  if (d.verb !== "read" && !DEPTHS.includes(p.depth)) err("payload.depth", `must be one of ${DEPTHS.join(", ")} (got ${show(p.depth)})`);
  if (d.verb === "taught" && (typeof p.content !== "string" || !p.content.trim())) err("payload.content", "required — everything taught, complete enough to write the page from");
  if (d.verb === "quiz_answered") {
    if (!Array.isArray(p.questions) || !p.questions.length) err("payload.questions", "at least one question is required");
    (Array.isArray(p.questions) ? p.questions : []).forEach((q, i) => {
      const at = `payload.questions[${i}]`;
      if (!isObj(q)) return err(at, "must be an object");
      for (const k of extra(q, DRAFT_QUESTION)) err(`${at}.${k}`, "unexpected field");
      if (!TAGS.includes(q.tag)) err(`${at}.tag`, `must be one of ${TAGS.join(", ")} (got ${show(q.tag)})`);
      if (typeof q.question !== "string" || !q.question.trim()) err(`${at}.question`, "the full question text is required");
      if (typeof q.answer !== "string" || !q.answer.trim()) err(`${at}.answer`, "a summary of Craig's answer is required");
      if (typeof q.correct !== "boolean") err(`${at}.correct`, `must be true or false (got ${show(q.correct)})`);
      node(`${at}.node_id`, q.node_id);
    });
    if (p.gaps !== undefined && !Array.isArray(p.gaps)) err("payload.gaps", "must be a list");
    (Array.isArray(p.gaps) ? p.gaps : []).forEach((g, i) => {
      const at = `payload.gaps[${i}]`;
      if (!isObj(g)) return err(at, "must be an object");
      if ("id" in g) err(`${at}.id`, "remove it — gap ids are assigned when the event is logged");
      for (const k of extra(g, ["id", "node_id", "text"])) err(`${at}.${k}`, "unexpected field");
      node(`${at}.node_id`, g.node_id);
      if (typeof g.text !== "string" || !g.text.trim()) err(`${at}.text`, "required");
    });
  }
  if (d.verb === "read") {
    if (!Array.isArray(p.nodes) || !p.nodes.length) err("payload.nodes", "at least one { node_id, content } is required");
    (Array.isArray(p.nodes) ? p.nodes : []).forEach((n, i) => {
      const at = `payload.nodes[${i}]`;
      if (!isObj(n)) return err(at, "must be an object");
      for (const k of extra(n, ["node_id", "content", "notes"])) err(`${at}.${k}`, "unexpected field");
      node(`${at}.node_id`, n.node_id);
      if (typeof n.content !== "string" || !n.content.trim()) err(`${at}.content`, "required");
    });
  }
  return errors;
}

// Pulls the draft(s) out of whatever was pasted: tolerates ```json fences and chat text around the
// JSON. Accepts one draft, a list of drafts, { "events": [...] }, or an inbox file
// { "submitted_at": ..., "drafts": [...] }. Returns { drafts } or { error }.
export function extractDrafts(text) {
  let s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start === -1) return { error: "no JSON found — paste the code block Gemini gave you" };
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  let data;
  try { data = JSON.parse(s.slice(start, end + 1)); }
  catch (e) { return { error: `not valid JSON: ${e.message}` }; }
  if (Array.isArray(data)) return { drafts: data };
  if (isObj(data) && Array.isArray(data.drafts)) return { drafts: data.drafts };
  if (isObj(data) && Array.isArray(data.events)) return { drafts: data.events };
  return { drafts: [data] };
}

// The agent-written part of a logged event, in a stable key order — two submissions of the same
// session compare equal, so a double paste is logged once.
export function draftKey(d) {
  const sort = (x) => Array.isArray(x) ? x.map(sort)
    : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sort(x[k])])) : x;
  const p = JSON.parse(JSON.stringify(d.payload || {}));
  for (const g of p.gaps || []) delete g.id;
  return JSON.stringify(sort({ verb: d.verb, node_id: d.node_id, agent: d.agent, resource: d.resource || null, payload: p }));
}
