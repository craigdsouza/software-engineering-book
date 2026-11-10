# Skills

The instructions for the three skills that work on this book live here, in git, so they are
versioned with the book and always current.

| File | What it is |
|---|---|
| `swe-teacher.md` | Teaches the next topic or sub-topic, logs a `taught` event, hands the write-up to the editor, then pushes. |
| `swe-quizmaster.md` | Quizzes, grades, logs a `quiz_answered` event, then pushes. |
| `swe-editor.md` | The only writer of page prose. Folds events into `{id}.md`, then pushes. |
| `loaders/*.loader.md` | The tiny skills installed in Claude. Each one finds this repo, pulls it, and reads its instructions file from here. |

## How they stay in sync

The skills installed in Claude are **loaders**. A loader holds no rules of its own: every run it
does `git pull` on the repo and then reads `skills/<name>.md` from the fresh checkout. So an edit
pushed to this folder is live in the very next session, and an installed copy cannot go stale.
The loader is the only part that is installed, and it only needs re-saving if its own text changes
(its title line says `loader, v1`).

## Changing a skill

1. Edit `skills/<name>.md` and bump the version in its title line.
2. Save a frozen copy as `docs/skill-history/<name>.v{N}.{date}.md` and add a row to that folder's README.
3. Commit and push. There is nothing to reinstall.
