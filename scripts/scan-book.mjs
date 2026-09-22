#!/usr/bin/env node
// scan-book.mjs — derived-index generator for the software-engineering-book graph.
//
// Reads nodes.json (the node registry: authored structure — deps/contrasts/
// also_in, never scores) plus events.json (schema 1, raw truth), and computes a
// live solid/needs-review status per node. Nothing here is hand-edited — this
// file is fully regenerable from its inputs. Moved to schema-1 events and
// nodes.json on 2026-09-21 (see docs/events-v1.md); the *.graph.json sidecars
// it used to read are retired.
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

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- 1. Locate the book repo ----------

function findBookRoot() {
  // BOOK_ROOT env override is for testing. Normal runs need nothing: this
  // script lives in {book root}/scripts/, so its parent directory is the root.
  if (process.env.BOOK_ROOT) return process.env.BOOK_ROOT;
  return dirname(__dirname);
}

// ---------- 2. Node table from nodes.json (authored structure only) ----------
// id = domain/concept/sub-concept (1-4 segments). parent = the id minus its
// last segment, when that exists in the registry. materialization:
//   "group"   — no page of its own (a domain, or a grouping like complexity)
//   "page"    — owns an HTML page
//   "section" — lives at an #anchor inside someone else's page
// deps / contrasts / also_in are node ids. Forward pointers ride along unscored.

let PAGES = new Map(); // id -> page href, used by hrefFor()

function loadRegistry(root) {
  const reg = JSON.parse(readFileSync(join(root, "nodes.json"), "utf8"));
  const nodes = new Map();
  for (const n of reg.nodes) {
    nodes.set(n.id, {
      id: n.id,
      title: n.title,
      summary: n.summary || "",
      page: n.page || null,
      materialization: !n.page ? "group" : n.page.includes("#") ? "section" : "page",
      parent: null,
      children: [],
      deps: n.deps || [],
      contrasts: n.contrasts || [],
      also_in: n.also_in || [],
    });
  }
  for (const n of nodes.values()) {
    const cut = n.id.lastIndexOf("/");
    const parentId = cut === -1 ? null : n.id.slice(0, cut);
    if (parentId && nodes.has(parentId)) {
      n.parent = parentId;
      nodes.get(parentId).children.push(n.id);
    }
  }
  PAGES = new Map([...nodes.values()].filter((n) => n.page).map((n) => [n.id, n.page]));
  return { nodes, forwardPointers: reg.forward_pointers || [] };
}

// ---------- 3. Load book: events, grouped by node_id ----------

function loadRawEvents(root) {
  try {
    return JSON.parse(readFileSync(join(root, "events.json"), "utf8"));
  } catch {
    return [];
  }
}

// A schema-1 event can touch several nodes: its own node_id, plus any node its
// questions, gaps or read-notes name (one quiz on a paper can score three
// nodes). Each node gets its own VIEW of the event, with questions and gaps
// filtered to that node, so every per-node rule below (streaks, tags, gaps)
// only ever sees evidence about that node.
function loadBookEvents(rawEvents) {
  const byNode = new Map();
  const add = (id, ev) => {
    const arr = byNode.get(id) || [];
    arr.push(ev);
    byNode.set(id, arr);
  };
  for (const ev of rawEvents) {
    const p = ev.payload || {};
    const touched = new Set([ev.node_id]);
    (p.questions || []).forEach((q) => q.node_id && touched.add(q.node_id));
    (p.gaps || []).forEach((g) => g.node_id && touched.add(g.node_id));
    (p.nodes || []).forEach((n) => n.node_id && touched.add(n.node_id));
    for (const id of touched) {
      if (!id) continue;
      if (ev.verb !== "quiz_answered") {
        add(id, ev);
        continue;
      }
      const questions = (p.questions || []).filter((q) => (q.node_id || ev.node_id) === id);
      const gaps = (p.gaps || []).filter((g) => (g.node_id || ev.node_id) === id);
      // a node only named by a gap (no question of its own) is not reviewed by this event
      if (!questions.length && id !== ev.node_id) continue;
      add(id, { ...ev, payload: { ...p, questions, gaps } });
    }
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
  return (ev.payload?.questions || []).filter((q) => q.correct === false).length;
}

function eventDate(ev) {
  return ev.date || (ev.ts ? ev.ts.slice(0, 10) : null);
}

// Returns { status, timesReviewed, lastScored, lastSuccess, dueDate } | null if no quiz events.
function directStatus(events, today = new Date()) {
  const quizzes = (events || []).filter((e) => e.verb === "quiz_answered" && e.payload?.questions?.length);
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

  // "fresh" (first clean confirmation, streak === 1) was retired 2026-09-18 --
  // Craig found it confusing next to the per-tag grid's own pass/fail colors
  // and asked to fold it into "solid": any node whose last scored review was
  // clean and still inside its due window now reads solid, whether this is
  // its first clean confirmation or its fifth. The streak count itself is
  // untouched -- it still drives the review interval below -- only the
  // status label collapses from three values to two (solid / needs-review).
  let status;
  if (lastWasWrong) {
    status = "needs-review";
  } else if (dueDate && today.toISOString().slice(0, 10) > dueDate) {
    status = "needs-review";
  } else {
    status = "solid";
  }

  return { status, timesReviewed: streak, lastScored, lastSuccess: lastSuccessDate, dueDate };
}

// ---------- 5. Recursive combine: status(node) = weakest_link(direct, rollup(children)) ----------

// "fresh" retired 2026-09-18 -- see the note in directStatus() above.
const RANK = { "needs-review": 0, solid: 1 };
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
  const unlockCount = new Map();
  for (const n of nodes.values()) {
    for (const depId of n.deps) {
      if (!nodes.has(depId)) continue; // dep not found among known nodes — leave unresolved
      unlockCount.set(depId, (unlockCount.get(depId) || 0) + 1);
    }
  }
  for (const n of nodes.values()) n.unlocks = unlockCount.get(n.id) || 0;
}

// ===========================================================================
// 7. progress-data.json — the derived VIEW data for the home page + review
//    schedule due strip. build-progress.mjs renders this file and never
//    re-derives status or re-reads events.json. Everything below is a pure
//    function of (nodes + their computed status) + events.json + today.
//
//    All prose the renderer prints — meta / note / count / stands / why /
//    advice / footnote / provenance — is composed HERE, from the sentence
//    templates in this section, so wording stays consistent in one place.
//    Visual spec: design/Home Page.dc.html, design/Book Progress.dc.html.
// ===========================================================================

// The study PATH. The top level of the book is subject domains (nodes.json);
// order is not part of that hierarchy — it lives here. Domains are walked in
// this order by the "next up" rule, and within a domain its units (depth-2
// nodes) follow `units` where given, then any others alphabetically. `planned`
// units don't exist in nodes.json yet and render as empty placeholders.
// Changed 2026-09-21 from the fixed Foundations → Systems → … track order.
const PATH = [
  { domain: "computer-science", units: ["data-structures", "algorithms", "complexity", "computability"],
    planned: { algorithms: "Algorithms", computability: "Computability & Automata" } },
  { domain: "computer-architecture" },
  { domain: "operating-systems" },
  { domain: "networking" },
  { domain: "distributed-systems" },
  { domain: "databases" },
  { domain: "mathematics" },
  { domain: "programming-languages" },
  { domain: "software-engineering" },
  { domain: "security" },
  { domain: "backend" },
  { domain: "frontend" },
  { domain: "mobile" },
  { domain: "devops-cloud" },
  { domain: "machine-learning" },
];

const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n) => (n >= 0 && n < NUM_WORDS.length ? NUM_WORDS[n] : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stripParen = (s) => String(s).replace(/\s*\([^)]*\)\s*$/, "").trim();
const mmdd = (isoDate) => (isoDate ? String(isoDate).slice(5) : "");

function isoShift(baseStr, n) {
  const d = new Date(baseStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function offsetDays(dateStr, todayStr) {
  return Math.round((Date.parse(dateStr + "T00:00:00Z") - Date.parse(todayStr + "T00:00:00Z")) / 86400000);
}
function eventAsked(ev) {
  return (ev.payload?.questions || []).length;
}
function eventCorrect(ev) {
  return (ev.payload?.questions || []).filter((q) => q.correct === true).length;
}
const gapText = (g) => (typeof g === "string" ? g : g?.text || "");
function trimProse(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= 220) return s;
  let cut = s.slice(0, 220);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  if (stop > 90) return cut.slice(0, stop + 1);
  cut = cut.replace(/[\s—–-]+$/, "");
  return cut + "…";
}

// ---- cadence: one cell per day, oldest -> newest, 84 entries ----
function buildCadence(rawEvents, today) {
  const WINDOW = 84;
  const RENDERED = 28; // the home strip; metrics are computed over this tail
  const perDay = {};
  for (const e of rawEvents) {
    if (e.verb !== "quiz_answered") continue;
    const d = eventDate(e);
    if (!d) continue;
    perDay[d] = (perDay[d] || 0) + eventAsked(e);
  }
  const days = [];
  for (let i = WINDOW - 1; i >= 0; i--) {
    const date = isoShift(today, -i);
    const q = perDay[date] || 0;
    const level = q === 0 ? 0 : q <= 2 ? 1 : q <= 5 ? 2 : q <= 9 ? 3 : 4;
    days.push({ date, questions: q, level });
  }
  const win = days.slice(-RENDERED);
  let best = 0, run = 0;
  for (const d of win) {
    if (d.questions) { run += 1; best = Math.max(best, run); } else run = 0;
  }
  let since = 0, seen = false;
  for (let i = win.length - 1; i >= 0; i--) {
    if (win[i].questions) { seen = true; break; }
    since += 1;
  }
  return {
    days,
    active_days: win.filter((d) => d.questions).length,
    longest_run: best,
    days_since_last: seen ? since : null,
  };
}

// ---- per-node tag ladder: rolling-window pass/fail, not a lifetime tally ----
// Redesigned 2026-09-18 at Craig's request. The old version summed every
// question of a tag ever asked, for the life of the node -- so a single bad
// day years ago could sit as a permanent "1/4" no matter how well later
// reviews went. That's inconsistent with how node-level status already
// works (a clean review supersedes an old miss), and over a long enough
// history a lifetime ratio stops meaning "where do I stand" and starts
// meaning "did I ever have a bad day."
//
// New rule, agreed with Craig 2026-09-18: look only at the most recent
// TAG_WINDOW (10) questions of that tag, most-recent-first trimmed to that
// window. Below TAG_MIN_SAMPLE (5) questions ever asked, there isn't enough
// evidence to call it either way, so it never passes regardless of ratio --
// this mirrors why node status needs 2+ clean reviews to be trusted, not 1.
// At or above the minimum, the bar is proportional to TAG_BAR_NUM/TAG_BAR_DEN
// (8/10 = 80%): ceil(0.8 * asked) correct, which lands exactly on "8 of 10"
// once the window fills and smoothly generalizes below it (4/5, 5/6, 6/7...).
// The resulting boolean (meetsBar) reuses the SAME solid/needs-review colors
// as the node-level tick, on purpose -- both are now "is this in good shape
// right now" signals, just computed at different grains (node vs. tag).
const TAG_WINDOW = 10;
const TAG_MIN_SAMPLE = 5;
const TAG_BAR_NUM = 8;
const TAG_BAR_DEN = 10;

function aggregateTags(evList) {
  const flat = { recall: [], explain: [], predict: [] };
  for (const e of evList || []) {
    if (e.verb !== "quiz_answered" || !Array.isArray(e.payload?.questions)) continue;
    for (const q of e.payload.questions) {
      if (!(q.tag in flat)) continue;
      flat[q.tag].push(q.correct === true);
    }
  }
  const acc = {};
  for (const tag of Object.keys(flat)) {
    const seq = flat[tag];
    if (!seq.length) {
      acc[tag] = null;
      continue;
    }
    const windowed = seq.slice(-TAG_WINDOW);
    const asked = windowed.length;
    const right = windowed.filter(Boolean).length;
    const meetsBar = asked >= TAG_MIN_SAMPLE && right >= Math.ceil((TAG_BAR_NUM / TAG_BAR_DEN) * asked);
    acc[tag] = { right, asked, meetsBar };
  }
  return acc;
}

function progressHelpers(nodes, eventsByNode, today) {
  const unmetDeps = (n) =>
    (n.deps || []).filter((id) => nodes.has(id) && nodes.get(id)._status !== "solid").map((id) => nodes.get(id).title);

  function rowMeta(n, depth) {
    const d = n._direct;
    const parts = [];
    if (n.materialization === "page" && depth === 0) parts.push("page");
    else if (depth === 1 && n.parent && nodes.get(n.parent)) parts.push("under " + stripParen(nodes.get(n.parent).title));

    if (d && d.dueDate) {
      const off = offsetDays(d.dueDate, today);
      parts.push(off < 0 ? `${-off}d overdue` : off === 0 ? "due today" : `due ${mmdd(d.dueDate)}`);
    } else if (d && d.lastScored) {
      parts.push(`scored ${mmdd(d.lastScored)}`);
    } else {
      parts.push("never scored on its own");
    }
    if (d) parts.push(`reviewed ${d.timesReviewed}x`);

    const unmet = unmetDeps(n);
    if (unmet.length) parts.push("deps: " + unmet.join(", "));
    return parts.join(" · ");
  }

  // "where it stands": prefer the most recent unresolved gap for this node,
  // else fall back to what the record shows.
  function composeStands(n) {
    const evs = eventsByNode.get(n.id) || [];
    const gapped = evs.filter(
      (e) => e.verb === "quiz_answered" && Array.isArray(e.payload?.gaps) && e.payload.gaps.length
    );
    if (gapped.length) return trimProse(gapText(gapped[gapped.length - 1].payload.gaps[0]));

    const quizzes = evs.filter((e) => e.verb === "quiz_answered");
    if (quizzes.length) {
      const last = quizzes[quizzes.length - 1];
      return `Last checked ${mmdd(eventDate(last))}: ${eventCorrect(last)} of ${eventAsked(last)} clean, no gaps logged.`;
    }
    const taught = evs.filter((e) => e.verb === "taught");
    if (taught.length) return trimProse(taught[taught.length - 1].payload?.notes || "Taught, not yet quizzed on its own.");

    const parent = n.parent ? nodes.get(n.parent) : null;
    if (parent) {
      const pq = (eventsByNode.get(parent.id) || []).filter((e) => e.verb === "quiz_answered");
      if (pq.length)
        return `Covered in the ${mmdd(eventDate(pq[pq.length - 1]))} review of ${stripParen(parent.title)} as a whole; no check of its own yet.`;
    }
    return "Written, but no recall check logged yet.";
  }

  return { unmetDeps, rowMeta, composeStands };
}

// The page a node's prose lives on; a group node without a page links to its
// first descendant that has one, or nothing.
function hrefFor(nodeId) {
  if (PAGES.has(nodeId)) return PAGES.get(nodeId);
  for (const [id, page] of PAGES) if (id.startsWith(nodeId + "/")) return page.split("#")[0];
  return null;
}

// ---- the spine: study-path order, one row per graph node ----
// Groups = domains with content, in PATH order, then one "not started" group
// for the rest. Units = a domain's depth-2 nodes. Rows = a unit's descendants
// (children at depth 0, grandchildren at depth 1, …); a unit with no
// descendants is its own single row.
function buildSpine(nodes, eventsByNode, rawEvents, today, H) {
  const groups = [];
  const flatUnits = []; // { ord, title, groupName, unitPageId, rows }

  const graphRow = (n, depth) => ({
    node_id: n.id,
    title: n.title,
    kind: n.materialization,
    depth,
    status: n._status,
    meta: H.rowMeta(n, depth),
    tags: aggregateTags(eventsByNode.get(n.id)),
    stands: H.composeStands(n),
    href: hrefFor(n.id),
  });
  const descendants = (n, depth, out) => {
    for (const cid of n.children) {
      const c = nodes.get(cid);
      out.push(graphRow(c, depth));
      descendants(c, depth + 1, out);
    }
    return out;
  };

  const idle = [];
  let gi = 0;
  for (const step of PATH) {
    const dom = nodes.get(step.domain);
    if (!dom) continue;
    if (!dom.children.length) {
      idle.push(dom);
      continue;
    }
    gi += 1;
    const order = step.units || [];
    const unitIds = [...new Set([...order.map((u) => `${dom.id}/${u}`), ...[...dom.children].sort()])];
    const units = [];
    let ui = 0;
    for (const uid of unitIds) {
      const slug = uid.slice(dom.id.length + 1);
      const u = nodes.get(uid);
      if (!u && !(step.planned && step.planned[slug])) continue;
      ui += 1;
      const ord = `${gi}.${ui}`;
      if (!u) {
        units.push({ ord, title: step.planned[slug], note: "planned", count: "—", here: false, blank: 5 });
        flatUnits.push({ ord, title: step.planned[slug], groupName: dom.title, unitPageId: null, rows: [] });
        continue;
      }
      const rows = u.children.length ? descendants(u, 0, []) : [graphRow(u, 0)];
      const solid = rows.filter((r) => r.status === "solid").length;
      const noTags = rows.filter(
        (r) => !(eventsByNode.get(r.node_id) || []).some((e) => (e.payload?.questions || []).some((q) => q.tag))
      ).length;
      units.push({
        ord,
        title: u.title,
        note: `${rows.length} node${rows.length === 1 ? "" : "s"}`,
        count: `${solid} / ${rows.length} solid`,
        here: false, // set once the frontier pick is known
        href: hrefFor(u.id),
        footnote: !noTags
          ? undefined
          : rows.length === 1
          ? `No tagged questions yet, so the recall / explain / predict cells stay empty.`
          : `${cap(word(noTags))} of these ${word(rows.length)} have no tagged questions yet, so their recall / explain / predict cells stay empty.`,
        nodes: rows,
      });
      flatUnits.push({ ord, title: u.title, groupName: dom.title, unitPageId: u.id, rows });
    }
    const count = units.reduce((a, u) => a + (u.nodes ? u.nodes.length : 0), 0);
    groups.push({ name: dom.title, meta: `domain ${gi} · ${count} node${count === 1 ? "" : "s"}`, units });
  }
  if (idle.length) {
    groups.push({
      name: "Not started",
      meta: `${idle.length} domains · in study-path order`,
      units: idle.map((d, i) => ({ ord: `${gi + 1}.${i + 1}`, title: d.title, note: d.summary, count: "—", here: false, blank: 4 })),
    });
  }

  return { groups, flatUnits };
}

// ---- frontier rule: evaluate clauses in order, first match wins ----
function buildFrontier(nodes, flatUnits, today, H) {
  const overdue = [];
  for (const n of nodes.values()) {
    const d = n._direct;
    if (d && d.dueDate && d.dueDate < today) overdue.push(n);
  }
  overdue.sort((a, b) => (a._direct.dueDate < b._direct.dueDate ? -1 : a._direct.dueDate > b._direct.dueDate ? 1 : 0));

  let pick = null;
  let clause = 0;

  if (overdue.length) {
    pick = overdue[0];
    clause = 1;
  } else {
    for (const u of flatUnits) {
      for (const r of u.rows) {
        if (r.status === "solid" || r.status === "unwritten" || r.status === "ungraded") continue;
        pick = nodes.get(r.node_id);
        clause = 2;
        break;
      }
      if (pick) break;
    }
    if (pick) {
      for (const id of pick.deps || []) {
        if (nodes.has(id) && nodes.get(id)._status !== "solid") {
          pick = nodes.get(id);
          clause = 3;
          break;
        }
      }
      if ((clause === 2 || clause === 3) && pick.children.length) {
        for (const cid of pick.children) {
          const c = nodes.get(cid);
          if (c && c._status !== "solid") {
            pick = c;
            clause = 4;
            break;
          }
        }
      }
    }
  }

  if (!pick) return null;

  let unit = null;
  for (const u of flatUnits) {
    if (u.rows.some((r) => r.node_id === pick.id)) {
      unit = u;
      break;
    }
  }

  const path = [];
  if (unit) {
    path.push(unit.groupName, `${unit.ord} ${unit.title}`);
    // a grandchild or deeper: name the parent in between (e.g. Data Structures → Trees → BST)
    if (pick.id !== unit.unitPageId && pick.parent && pick.parent !== unit.unitPageId && nodes.get(pick.parent)) {
      path.push(stripParen(nodes.get(pick.parent).title));
    }
  }
  if (!unit || pick.id !== unit.unitPageId) path.push(stripParen(pick.title));

  let why;
  if (clause === 1) {
    const over = -offsetDays(pick._direct.dueDate, today);
    why =
      overdue.length === 1
        ? `${cap(word(over))} days overdue, and the only node in the book that is.`
        : `${cap(word(over))} days overdue — the oldest of ${word(overdue.length)} nodes past due.`;
    const depId = (pick.deps || [])
      .find((id) => nodes.has(id) && nodes.get(id)._status !== "solid" && !nodes.get(id)._direct);
    if (depId) {
      why += ` Its dep ${stripParen(nodes.get(depId).title)} has never been scored on its own, so this is also the check that gives that section its first evidence.`;
    }
  } else if (clause === 3) {
    why = `${stripParen(pick.title)} is a declared dependency of the next unsolid node and isn't solid itself, so it comes first.`;
  } else if (clause === 4) {
    why = `First unsolid section of ${stripParen(nodes.get(pick.parent)?.title || "its page")} — the page's status is a roll-up and can't be cleared directly.`;
  } else {
    why = `First node in study-path order that isn't solid yet.`;
  }

  const kicker =
    clause === 1
      ? "Next up · overdue review"
      : clause === 3
      ? "Next up · dependency first"
      : clause === 4
      ? "Next up · section before its page"
      : "Next up · study-path order";

  const clauses = [
    {
      n: 1,
      text: `Any node past its due date — oldest first. ${stripParen(pick.title)} has been due since ${pick._direct?.dueDate || "—"}.`,
      fired: clause === 1,
    },
    { n: 2, text: `Otherwise walk domains in study-path order, then units, then their nodes, and take the first node that isn't solid.`, fired: clause === 2 },
    { n: 3, text: `If that node has a declared dep that isn't solid, the dep is taken instead.`, fired: clause === 3 },
    { n: 4, text: `Children before their parent: a parent's status is a roll-up, so it can't be cleared directly.`, fired: clause === 4 },
  ];

  return {
    node_id: pick.id,
    title: stripParen(pick.title),
    path,
    href: hrefFor(pick.id),
    clause,
    kicker,
    why,
    clauses,
  };
}

// ---- due strip (review-schedule.html) ----
function buildDue(nodes, today) {
  const scheduled = [];
  const unscheduled = [];
  for (const n of nodes.values()) {
    const d = n._direct;
    if (n.materialization === "group" && !d) continue; // domains/groupings are roll-ups, not debt
    if (d && d.dueDate) {
      scheduled.push({
        node_id: n.id,
        title: stripParen(n.title),
        due: d.dueDate,
        status: n._status,
        offset_days: offsetDays(d.dueDate, today),
      });
    } else {
      unscheduled.push({
        node_id: n.id,
        title: stripParen(n.title),
        last: d && d.lastScored ? `scored ${mmdd(d.lastScored)}` : "never scored",
        _rank: d && d.lastScored ? d.lastScored : "",
      });
    }
  }
  scheduled.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  unscheduled.sort((a, b) => {
    if (a._rank && b._rank) return a._rank < b._rank ? 1 : -1; // most recent first
    if (a._rank) return -1;
    if (b._rank) return 1;
    return 0;
  });
  unscheduled.forEach((u) => delete u._rank);

  const advice =
    `${cap(word(unscheduled.length))} nodes carry no due date: either they've never had a clean review of their own ` +
    `(a whole-page review scored the page, not them), or every review so far had a miss. One clean check each converts them into a schedule.`;

  return { scheduled, unscheduled, advice };
}

function buildProgressData(nodes, eventsByNode, rawEvents) {
  const today = new Date().toISOString().slice(0, 10);
  const H = progressHelpers(nodes, eventsByNode, today);

  const { groups, flatUnits } = buildSpine(nodes, eventsByNode, rawEvents, today, H);
  const next = buildFrontier(nodes, flatUnits, today, H);

  // mark the one unit that contains the frontier pick
  if (next) {
    for (const g of groups) {
      for (const u of g.units) {
        if (u.nodes && u.nodes.some((r) => r.node_id === next.node_id)) u.here = true;
      }
    }
  }

  const ids = rawEvents.map((e) => e.id).filter((n) => typeof n === "number");
  const lastDate = rawEvents.map(eventDate).filter(Boolean).sort().pop();
  const provenance =
    `Generated from events ${Math.min(...ids)}–${Math.max(...ids)} (latest ${lastDate}) and ` +
    `${nodes.size} nodes in nodes.json. No status on this page is hand-written.`;

  return {
    generated_at: new Date().toISOString(),
    today,
    cadence: buildCadence(rawEvents, today),
    next,
    spine: groups,
    due: buildDue(nodes, today),
    provenance,
  };
}

// ---------- main ----------

function main() {
  const root = findBookRoot();
  const { nodes, forwardPointers } = loadRegistry(root);
  const rawEvents = loadRawEvents(root);
  const eventsByNode = loadBookEvents(rawEvents);

  computeAll(nodes, eventsByNode);
  computeUnlocks(nodes);

  const out = {
    generated_at: new Date().toISOString(),
    nodes: [...nodes.values()].map((n) => ({
      id: n.id,
      title: n.title,
      materialization: n.materialization,
      page: n.page,
      parent: n.parent,
      children: n.children,
      deps: n.deps,
      contrasts: n.contrasts,
      also_in: n.also_in,
      unlocks: n.unlocks,
      status: n._status,
      direct: n._direct, // null if this node has never been quizzed directly
    })),
    forward_pointers: forwardPointers, // never scored -- authored structure only
  };

  const outPath = join(root, "book-graph-data.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${outPath} — ${out.nodes.length} nodes, ${forwardPointers.length} forward pointers.`);
  for (const n of out.nodes) {
    if (n.materialization === "group" && !n.children.length) continue;
    console.log(`  ${n.id.padEnd(48)} ${n.status.padEnd(13)} (${n.materialization})`);
  }

  // ---- derived VIEW data for the progress pages ----
  const progress = buildProgressData(nodes, eventsByNode, rawEvents);
  const progressPath = join(root, "progress-data.json");
  writeFileSync(progressPath, JSON.stringify(progress, null, 2) + "\n");
  console.log(
    `Wrote ${progressPath} — next: ${progress.next ? progress.next.title + " (clause " + progress.next.clause + ")" : "none"}, ` +
      `cadence ${progress.cadence.active_days} active / run ${progress.cadence.longest_run} / ${progress.cadence.days_since_last}d since.`
  );
}

main();
