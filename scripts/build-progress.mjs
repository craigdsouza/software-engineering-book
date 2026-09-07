#!/usr/bin/env node
// build-progress.mjs — renders the derived progress views into the site.
//
// Reads ONLY progress-data.json (emitted by scan-book.mjs). It never re-derives
// status and never reads events.json — every number and sentence on the page is
// already composed upstream. This file is pure presentation: it turns the view
// data into static HTML and splices it between marker comments in two pages.
//
//   progress-data.json ──▶ index.html          (cadence · next up · spine)
//                     └──▶ review-schedule.html (due strip, at the top)
//
// Idempotent: re-running with an unchanged progress-data.json rewrites the same
// bytes between the markers, so the pages only change when the data does.
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
  fresh: "fresh",
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
  return ["solid", "fresh", "needs-review", "ungraded", "unwritten"]
    .map(
      (k) =>
        `<span class="legend-item"><span class="swatch" data-status="${k}"></span>${esc(STATUS_LABEL[k])}</span>`
    )
    .join("\n        ");
}

function renderCell(pair) {
  if (!pair) return `<span class="cell" data-state="none" title="never asked">—</span>`;
  const [right, asked] = pair;
  const state = right === asked ? "all" : "partial";
  return `<span class="cell" data-state="${state}" title="${right} of ${asked} correct">${right}/${asked}</span>`;
}

function renderPanel(unit) {
  const rows = unit.nodes
    .map((n) => {
      const t = n.tags || {};
      return `<div class="panel-row" data-kind="${n.kind}" data-depth="${n.depth || 0}" data-status="${n.status}">
              <div class="panel-row-head">
                <p class="panel-row-title">${esc(n.title)}</p>
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
  return `<span class="unit-ord">${esc(unit.ord)}</span>
          <span class="unit-caret">${caret}</span>
          <span class="unit-headtext">
            <span class="unit-title">${esc(unit.title)}</span>
            <span class="unit-note">${esc(unit.note || "")}</span>
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
        <span class="pv-section-note">curriculum order · click to open</span>
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

    ${renderSpine(data)}`;
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
        <div class="due-plot">
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

  for (const t of targets) {
    const path = join(ROOT, t.file);
    const before = readFileSync(path, "utf8");
    const after = spliceRegion(before, t.name, t.body);
    if (after === before) {
      console.log(`  ${t.file} — unchanged`);
    } else {
      writeFileSync(path, after);
      console.log(`  ${t.file} — rewrote "${t.name}" region`);
    }
  }
}

main();
