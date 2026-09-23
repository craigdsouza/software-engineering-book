# Skill history

Frozen copies of the Claude skills that write to this book, kept so any version can be compared or
restored. Files are never edited or deleted; a new version is added alongside the old ones as
`{skill}.v{N}.{date}.md`. The live skills are installed in Claude, not read from here.

| Skill | Version | File | What changed |
|---|---|---|---|
| swe-teacher | v1 | `swe-teacher.2026-09-22.long.md` | The original long version (before the rewrite). Filename predates version numbers. |
| swe-teacher | v2 | `swe-teacher.v2.2026-09-22.md` | Rewritten short: schema-1 events, nodes.json ids, the teacher writes page HTML and logs `taught` events. |
| swe-teacher | v3 | `swe-teacher.v3.2026-09-23.md` | Stops writing prose: `content` must be complete enough to write the page from, new nodes get `page: null`, then hands off to swe-editor. |
| swe-quizmaster | v1 | `swe-quizmaster.2026-09-22.long.md` | The original long version. Filename predates version numbers. |
| swe-quizmaster | v2 | `swe-quizmaster.v2.2026-09-22.md` | Rewritten short: full question text in `quiz_answered`, gap ids, node ids per question. |
| swe-quizmaster | v3 | `swe-quizmaster.v3.2026-09-23.md` | Never edits .html or .md; puts explanations in `feedback` for the editor; offers swe-editor after a quiz. |
| swe-editor | v1 | `swe-editor.v1.2026-09-23.md` | New: the single prose writer — folds events past `prose_through` into `{id}.md`. |

v2 of swe-teacher and swe-quizmaster was never saved at the time; it was restored on 2026-09-23 from
the installed text read just before the v3 update (the v2→v3 diff matches the v3 edits exactly).
