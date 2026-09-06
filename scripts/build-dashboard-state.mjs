#!/usr/bin/env node
// build-dashboard-state.mjs — computes the life-os dashboard's "Knowledge"
// and "Courses" card state from this repo's own event logs, and writes it as
// a plain script (dashboard-state.js, same window-global convention as
// life-os's own graph-data.js) so the life-os dashboard can read it live off
// disk without any computation happening on the life-os side.
//
// Added 2026-09-05 as part of moving all CS/SWE dashboard-state computation
// out of life-os/scripts/scan-vault.mjs and into this repo. Ported directly
// from scan-vault.mjs's buildLearningActivity/buildQuizActivity/
// buildCourseActivity — same logic, same output shape the viewer pages
// already expect, just sourced and computed here instead.
//
// events.json is still the SHARED learning-event log across both this book
// (book:-namespaced events) and life-os's non-CS/SWE vault teaching
// (concept:-namespaced events) — see life-os/docs/book-graph-migration-spec.md.
// Per the 2026-09-05 decision, this script keeps that file shared as-is and
// simply filters to book: events when computing Knowledge-card stats, so
// vault-teaching activity (concept:) no longer shows up on that card. It was
// never filtered before; if that's ever wrong, this is the line to revisit.
//
// Usage: node build-dashboard-state.mjs
// Writes dashboard-state.js into this repo's root. BOOK_ROOT env var
// overrides the root for testing.

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findBookRoot() {
  if (process.env.BOOK_ROOT) return process.env.BOOK_ROOT;
  return dirname(__dirname);
}

// ---------- shared helpers ----------

function eventDay(ev) {
  if (ev.payload?.date) return ev.payload.date;
  const d = new Date(ev.ts);
  return isNaN(d) ? null : d.toLocaleDateString("en-CA");
}

// book:foundations/data-structures#hash-tables -> foundations/data-structures#hash-tables
function learningTopic(ev) {
  if (ev.node_id) return ev.node_id.replace(/^(book:|concept:)/, "");
  return ev.payload?.concept_title || ev.payload?.concept_slug || null;
}

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const dateMs = (k) => new Date(k + "T00:00:00").getTime();

// ---------- events.json, filtered to this book's own (book:) events ----------

function loadBookLearningEvents(root) {
  let all = [];
  try {
    all = JSON.parse(readFileSync(join(root, "events.json"), "utf8"));
  } catch {
    return [];
  }
  return Array.isArray(all) ? all.filter((e) => String(e.node_id || "").startsWith("book:")) : [];
}

// ---------- Knowledge card: mission-chip numbers ----------

function buildQuizActivity(events) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => e.verb === "quiz_answered" && new Date(e.ts).getTime() >= cutoff);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const quizesToday = events.filter((e) => e.verb === "quiz_answered" && eventDay(e) === todayStr).length;
  const conceptsTaughtToday = events.filter((e) => e.verb === "taught" && eventDay(e) === todayStr).length;
  return {
    quizCount: recent.length,
    conceptsQuizzed: new Set(recent.map((e) => e.node_id)).size,
    quizesToday,
    conceptsTaughtToday,
  };
}

// ---------- Knowledge card: full GitHub-style grid + topic rollup ----------

function buildLearningActivity(events) {
  const quizzes = events.filter((e) => e.verb === "quiz_answered");
  const taught = events.filter((e) => e.verb === "taught");

  const asked = (p = {}) => num(p.questions_asked) || (num(p.correct) + num(p.wrong));

  const days = {};
  for (const e of quizzes) {
    const k = eventDay(e);
    if (!k) continue;
    const d = days[k] || (days[k] = { correct: 0, asked: 0, wrong: 0, sessions: 0, topics: [] });
    d.correct += num(e.payload?.correct);
    d.wrong += num(e.payload?.wrong);
    d.asked += asked(e.payload);
    d.sessions += 1;
    const t = learningTopic(e);
    if (t && !d.topics.includes(t)) d.topics.push(t);
  }

  const topics = {};
  const topicOf = (e) => {
    const t = learningTopic(e);
    if (!t) return null;
    return topics[t] || (topics[t] = { topic: t, sessions: 0, correct: 0, asked: 0, lastStudied: null, lastTaught: null, lastGaps: [] });
  };
  for (const e of quizzes) {
    const r = topicOf(e);
    if (!r) continue;
    r.sessions += 1;
    r.correct += num(e.payload?.correct);
    r.asked += asked(e.payload);
    if (!r.lastStudied || e.ts > r.lastStudied) {
      r.lastStudied = e.ts;
      r.lastGaps = Array.isArray(e.payload?.gaps) ? e.payload.gaps : [];
    }
  }
  for (const e of taught) {
    const r = topicOf(e);
    if (!r) continue;
    if (!r.lastTaught || e.ts > r.lastTaught) r.lastTaught = e.ts;
  }

  const recentSessions = quizzes
    .slice()
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    .slice(0, 40)
    .map((e) => ({
      ts: e.ts,
      date: eventDay(e),
      topic: learningTopic(e),
      correct: num(e.payload?.correct),
      asked: asked(e.payload),
      gap: (Array.isArray(e.payload?.gaps) && e.payload.gaps[0]) || null,
    }));

  const allTopics = Object.values(topics);
  const studiedTopics = allTopics.filter((t) => t.sessions > 0).sort((a, b) => (b.lastStudied || "").localeCompare(a.lastStudied || ""));

  const todayStr = new Date().toLocaleDateString("en-CA");
  return {
    days,
    topics: studiedTopics,
    taughtNotQuizzed: allTopics.filter((t) => t.sessions === 0).length,
    recentSessions,
    quizzesToday: quizzes.filter((e) => eventDay(e) === todayStr).length,
    taughtToday: taught.filter((e) => eventDay(e) === todayStr).length,
    correctToday: days[todayStr]?.correct ?? 0,
    askedToday: days[todayStr]?.asked ?? 0,
    totalCorrect: quizzes.reduce((s, e) => s + num(e.payload?.correct), 0),
    totalAsked: quizzes.reduce((s, e) => s + asked(e.payload), 0),
    totalSessions: quizzes.length,
  };
}

// ---------- Courses card: OpenEDG / Edube progress (unrelated to book:/concept:, no filtering needed) ----------

function loadCourseEvents(root) {
  try {
    const arr = JSON.parse(readFileSync(join(root, "course-events.json"), "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function buildCourseActivity(root) {
  const events = loadCourseEvents(root);
  const empty = { courses: [], days: {}, recent: [], sectionsToday: 0, progressedToday: false, totalSections: 0, lastDate: null, daysSince: null, streak: 0 };
  if (!events.length) return empty;

  const PROGRESS = new Set(["section_done", "quiz_passed"]);
  const dayOf = (e) => e.payload?.date || (isNaN(new Date(e.ts)) ? null : new Date(e.ts).toLocaleDateString("en-CA"));
  const todayStr = new Date().toLocaleDateString("en-CA");

  const days = {};
  for (const e of events) {
    if (!PROGRESS.has(e.verb)) continue;
    const k = dayOf(e);
    if (!k) continue;
    const d = days[k] || (days[k] = { sections: 0, courses: [] });
    d.sections += 1;
    if (e.course && !d.courses.includes(e.course)) d.courses.push(e.course);
  }

  const streakEndingToday = (hasDay) => {
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    let s = 0;
    if (!hasDay(cur.toLocaleDateString("en-CA"))) cur.setDate(cur.getDate() - 1);
    while (hasDay(cur.toLocaleDateString("en-CA"))) {
      s++;
      cur.setDate(cur.getDate() - 1);
    }
    return s;
  };

  const byCourse = {};
  for (const e of events) {
    const c = e.course;
    if (!c) continue;
    const r = byCourse[c] || (byCourse[c] = { code: c, title: c, pct: 0, module: null, lastSection: null, lastTs: "", lastDate: null, sectionsDone: 0, sectionsTotal: 0, completed: false });
    if (e.payload?.course_title) r.title = e.payload.course_title;
    if (PROGRESS.has(e.verb) && (!r.lastTs || e.ts > r.lastTs)) {
      r.lastTs = e.ts;
      r.lastDate = dayOf(e);
      r.pct = num(e.payload?.pct) || r.pct;
      r.module = e.payload?.module || r.module;
      r.lastSection = e.payload?.section_title || r.lastSection;
      r.sectionsDone = num(e.payload?.sections_done) || r.sectionsDone;
      r.sectionsTotal = num(e.payload?.sections_total) || r.sectionsTotal;
    }
    if (e.verb === "course_completed") {
      r.completed = true;
      r.pct = 100;
    }
  }

  const courses = Object.values(byCourse)
    .map((r) => {
      const daysSince = r.lastDate ? Math.round((dateMs(todayStr) - dateMs(r.lastDate)) / 86400000) : null;
      const streak = streakEndingToday((k) => days[k]?.courses?.includes(r.code) || false);
      return { ...r, daysSince, streak };
    })
    .sort((a, b) => (b.lastTs || "").localeCompare(a.lastTs || ""));

  const recent = events
    .filter((e) => PROGRESS.has(e.verb))
    .slice()
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    .slice(0, 40)
    .map((e) => ({ date: dayOf(e), course: e.course, title: e.payload?.section_title || null, module: e.payload?.module || null, pct: num(e.payload?.pct) || null }));

  const dayKeys = Object.keys(days).sort();
  const lastDate = dayKeys[dayKeys.length - 1] ?? null;

  return {
    courses,
    days,
    recent,
    sectionsToday: days[todayStr]?.sections ?? 0,
    progressedToday: (days[todayStr]?.sections ?? 0) >= 1,
    totalSections: events.filter((e) => PROGRESS.has(e.verb)).length,
    lastDate,
    daysSince: lastDate ? Math.round((dateMs(todayStr) - dateMs(lastDate)) / 86400000) : null,
    streak: streakEndingToday((k) => (days[k]?.sections ?? 0) > 0),
  };
}

// ---------- main ----------

function main() {
  const root = findBookRoot();
  const bookEvents = loadBookLearningEvents(root);

  const payload = {
    generated_at: new Date().toISOString(),
    learningActivity: buildLearningActivity(bookEvents),
    quizActivity: buildQuizActivity(bookEvents),
    courseActivity: buildCourseActivity(root),
  };

  const outPath = join(root, "dashboard-state.js");
  writeFileSync(outPath, `window.BOOK_STATE = ${JSON.stringify(payload)};\n`);
  console.log(`Wrote ${outPath}`);
  console.log(`  learningActivity: ${payload.learningActivity.totalSessions} quiz sessions, ${payload.learningActivity.topics.length} topics`);
  console.log(`  courseActivity: ${payload.courseActivity.courses.length} courses tracked`);
}

main();
