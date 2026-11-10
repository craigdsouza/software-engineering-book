# Skill history

Frozen copies of the skills (Claude's, and Gemini's saved Skill prompts) that write to this book, kept so any version can be compared or
restored. Files are never edited or deleted; a new version is added alongside the old ones as
`{skill}.v{N}.{date}.md`. From 2026-11-10 the live instructions are in `skills/` in this repo, and the skills installed in Claude are loaders that read them from there (see `skills/README.md`). The files here are frozen copies of each version.

| Skill | Version | File | What changed |
|---|---|---|---|
| swe-teacher | v1 | `swe-teacher.2026-09-22.long.md` | The original long version (before the rewrite). Filename predates version numbers. |
| swe-teacher | v2 | `swe-teacher.v2.2026-09-22.md` | Rewritten short: schema-1 events, nodes.json ids, the teacher writes page HTML and logs `taught` events. |
| swe-teacher | v3 | `swe-teacher.v3.2026-09-23.md` | Stops writing prose: `content` must be complete enough to write the page from, new nodes get `page: null`, then hands off to swe-editor. |
| swe-teacher | v4 | `swe-teacher.v4.2026-10-28.md` | Works from a clone of the GitHub repo instead of a Windows folder, and commits and pushes the event and the editor's page changes to master itself. |
| swe-quizmaster | v1 | `swe-quizmaster.2026-09-22.long.md` | The original long version. Filename predates version numbers. |
| swe-quizmaster | v2 | `swe-quizmaster.v2.2026-09-22.md` | Rewritten short: full question text in `quiz_answered`, gap ids, node ids per question. |
| swe-quizmaster | v3 | `swe-quizmaster.v3.2026-09-23.md` | Never edits .html or .md; puts explanations in `feedback` for the editor; offers swe-editor after a quiz. |
| swe-editor | v1 | `swe-editor.v1.2026-09-23.md` | New: the single prose writer — folds events past `prose_through` into `{id}.md`. |
| swe-teacher | v5 | `swe-teacher.v5.2026-11-10.md` | Instructions now live in `skills/` and the installed skill is a loader. Topic / sub-topic words. Ids are paths and must nest under their parent (up to 5 parts). A rename routine with a before/after check. |
| swe-quizmaster | v5 | `swe-quizmaster.v5.2026-11-10.md` | Commits and pushes the quiz event itself (v4 never pushed). Topic / sub-topic words. Scoring now says a parent is due on the soonest of its own quiz and its sub-topics. |
| swe-editor | v2 | `swe-editor.v2.2026-11-10.md` | Pushes when run on its own. A sub-topic goes on its parent's page. Promoting a page that groups siblings must rename their ids. |
| swe-loader | v1 | `swe-loader.v1.2026-11-10.md` | The installed skill: finds the repo, pulls, reads its instructions from `skills/`. One copy per skill, differing only in name and file. |
| gemini-book-tutor | v1 | `gemini-book-tutor.v1.2026-09-26.md` | New: Gemini in Chrome Skill — teaches/quizzes on the page being read, reads agent-guide.html, outputs draft JSON for log.html. Lives in Gemini's Skills library; this is the copy. |

v2 of swe-teacher and swe-quizmaster was never saved at the time; it was restored on 2026-09-23 from
the installed text read just before the v3 update (the v2→v3 diff matches the v3 edits exactly).
