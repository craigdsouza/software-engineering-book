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

// The curriculum skeleton. Track order is FIXED (per the Learning CS project
// instructions and life-os-teacher/SKILL.md) and must never be re-sorted:
// Foundations (Data Structures -> Algorithms -> Complexity Theory ->
// Discrete Math -> Programming Concepts) -> Systems -> Mathematics ->
// Software Engineering -> Theory -> Specialization.
//
// A unit is one of:
//   { ord, title, page }            graphed unit — rows come from the sidecar
//   { ord, title, blank, note }     not written yet — renders `blank` ticks
//   { ord, title, pages, note }     written but no sidecar (taught ahead of
//                                   order) — rows render as `ungraded`
const CURRICULUM = [
  {
    name: "Foundations",
    meta: "track 1 · in progress",
    units: [
      { ord: "1.1", title: "Data Structures", page: "foundations/data-structures" },
      { ord: "1.2", title: "Algorithms", blank: 6, note: "opens when 1.1 is solid" },
      { ord: "1.3", title: "Complexity Theory", blank: 5, note: "queued" },
      { ord: "1.4", title: "Discrete Math", blank: 5, note: "queued · holds a flagged gap" },
      { ord: "1.5", title: "Programming Concepts", blank: 5, note: "queued" },
    ],
  },
  {
    name: "Systems → Theory",
    meta: "tracks 2–5 · gated by track order",
    units: [
      { ord: "2.0", title: "Systems", blank: 6, note: "not started" },
      { ord: "3.0", title: "Mathematics", blank: 6, note: "not started" },
      { ord: "4.0", title: "Software Engineering", blank: 6, note: "not started" },
      { ord: "5.0", title: "Theory", blank: 6, note: "not started" },
    ],
  },
  {
    name: "Specialization",
    meta: "track 6",
    units: [
      {
        ord: "6.1",
        title: "Web + Mobile Dev",
        note: "4 pages · taught ahead of order",
        pages: [
          ["backend/apis", "APIs"],
          ["backend/auth", "Auth"],
          ["backend/state-caching", "State & Caching"],
          ["backend/databases", "Databases"],
        ],
        footnote:
          "Adding a .graph.json sidecar to each of these four pages would pull them into the spine with real status instead of written-but-ungraded.",
      },
    ],
  },
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
  const p = ev.payload || {};
  if (typeof p.questions_asked === "number") return p.questions_asked;
  return (typeof p.correct === "number" ? p.correct : 0) + (typeof p.wrong === "number" ? p.wrong : 0);
}
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
    if (e.verb !== "quiz_answered" || String(e.node_id || "").indexOf("book:") !== 0) continue;
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

// ---- per-node tag ladder: aggregate every questions[] entry ever logged ----
function aggregateTags(evList) {
  const acc = { recall: null, explain: null, predict: null };
  for (const e of evList || []) {
    if (e.verb !== "quiz_answered" || !Array.isArray(e.payload?.questions)) continue;
    for (const q of e.payload.questions) {
      if (!(q.tag in acc)) continue;
      if (!acc[q.tag]) acc[q.tag] = [0, 0];
      acc[q.tag][1] += 1;
      if (q.correct === true) acc[q.tag][0] += 1;
    }
  }
  return acc;
}

function progressHelpers(nodes, eventsByNode, today) {
  const byTitle = new Map();
  for (const n of nodes.values()) byTitle.set(n.title, n.id);

  const unmetDeps = (n) =>
    (n.deps || []).filter((t) => {
      const id = byTitle.get(t);
      return id && nodes.get(id)._status !== "solid";
    });

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
    if (gapped.length) return trimProse(gapped[gapped.length - 1].payload.gaps[0]);

    const quizzes = evs.filter((e) => e.verb === "quiz_answered");
    if (quizzes.length) {
      const last = quizzes[quizzes.length - 1];
      return `Last checked ${mmdd(eventDate(last))}: ${last.payload?.correct ?? 0} of ${eventAsked(last)} clean, no gaps logged.`;
    }
    const taught = evs.filter((e) => e.verb === "taught");
    if (taught.length) return trimProse(taught[taught.length - 1].payload?.note || "Taught, not yet quizzed on its own.");

    const parent = n.parent ? nodes.get(n.parent) : null;
    if (parent) {
      const pq = (eventsByNode.get(parent.id) || []).filter((e) => e.verb === "quiz_answered");
      if (pq.length)
        return `Covered in the ${mmdd(eventDate(pq[pq.length - 1]))} page-level review of ${stripParen(parent.title)}; no section-level check of its own yet.`;
    }
    return "Written, but no recall check logged yet.";
  }

  return { byTitle, unmetDeps, rowMeta, composeStands };
}

function hrefFor(nodeId) {
  const raw = nodeId.replace(/^book:/, "");
  const hash = raw.indexOf("#");
  return hash === -1 ? `${raw}.html` : `${raw.slice(0, hash)}.html#${raw.slice(hash + 1)}`;
}

// ---- the spine: curriculum order, one row per graph node ----
function buildSpine(nodes, eventsByNode, rawEvents, today, H) {
  const groups = [];
  const flatUnits = []; // { ord, title, groupName, unitPageId, rows }

  for (const g of CURRICULUM) {
    const units = [];
    for (const u of g.units) {
      if (u.blank) {
        units.push({ ord: u.ord, title: u.title, note: u.note, count: "—", here: false, blank: u.blank });
        flatUnits.push({ ord: u.ord, title: u.title, groupName: g.name, unitPageId: null, rows: [] });
        continue;
      }

      if (u.pages) {
        // written ahead of order, no sidecar -> ungraded rows
        const rows = u.pages.map(([path, title]) => {
          const id = "book:" + path;
          const evs = rawEvents.filter((e) => e.node_id === id);
          const taughtEvs = evs.filter((e) => e.verb === "taught");
          const quizEvs = evs.filter((e) => e.verb === "quiz_answered");
          const firstTaught = taughtEvs.map(eventDate).filter(Boolean).sort()[0];
          const gapped = quizEvs.filter((e) => Array.isArray(e.payload?.gaps) && e.payload.gaps.length);
          const metaBits = [];
          if (firstTaught) metaBits.push(`taught ${mmdd(firstTaught)}`);
          metaBits.push(quizEvs.length ? `quizzed ${quizEvs.length}x` : "not quizzed");
          const stands = gapped.length
            ? trimProse(gapped[gapped.length - 1].payload.gaps[0])
            : `Quizzed ${quizEvs.length}x with no gaps logged; no .graph.json sidecar, so scan-book.mjs can't score it.`;
          return {
            node_id: id,
            title,
            kind: "page",
            depth: 0,
            status: "ungraded",
            meta: metaBits.join(" · "),
            tags: aggregateTags(quizEvs),
            stands,
          };
        });
        units.push({
          ord: u.ord,
          title: u.title,
          note: u.note,
          count: "outside graph",
          here: false,
          footnote: u.footnote,
          nodes: rows,
        });
        flatUnits.push({ ord: u.ord, title: u.title, groupName: g.name, unitPageId: null, rows });
        continue;
      }

      // graphed unit: rows = the page's own sections, then any promoted child
      // page (parent === this page) with its own sections indented under it.
      const unitPageId = "book:" + u.page;
      const pageNode = nodes.get(unitPageId);
      const rows = [];
      const pushRow = (n, depth) => {
        if (!n) return;
        rows.push({
          node_id: n.id,
          title: n.title,
          kind: n.materialization,
          depth,
          status: n._status,
          meta: H.rowMeta(n, depth),
          tags: aggregateTags(eventsByNode.get(n.id)),
          stands: H.composeStands(n),
        });
      };
      for (const secId of pageNode ? pageNode.children : []) pushRow(nodes.get(secId), 0);
      for (const n of nodes.values()) {
        if (n.materialization === "page" && n.parent === unitPageId) {
          pushRow(n, 0);
          for (const secId of n.children) pushRow(nodes.get(secId), 1);
        }
      }

      const solid = rows.filter((r) => r.status === "solid").length;
      const noTags = rows.filter((r) => {
        const evs = eventsByNode.get(r.node_id) || [];
        return !evs.some(
          (e) => e.verb === "quiz_answered" && Array.isArray(e.payload?.questions) && e.payload.questions.length
        );
      }).length;

      units.push({
        ord: u.ord,
        title: u.title,
        note: `you are here · ${rows.length} nodes`,
        count: `${solid} / ${rows.length} solid`,
        here: false, // set once the frontier pick is known
        footnote:
          `${cap(word(noTags))} of these ${word(rows.length)} have no per-question tags yet — the 2026-08-30 review graded the ` +
          `whole page in one aggregate, and tagged questions only start at 2026-09-03. Most rows have no shape to read yet.`,
        nodes: rows,
      });
      flatUnits.push({ ord: u.ord, title: u.title, groupName: g.name, unitPageId, rows });
    }
    groups.push({ name: g.name, meta: g.meta, units });
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
      for (const dt of pick.deps || []) {
        const id = H.byTitle.get(dt);
        if (id && nodes.get(id)._status !== "solid") {
          pick = nodes.get(id);
          clause = 3;
          break;
        }
      }
      if ((clause === 2 || clause === 3) && pick.materialization === "page") {
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
    if (pick.parent && unit.unitPageId && pick.parent !== unit.unitPageId && nodes.get(pick.parent)) {
      path.push(stripParen(nodes.get(pick.parent).title));
    }
  }
  path.push(stripParen(pick.title));

  let why;
  if (clause === 1) {
    const over = -offsetDays(pick._direct.dueDate, today);
    why =
      overdue.length === 1
        ? `${cap(word(over))} days overdue, and the only node in the book that is.`
        : `${cap(word(over))} days overdue — the oldest of ${word(overdue.length)} nodes past due.`;
    const depId = (pick.deps || [])
      .map((t) => H.byTitle.get(t))
      .find((id) => id && nodes.get(id)._status !== "solid" && !nodes.get(id)._direct);
    if (depId) {
      why += ` Its dep ${stripParen(nodes.get(depId).title)} has never been scored on its own, so this is also the check that gives that section its first evidence.`;
    }
  } else if (clause === 3) {
    why = `${stripParen(pick.title)} is a declared dependency of the next unsolid node and isn't solid itself, so it comes first.`;
  } else if (clause === 4) {
    why = `First unsolid section of ${stripParen(nodes.get(pick.parent)?.title || "its page")} — the page's status is a roll-up and can't be cleared directly.`;
  } else {
    why = `First node in curriculum order that isn't solid yet.`;
  }

  const kicker =
    clause === 1
      ? "Next up · overdue review"
      : clause === 3
      ? "Next up · dependency first"
      : clause === 4
      ? "Next up · section before its page"
      : "Next up · curriculum order";

  const clauses = [
    {
      n: 1,
      text: `Any node past its due date — oldest first. ${stripParen(pick.title)} has been due since ${pick._direct?.dueDate || "—"}.`,
      fired: clause === 1,
    },
    { n: 2, text: `Otherwise walk tracks in curriculum order, then units, then sections, and take the first node that isn't solid.`, fired: clause === 2 },
    { n: 3, text: `If that node has a declared dep that isn't solid, the dep is taken instead.`, fired: clause === 3 },
    { n: 4, text: `Sections before their parent page: a page's status is a roll-up, so it can't be cleared directly.`, fired: clause === 4 },
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
    `${cap(word(unscheduled.length))} nodes carry no due date because they've never been scored on their own — a ` +
    `page-level review graded the whole page at once. One section-level check each converts them from debt into a schedule.`;

  return { scheduled, unscheduled, advice };
}

function buildProgressData(nodes, eventsByNode, rawEvents, sidecarCount) {
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

  const bookEvs = rawEvents.filter((e) => String(e.node_id || "").indexOf("book:") === 0);
  const ids = bookEvs.map((e) => e.id).filter((n) => typeof n === "number");
  const lastDate = bookEvs.map(eventDate).filter(Boolean).sort().pop();
  const provenance =
    `Generated from book-graph-data.json and events ${Math.min(...ids)}–${Math.max(...ids)} ` +
    `(latest ${lastDate}) across ${sidecarCount} sidecars. No status on this page is hand-written.`;

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

  // ---- derived VIEW data for the progress pages ----
  let rawEvents = [];
  try {
    rawEvents = JSON.parse(readFileSync(join(root, "events.json"), "utf8"));
  } catch {
    rawEvents = [];
  }
  const progress = buildProgressData(nodes, eventsByNode, rawEvents, sidecars.length);
  const progressPath = join(root, "progress-data.json");
  writeFileSync(progressPath, JSON.stringify(progress, null, 2) + "\n");
  console.log(
    `Wrote ${progressPath} — next: ${progress.next ? progress.next.title + " (clause " + progress.next.clause + ")" : "none"}, ` +
      `cadence ${progress.cadence.active_days} active / run ${progress.cadence.longest_run} / ${progress.cadence.days_since_last}d since.`
  );
}

main();
