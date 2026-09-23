#!/usr/bin/env node
// render-pages.mjs — builds every topic page ({id}.html) from its prose file ({id}.md).
//
// A topic page has three kinds of content:
//   1. the shell — <head>, site header/nav, breadcrumb, <h1>, footer. Generated here from nodes.json.
//   2. the prose — everything hand-written about the topic. Lives in {id}.md, next to the .html.
//   3. the progress regions (page-status, page-coverage) — filled by build-progress.mjs.
// This script writes 1 + 2 and carries 3 over untouched from the existing .html, so it is safe
// to run on its own; rebuild.mjs runs build-progress.mjs right after it anyway.
//
// Nobody edits a topic .html by hand any more. Edit the .md, then `node scripts/rebuild.mjs`.
// The markdown subset is documented in docs/prose-format.md. It is deliberately small and strict:
// no raw HTML, so prose can never break the page layout.
//
// Usage: node scripts/render-pages.mjs            (all page nodes)
//        node scripts/render-pages.mjs --check    (exit 1 if any page would change; writes nothing)

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, relative, posix } from "path";
import { fileURLToPath } from "url";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const REGIONS = ["page-status", "page-coverage"];

// ---------- markdown subset → HTML ----------

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

// Inline: `code`, **strong**, *em*, [text](href). Backslash escapes \* \` \[ \] \| \\.
export function renderInline(src) {
  const out = [];
  const stash = (html) => `\u0000${out.push(html) - 1}\u0000`;
  let s = src.replace(/\\([\\`*\[\]|_])/g, (_, c) => stash(esc(c)));
  s = s.replace(/`([^`]+)`/g, (_, c) => stash(`<code>${esc(c)}</code>`));
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => stash(`<a href="${escAttr(h.replace(/&amp;/g, "&"))}">${t}</a>`));
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // links may contain strong/em in their text; stashed links were built before those ran, so
  // format inside them now.
  const fmt = (x) => x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  let prev;
  do { prev = s; s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => (out[i].startsWith("<a ") ? fmt(out[i]) : out[i])); } while (s !== prev);
  return s;
}

function renderTable(lines, ind) {
  const cells = (l) => {
    const parts = []; let cur = ""; 
    const body = l.trim().replace(/^\|/, "").replace(/\|$/, "");
    for (let i = 0; i < body.length; i++) {
      if (body[i] === "\\" && body[i + 1] === "|") { cur += "\\|"; i++; continue; }
      if (body[i] === "|") { parts.push(cur.trim()); cur = ""; continue; }
      cur += body[i];
    }
    parts.push(cur.trim());
    return parts;
  };
  const head = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  const tr = (cs, tag) => `${ind}  <tr>${cs.map((c) => `<${tag}>${renderInline(c)}</${tag}>`).join("")}</tr>`;
  return [`${ind}<div class="table-scroll">`, `${ind}<table>`, tr(head, "th"), ...rows.map((r) => tr(r, "td")), `${ind}</table>`, `${ind}</div>`].join("\n");
}

// Blocks: ## / ### headings (optional {#anchor}), paragraphs, "- " lists, ``` fences (→ <pre>),
// pipe tables, and :::callout … ::: boxes. Blank lines separate blocks.
export function renderBlocks(md, ind = "  ") {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  const isStart = (l) => /^(#{2,3} |- |```|:::|\|)/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,3}) (.*?)(?:\s+\{#([\w-]+)\})?\s*$/))) {
      const tag = `h${m[1].length}`;
      html.push(`${ind}<${tag}${m[3] ? ` id="${m[3]}"` : ""}>${renderInline(m[2])}</${tag}>`);
      i++;
    } else if (l.startsWith("```")) {
      const body = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      if (i >= lines.length) throw new Error("unclosed ``` fence");
      i++;
      html.push(`${ind}<pre>${esc(body.join("\n"))}</pre>`);
    } else if (/^:::callout\s*$/.test(l)) {
      const body = []; i++;
      while (i < lines.length && lines[i].trim() !== ":::") body.push(lines[i++]);
      if (i >= lines.length) throw new Error("unclosed :::callout");
      i++;
      const paras = body.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const inner = paras.length === 1
        ? `${ind}  ${renderInline(paras[0].replace(/\n/g, " "))}`
        : paras.map((p) => `${ind}  <p>${renderInline(p.replace(/\n/g, " "))}</p>`).join("\n");
      html.push(`${ind}<div class="callout">\n${inner}\n${ind}</div>`);
    } else if (l.startsWith(":::")) {
      throw new Error(`unknown block "${l.trim()}" (only :::callout exists)`);
    } else if (l.startsWith("- ")) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith("- ") || (lines[i].startsWith("  ") && lines[i].trim()))) {
        if (lines[i].startsWith("- ")) items.push(lines[i].slice(2)); else items[items.length - 1] += " " + lines[i].trim();
        i++;
      }
      html.push(`${ind}<ul>\n${items.map((t) => `${ind}  <li>${renderInline(t)}</li>`).join("\n")}\n${ind}</ul>`);
    } else if (l.startsWith("|")) {
      const t = [];
      while (i < lines.length && lines[i].startsWith("|")) t.push(lines[i++]);
      if (t.length < 2 || !/^\|[\s|:-]+\|?\s*$/.test(t[1])) throw new Error(`table needs a |---| separator row: ${t[0]}`);
      html.push(renderTable(t, ind));
    } else {
      const p = [];
      while (i < lines.length && lines[i].trim() && !isStart(lines[i])) p.push(lines[i++].trim());
      const text = p.join(" ");
      if (/<[a-z/!]/i.test(text.replace(/`[^`]+`/g, ""))) throw new Error(`raw HTML is not allowed in prose: ${text.slice(0, 80)}`);
      html.push(`${ind}<p>${renderInline(text)}</p>`);
    }
  }
  return html.join("\n\n");
}

// ---------- front matter ----------
// Each .md opens with a tiny front matter block the editor maintains:
//   ---
//   prose_through: 86
//   ---
// prose_through = the highest event id whose content has been written into this prose. Events for
// this page with a higher id are the editor's backlog (scan-book.mjs computes it; the page's
// status line shows it). Only integer `key: value` lines are allowed.
export function parseFrontMatter(md) {
  const m = md.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error("missing front matter (need ---\\nprose_through: N\\n--- at the top)");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(\d+)\s*$/);
    if (!kv) throw new Error(`bad front matter line "${line}"`);
    meta[kv[1]] = Number(kv[2]);
  }
  if (!Number.isInteger(meta.prose_through)) throw new Error("front matter needs prose_through: <event id>");
  return { meta, body: md.replace(/\r\n/g, "\n").slice(m[0].length) };
}

// ---------- page shell ----------

function loadPages() {
  const reg = JSON.parse(readFileSync(join(ROOT, "nodes.json"), "utf8"));
  const byId = new Map(reg.nodes.map((n) => [n.id, n]));
  const pages = reg.nodes.filter((n) => n.page && !n.page.includes("#"));
  return { byId, pages };
}

function breadcrumb(node, byId, rel) {
  const segs = node.id.split("/");
  const parts = [`<a href="${rel("index.html")}">Home</a>`];
  for (let k = 1; k < segs.length; k++) {
    const a = byId.get(segs.slice(0, k).join("/"));
    if (!a) continue;
    parts.push(a.page && !a.page.includes("#") ? `<a href="${rel(a.page)}">${esc(a.title)}</a>` : esc(a.title));
  }
  parts.push(esc(node.title));
  return parts.join(" / ");
}

function existingRegion(html, name) {
  const s = `<!-- BUILD-PROGRESS:START ${name} -->`, e = `<!-- BUILD-PROGRESS:END ${name} -->`;
  const i = html.indexOf(s), j = html.indexOf(e);
  return i !== -1 && j > i ? html.slice(i + s.length, j) : "\n    ";
}

export function renderPage(node, rawMd, byId, oldHtml = "") {
  const { body: md } = parseFrontMatter(rawMd);
  // every section node that lives on this page needs its {#anchor} heading in the prose
  for (const n of byId.values()) {
    if (!n.page || !n.page.startsWith(node.page + "#")) continue;
    const a = n.page.split("#")[1];
    if (!new RegExp(`^#{2,3} .*\\{#${a}\\}\\s*$`, "m").test(md)) throw new Error(`no heading with {#${a}} for section node ${n.id}`);
  }
  const dir = posix.dirname(node.page);
  const rel = (p) => posix.relative(dir, p) || posix.basename(p);
  const [body, related] = md.split(/^## Related pages\s*$/m);
  const region = (n) => `<!-- BUILD-PROGRESS:START ${n} -->${existingRegion(oldHtml, n)}<!-- BUILD-PROGRESS:END ${n} -->`;
  const nav = [["index.html", "Home"], ["review-schedule.html", "Review Schedule"], ["activity.html", "Activity"],
    ["about/teaching-style.html", "Teaching Style"], ["about/architecture.html", "Architecture"]]
    .map(([h, t]) => `      <a href="${rel(h)}">${t}</a>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(node.title)} — Software Engineering Book</title>
<link rel="stylesheet" href="${rel("style.css")}">
</head>
<body>
<!-- GENERATED by scripts/render-pages.mjs from ${posix.basename(node.page, ".html")}.md — do not edit this file; edit the .md -->
<header class="site-header">
  <div class="inner">
    <a class="brand" href="${rel("index.html")}">Software Engineering — A Study Book</a>
    <nav class="tracks">
${nav}
    </nav>
  </div>
</header>

<main>
  <div class="breadcrumb">${breadcrumb(node, byId, rel)}</div>
  <h1>${esc(node.title)}</h1>
  ${region("page-status")}

${renderBlocks(body.trim())}

  <h2>Coverage log (spaced repetition)</h2>
  ${region("page-coverage")}
${related && related.trim() ? `
  <div class="related">
    <h2>Related pages</h2>
${renderBlocks(related.trim(), "    ")}
  </div>
` : ""}</main>
<footer class="site-footer">Built topic by topic. Depth over completion.</footer>
</body>
</html>
`;
}

function main() {
  const check = process.argv.includes("--check");
  const { byId, pages } = loadPages();
  let failed = false, stale = 0;
  for (const node of pages) {
    const mdPath = join(ROOT, node.page.replace(/\.html$/, ".md"));
    const htmlPath = join(ROOT, node.page);
    if (!existsSync(mdPath)) { console.error(`  ${node.id} — missing prose file ${relative(ROOT, mdPath)}`); failed = true; continue; }
    const old = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
    let html;
    try { html = renderPage(node, readFileSync(mdPath, "utf8"), byId, old); }
    catch (e) { console.error(`  ${relative(ROOT, mdPath)} — ${e.message}`); failed = true; continue; }
    if (html === old) console.log(`  ${node.page} — unchanged`);
    else if (check) { console.log(`  ${node.page} — would change`); stale++; }
    else { writeFileSync(htmlPath, html); console.log(`  ${node.page} — rendered from .md`); }
  }
  if (failed || (check && stale)) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("render-pages.mjs")) main();
