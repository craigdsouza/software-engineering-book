#!/usr/bin/env node
// validate-events.mjs — checks an events file against the v1 schema and nodes.json.
// Usage: node scripts/validate-events.mjs [events.json]. Exits 1 on any error.
// The rules live in scripts/lib/event-rules.mjs, shared with ingest-inbox.mjs and log.html.
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkEvent } from "./lib/event-rules.mjs";

const ROOT = process.env.BOOK_ROOT || dirname(dirname(fileURLToPath(import.meta.url)));
const file = process.argv[2] || "events.json";
const events = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
const nodeIds = new Set(JSON.parse(readFileSync(join(ROOT, "nodes.json"), "utf8")).nodes.map((n) => n.id));

const state = { lastId: 0, gapIds: new Set() };
const errors = events.flatMap((ev) => checkEvent(ev, nodeIds, state));
if (errors.length) { console.error(errors.join("\n")); console.error(`\n${errors.length} error(s) in ${file}`); process.exit(1); }
console.log(`${file}: ${events.length} events valid against schema 1 and ${nodeIds.size} nodes`);
