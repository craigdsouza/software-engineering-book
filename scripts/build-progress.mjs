#!/usr/bin/env node
// build-progress.mjs — renders the derived progress views into the site.
//
// Reads ONLY progress-data.json (emitted by scan-book.mjs). Also fills the
// status line and coverage log on every topic page (regions page-status /
// page-coverage), so no page carries hand-typed status. It never re-derives
// status and never reads events.json — every number and sentence on the page is
// already composed upstream. This file is pure presentation: it turns the view
// data into static HTML and splices it between marker comments.
//
//   progress-data.json ──▶ _site/index.html          (cadence · next up · spine)
//                     ├──▶ _site/review-schedule.html (due strip, at the top)
//                     └──▶ _site/{id}.html            (status line, coverage log)
//
// index.html and review-schedule.html at the repo root are templates: their marker regions are
// empty in git and only ever filled in the _site/ copy (since 2026-09-23; see copy-sources.mjs).
//
// Usage: node build-progress.mjs        (run after scan-book.mjs)
// BOOK_ROOT env var overrides the repo root for testing.

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.BOOK_ROOT || dirname(__dirname);

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const prettyDate = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
};

const STATUS_LABEL = {
  solid: "solid",
  "needs-review": "needs review",
  ungraded: "written · ungraded",
  unwritten: "not written",
};

// Replace the content between <!-- BUILD-PROGRESS:START name --> and
// <!-- BUILD-PROGRESS:END name -->. Errors loudly if the markers are missing.
function spliceRegion(html, name, body) {
  const start = `<!-- BUILD-PROGRESS:START ${name} -->`;
  const end = `<!-- BUILD-PROGRESS:END ${name} -->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j < i) {
    throw new Error(`markers for "${name}" not found (need ${start} … ${end})`);
  }
  return html.slice(0, i + start.length) + "\n" + body + "\n    " + html.slice(j);
}

// ---------- cadence strip ----------

function renderCadence(cadence) {
  const rendered = cadence.days.slice(-28);
  const cells = rendered
    .map((d) => {
      const label = d.questions ? `${d.date} · ${d.questions} question${d.questions === 1 ? "" : "s"}` : `${d.date} · nothing logged`;
      return `<span class="cadence-cell" data-level="${d.level}" title="${esc(label)}"></span>`;
    })
    .join("");
  const since = cadence.days_since_last == null ? "—" : String(cadence.days_since_last);
  return `<section class="cadence" aria-label="Study cadence">
      <div class="cadence-track">
        <div class="cadence-cells">${cells}</div>
        <p class="cadence-axis"><span>${esc(prettyDate(rendered[0].date))}</span><span>today</span></p>
      </div>
      <div class="cadence-stats">
        <div class="cadence-stat"><p class="cadence-num">${cadence.active_days}</p><p class="cadence-label">active days</p></div>
        <div class="cadence-stat"><p class="cadence-num">${cadence.longest_run}</p><p class="cadence-label">longest run</p></div>
        <div class="cadence-stat cadence-stat--accent"><p class="cadence-num">${esc(since)}</p><p class="cadence-label">since last</p></div>
      </div>
    </section>`;
}

// ---------- next up card ----------

function renderNext(next) {
  if (!next) {
    return `<section class="nextcard" aria-label="Next up"><p class="nextcard-kicker">Next up</p><p class="nextcard-why">Nothing outstanding — every tracked node is solid or ahead of its due date.</p></section>`;
  }
  const rows = next.clauses
    .map((c) => {
      const mark = c.fired ? "→" : String(c.n);
      return `<div class="rule-row"${c.fired ? " data-fired" : ""}>
            <span class="rule-mark">${esc(mark)}</span>
            <span class="rule-text">${esc(c.text)}</span>
          </div>`;
    })
    .join("\n          ");
  return `<section class="nextcard" aria-label="Next up">
      <div class="nextcard-top">
        <div>
          <p class="nextcard-kicker">${esc(next.kicker)}</p>
          <p class="nextcard-title">${esc(next.title)}</p>
          <p class="nextcard-path">${esc(next.path.join("  →  "))}</p>
          <p class="nextcard-why">${esc(next.why)}</p>
        </div>
        <a class="nextcard-open" href="${esc(next.href)}">Open →</a>
      </div>
      <div class="nextcard-rule">
        <p class="nextcard-rule-head">Why this one · the rule, in order</p>
        <div class="rule-list">
          ${rows}
        </div>
      </div>
    </section>`;
}

// ---------- spine ----------

function renderLegend() {
  return ["solid", "needs-review", "ungraded", "unwritten"]
    .map(
      (k) =>
        `<span class="legend-item"><span class="swatch" data-status="${k}"></span>${esc(STATUS_LABEL[k])}</span>`
    )
    .join("\n        ");
}

function renderCell(pair) {
  if (!pair) return `<span class="cell" data-state="none" title="never asked">—</span>`;
  const { right, asked, meetsBar } = pair;
  // Reuses the node tick's own solid/needs-review colors on purpose (see the
  // aggregateTags comment in scan-book.mjs) -- both are now "in good shape
  // right now" signals, just at different grains.
  const state = meetsBar ? "solid" : "needs-review";
  const title = asked < 5
    ? `${right} of last ${asked} correct — fewer than 5 asked, not enough yet to call it`
    : `${right} of last ${asked} correct`;
  return `<span class="cell" data-state="${state}" title="${esc(title)}">${right}/${asked}</span>`;
}

function renderPanel(unit) {
  const rows = unit.nodes
    .map((n) => {
      const t = n.tags || {};
      const titleInner = n.href ? `<a href="${esc(n.href)}">${esc(n.title)}</a>` : esc(n.title);
      return `<div class="panel-row" data-kind="${n.kind}" data-depth="${n.depth || 0}" data-status="${n.status}">
              <div class="panel-row-head">
                <p class="panel-row-title">${titleInner}</p>
                <p class="panel-row-meta">${esc(STATUS_LABEL[n.status] + (n.meta ? " · " + n.meta : ""))}</p>
              </div>
              ${renderCell(t.recall)}
              ${renderCell(t.explain)}
              ${renderCell(t.predict)}
              <span class="stands">${esc(n.stands)}</span>
            </div>`;
    })
    .join("\n            ");
  const foot = unit.footnote ? `\n            <p class="panel-footnote">${esc(unit.footnote)}</p>` : "";
  return `<div class="unit-panel">
            <div class="panel-head">
              <span>section</span><span>recall</span><span>explain</span><span>predict</span><span>where it stands</span>
            </div>
            ${rows}${foot}
          </div>`;
}

function renderUnitSummaryInner(unit, interactive) {
  const caret = interactive ? "▸" : "·";
  const ticks = (unit.nodes
    ? unit.nodes.map((n) => `<span class="tick" data-status="${n.status}" title="${esc(n.title + " · " + STATUS_LABEL[n.status])}"></span>`)
    : Array.from({ length: unit.blank || 0 }, () => `<span class="tick" data-status="unwritten" title="not written yet"></span>`)
  ).join("");
  const openLink = unit.href ? `\n            <a class="unit-open" href="${esc(unit.href)}">Open page →</a>` : "";
  return `<span class="unit-ord">${esc(unit.ord)}</span>
          <span class="unit-caret">${caret}</span>
          <span class="unit-headtext">
            <span class="unit-title">${esc(unit.title)}</span>
            <span class="unit-note">${esc(unit.note || "")}</span>${openLink}
          </span>
          <span class="unit-ticks">${ticks}</span>
          <span class="unit-count">${esc(unit.count || "—")}</span>`;
}

function renderUnit(unit) {
  const hasRows = Array.isArray(unit.nodes) && unit.nodes.length > 0;
  if (!hasRows) {
    return `<div class="unit" data-inert data-empty>
          <div class="unit-summary">
          ${renderUnitSummaryInner(unit, false)}
          </div>
        </div>`;
  }
  const openAttr = unit.here ? " open" : "";
  const hereAttr = unit.here ? " data-here" : "";
  return `<details class="unit"${openAttr}${hereAttr}>
          <summary class="unit-summary">
          ${renderUnitSummaryInner(unit, true)}
          </summary>
          ${renderPanel(unit)}
        </details>`;
}

function renderSpine(data) {
  const groups = data.spine
    .map((g) => {
      const units = g.units.map(renderUnit).join("\n        ");
      return `<div class="spine-group">
        <div class="spine-group-head"><h3>${esc(g.name)}</h3><span>${esc(g.meta)}</span></div>
        ${units}
      </div>`;
    })
    .join("\n      ");
  return `<section class="spine" aria-label="The spine">
      <div class="spine-head">
        <h2>The spine</h2>
        <span class="pv-section-note">study-path order · click to open</span>
      </div>
      <div class="legend">
        ${renderLegend()}
      </div>
      ${groups}
      <p class="spine-provenance">${esc(data.provenance)}</p>
    </section>`;
}

// ---------- home page body ----------

function renderHome(data) {
  return `<section class="pv-hero">
      <p class="pv-kicker">software engineering · book</p>
      <h1>What I know, in the order I'm learning it</h1>
    </section>

    ${renderCadence(data.cadence)}

    ${renderNext(data.next)}
${renderEditorQueue(data)}
    ${renderSpine(data)}`;
}

// ---- prose waiting for swe-editor (added 2026-09-27) ----
// Events that no page has absorbed yet: new topics with no page at all (a proposed node from an
// inbox draft), and pages whose .md is behind the log. Renders nothing when the book is caught up.
function renderEditorQueue(data) {
  const ids = (list) => list.map((id) => "#" + id).join(", ");
  const items = [];
  for (const u of data.prose_unplaced || []) {
    items.push(`<li>New topic, no page yet: <strong>${esc(u.title || u.node_id)}</strong> <code>${esc(u.node_id)}</code> — ${u.events.length} event${u.events.length > 1 ? "s" : ""} (${esc(ids(u.events))})</li>`);
  }
  for (const [file, p] of Object.entries(data.pages || {})) {
    const b = p.prose?.backlog || [];
    if (!b.length) continue;
    const title = p.rows?.[0]?.title || file;
    items.push(`<li><a href="${esc(file)}">${esc(title)}</a>: ${b.length} event${b.length > 1 ? "s" : ""} not yet written up (${esc(ids(b))})</li>`);
  }
  if (!items.length) return "";
  return `
    <div class="callout">
      <strong>Waiting for the editor.</strong> These are logged and scored, but not yet in the prose. Run swe-editor ("update the book") to write them up.
      <ul>
        ${items.join("\n        ")}
      </ul>
    </div>
`;
}

// ---------- review-schedule due strip ----------

function renderDueStrip(data) {
  const due = data.due;
  const offsets = due.scheduled.map((s) => s.offset_days);
  const back = Math.max(7, offsets.length ? -Math.min(...offsets, 0) : 7);
  const fwd = Math.max(14, offsets.length ? Math.max(...offsets, 0) : 14);
  const span = back + fwd;
  const pct = (n) => (((n + back) / span) * 100).toFixed(2) + "%";

  // Every pin gets its own 30px lane; its label grows rightward from the dot so
  // wide labels can't collide. Upcoming pins ride above the axis, overdue below
  // with the connector running up to it.
  const AXIS = 100;
  const LANE = 30;
  const lane = (list, dir) =>
    list.map((p, i) => {
      const top = AXIS + dir * (14 + i * LANE);
      const stem = Math.max(Math.abs(AXIS - top) - 4, 0);
      const stemTop = dir < 0 ? 4 : -(stem + 4);
      return { ...p, top, stem, stemTop };
    });

  const upcoming = lane(
    due.scheduled.filter((s) => s.offset_days >= 0).sort((a, b) => a.offset_days - b.offset_days),
    -1
  );
  const overdue = lane(
    due.scheduled.filter((s) => s.offset_days < 0).sort((a, b) => b.offset_days - a.offset_days),
    1
  );

  // Grow the plot to fit every overdue lane (the CSS default of 210px holds 3);
  // without this, a 4th+ overdue pin hangs out of the card.
  const lastTop = overdue.length ? overdue[overdue.length - 1].top : AXIS;
  const plotHeight = Math.max(210, lastTop + 56);

  const pinHtml = [...upcoming, ...overdue]
    .map((p) => {
      const late = p.offset_days < 0;
      const when = late
        ? `${Math.abs(p.offset_days)}d overdue`
        : p.offset_days === 0
        ? "due today"
        : `in ${p.offset_days}d`;
      return `<div class="due-pin" data-status="${p.status}"${late ? " data-late" : ""} style="left:${pct(
        p.offset_days
      )};top:${p.top}px;">
            <span class="due-stem" style="height:${p.stem}px;top:${p.stemTop}px;"></span>
            <span class="due-dot"></span>
            <span class="due-label"><span class="due-label-title">${esc(p.title)}</span><span class="due-label-when">${esc(
        when
      )}</span></span>
          </div>`;
    })
    .join("\n          ");

  const unscheduled = due.unscheduled
    .map(
      (u) =>
        `<li><span class="due-unscheduled-title">${esc(u.title)}</span><span class="due-unscheduled-last">${esc(
          u.last
        )}</span></li>`
    )
    .join("\n            ");

  const axisStart = prettyDate(shiftIso(data.today, -back));
  const axisEnd = prettyDate(shiftIso(data.today, fwd));

  return `<section class="duestrip" aria-label="Review debt">
      <div class="duestrip-head">
        <h2>Review debt</h2>
        <span class="pv-section-note">3 / 7 / 14 / 30 / 60 intervals</span>
      </div>
      <p class="duestrip-lead">Scheduled nodes sit on the axis. Overdue ones hang below the line — the drop is the debt, and it only clears by answering.</p>
      <div class="duestrip-card">
        <div class="due-plot" style="height:${plotHeight}px;">
          <div class="due-axis-line"></div>
          <div class="due-today" style="left:${pct(0)};"></div>
          <span class="due-today-label" style="left:${pct(0)};">today</span>
          ${pinHtml}
          <div class="due-axis-labels"><span>${esc(axisStart)}</span><span>${esc(axisEnd)}</span></div>
        </div>
      </div>
      <div class="due-lists">
        <div class="due-unscheduled">
          <p class="due-unscheduled-head">Unscheduled · answer to schedule</p>
          <ul>
            ${unscheduled}
          </ul>
        </div>
        <div class="due-advice">
          <p class="due-advice-head">Clearing it</p>
          <p>${esc(due.advice)}</p>
        </div>
      </div>
    </section>`;
}

// ---- topic pages: generated status line + coverage log (added 2026-09-22) ----
const STATUS_CLASS = (r) => (r.status === "solid" ? "status-solid" : r.overdue ? "status-overdue" : "status-upcoming");
const dueText = (due, today) => {
  if (!due) return "not scheduled";
  const off = Math.round((Date.parse(due + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  return off < 0 ? `${due} · ${-off}d overdue` : off === 0 ? `${due} · today` : `${due} · in ${off}d`;
};

function renderPageStatus(p, today) {
  const s = p.summary;
  let lead;
  if (p.rows.length === 1) {
    const r = p.rows[0];
    lead = `<span class="${STATUS_CLASS(r)}">${esc(STATUS_LABEL[r.status] || r.status)}</span>` +
      (r.due ? ` · next review ${esc(dueText(r.due, today))}` : "");
  } else {
    lead = `<span class="${s.solid === s.total ? "status-solid" : s.overdue ? "status-overdue" : "status-upcoming"}">${s.solid} of ${s.total} solid</span>` +
      (s.overdue ? ` · ${s.overdue} overdue` : "");
  }
  const b = p.prose?.backlog || [];
  const behind = b.length
    ? ` · <span class="status-upcoming">${b.length} event${b.length > 1 ? "s" : ""} not yet written up (${b.map((id) => "#" + id).join(", ")})</span>`
    : "";
  return `  <p class="subtitle">Status: ${lead}${s.last_covered ? ` · last covered ${esc(s.last_covered)}` : ""}${behind} · computed from the event log</p>`;
}

function renderPageCoverage(p, today) {
  const cell = (r) => (r.anchor ? `<a href="${esc(r.anchor)}">${esc(r.title)}</a>` : esc(r.title));
  const rows = p.rows
    .map(
      (r) => `      <tr><td>${cell(r)}</td><td>${esc(r.last_taught || "—")}</td><td>${esc(r.last_quizzed ? `${r.last_quizzed} (${r.last_result})` : "—")}</td><td>${r.streak}${r.reset ? " (reset)" : ""}</td><td>${esc(dueText(r.due, today))}</td><td><span class="${STATUS_CLASS(r)}">${esc(STATUS_LABEL[r.status] || r.status)}</span></td></tr>`
    )
    .join("\n");
  const hist = p.history
    .map((h) => {
      const what = h.verb === "taught" ? `Taught${h.depth ? ` (${h.depth})` : ""}` : h.verb === "read" ? "Read" : `Quiz ${h.result}`;
      const gaps = h.gaps.length ? h.gaps.map((g) => esc(g)).join("<br>") : "";
      return `        <tr><td>${esc(h.date)}</td><td>${cell(h)}</td><td>${esc(what)}</td><td>${gaps}</td></tr>`;
    })
    .join("\n");
  return `  <p>Each row is one topic on this page. The review streak sets the gap before the next review (1 → 3 days, 2 → 7, 3 → 14, 4 → 30, 5+ → 60); a review with any wrong answer resets it to 1, so a missed topic comes back 3 days after that review.</p>
  <div class="table-scroll">
    <table>
      <tr><th>Topic</th><th>Last taught</th><th>Last quizzed</th><th>Review streak</th><th>Next review</th><th>Status</th></tr>
${rows}
    </table>
  </div>
  <details>
    <summary>Session history (${p.history.length} events)</summary>
    <div class="table-scroll">
      <table>
        <tr><th>Date</th><th>Topic</th><th>Event</th><th>Gaps noted</th></tr>
${hist}
      </table>
    </div>
  </details>`;
}

function shiftIso(baseStr, n) {
  const d = new Date(baseStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------- main ----------

function main() {
  const data = JSON.parse(readFileSync(join(ROOT, "progress-data.json"), "utf8"));

  const targets = [
    { file: "index.html", name: "home", body: renderHome(data) },
    { file: "review-schedule.html", name: "duestrip", body: renderDueStrip(data) },
  ];
  for (const [file, p] of Object.entries(data.pages || {})) {
    targets.push({ file, name: "page-status", body: renderPageStatus(p, data.today) });
    targets.push({ file, name: "page-coverage", body: renderPageCoverage(p, data.today) });
  }

  // index.html and review-schedule.html are templates at the repo root (sources, committed);
  // topic pages were just written into _site/ by render-pages.mjs. Either way the filled page
  // goes to _site/ — nothing in the repo root is rewritten.
  const TEMPLATES = new Set(["index.html", "review-schedule.html"]);
  for (const t of targets) {
    const outPath = join(ROOT, "_site", t.file);
    const inPath = TEMPLATES.has(t.file) ? join(ROOT, t.file) : outPath;
    const before = readFileSync(inPath, "utf8");
    const after = spliceRegion(before, t.name, t.body);
    writeFileSync(outPath, after);
    console.log(`  _site/${t.file} — filled "${t.name}" region`);
  }
}

main();
