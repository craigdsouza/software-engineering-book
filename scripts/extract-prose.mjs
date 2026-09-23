#!/usr/bin/env node
// extract-prose.mjs — one-off migration (2026-09-23): pulls the hand-written prose out of each
// topic page into {id}.md, so render-pages.mjs can own the .html from then on.
// Takes: everything between the page-status region and the "Coverage log" heading (body prose),
// plus the list inside <div class="related"> (becomes a trailing "## Related pages" section).
// Refuses to overwrite an existing .md. Kept for the record, like migrate-to-v1.mjs.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

function inline(h, inTable = false) {
  let s = h.replace(/\s+/g, " ").trim();
  const codes = [];
  s = s.replace(/<code>(.*?)<\/code>/g, (_, c) => `\u0000${codes.push("`" + decode(c) + "`") - 1}\u0000`);
  if (/[`*\[\]\\]/.test(decode(s.replace(/<[^>]+>/g, "")))) {
    s = s.replace(/([`*\[\]\\])/g, "\\$1"); // escape md-special chars in plain text
  }
  s = s.replace(/<strong>(.*?)<\/strong>/g, "**$1**").replace(/<em>(.*?)<\/em>/g, "*$1*");
  s = s.replace(/<a href="([^"]*)">(.*?)<\/a>/g, (_, href, t) => `[${t}](${decode(href)})`);
  if (/<[a-z\/]/i.test(s)) throw new Error("unhandled inline tag: " + s.match(/<[^>]+>/)[0]);
  s = decode(s);
  if (inTable) s = s.replace(/\|/g, "\\|");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

function blocks(region) {
  const out = [];
  let s = region.trim();
  const take = (re) => { const m = s.match(re); if (m) s = s.slice(m[0].length).trimStart(); return m; };
  while (s) {
    let m;
    if ((m = take(/^<h([23])(?: id="([^"]+)")?>([\s\S]*?)<\/h\1>/))) out.push(`${"#".repeat(+m[1])} ${inline(m[3])}${m[2] ? ` {#${m[2]}}` : ""}`);
    else if ((m = take(/^<p>([\s\S]*?)<\/p>/))) out.push(inline(m[1]));
    else if ((m = take(/^<pre>([\s\S]*?)<\/pre>/))) out.push("```\n" + decode(m[1]) + "\n```");
    else if ((m = take(/^<ul>([\s\S]*?)<\/ul>/))) out.push([...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => "- " + inline(x[1])).join("\n"));
    else if ((m = take(/^<div class="callout">([\s\S]*?)<\/div>/))) {
      const inner = m[1].trim();
      const paras = inner.startsWith("<p>") ? [...inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => inline(x[1])) : [inline(inner)];
      out.push(":::callout\n" + paras.join("\n\n") + "\n:::");
    } else if ((m = take(/^<div class="table-scroll">\s*<table>([\s\S]*?)<\/table>\s*<\/div>/))) {
      const rows = [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((c) => inline(c[1], true)));
      const line = (r) => "| " + r.join(" | ") + " |";
      out.push([line(rows[0]), "|" + rows[0].map(() => "---").join("|") + "|", ...rows.slice(1).map(line)].join("\n"));
    } else throw new Error("unhandled block: " + s.slice(0, 120));
  }
  return out.join("\n\n");
}

const reg = JSON.parse(readFileSync(join(ROOT, "nodes.json"), "utf8"));
for (const n of reg.nodes.filter((n) => n.page && !n.page.includes("#"))) {
  const mdPath = join(ROOT, n.page.replace(/\.html$/, ".md"));
  if (existsSync(mdPath)) { console.log(`  ${n.page} — .md exists, skipped`); continue; }
  const html = readFileSync(join(ROOT, n.page), "utf8");
  const body = html.split("<!-- BUILD-PROGRESS:END page-status -->")[1].split("<h2>Coverage log")[0];
  const rel = html.match(/<div class="related">\s*<h2>Related pages<\/h2>([\s\S]*?)<\/div>\s*<\/main>/);
  let md = blocks(body);
  if (rel) md += "\n\n## Related pages\n\n" + blocks(rel[1]);
  writeFileSync(mdPath, md + "\n");
  console.log(`  ${n.page} → ${n.page.replace(/\.html$/, ".md")}`);
}
