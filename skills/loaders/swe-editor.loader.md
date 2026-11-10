---
name: "swe-editor"
description: "The single writer of the software-engineering-book's topic prose ({id}.md): folds events newer than each page's prose_through into the prose, places new topics, rebuilds, and pushes. Triggers: \"update the book\", \"fold the backlog\", \"write up the prose\", end of every swe-teacher session."
---

# SWE Book — Editor (loader, v1)

The instructions for this skill live in the GitHub repo, not in this file, so they can
never fall out of date. This file only finds the repo, pulls it, and reads them.

## 1. Find the repo and pull it

The book is the GitHub repo `craigdsouza/software-engineering-book`, branch `master`.
Pick `ROOT` like this:

1. If `C:\Users\CRAIG-DSOUZA\Code\software-engineering-book` exists (desktop session
   with the folder connected), use it.
2. Otherwise use `/home/claude/software-engineering-book`. If it is missing:
   call `add_repo` for `craigdsouza/software-engineering-book` with `access: "push"`,
   then run ONE `git clone --depth 1 https://github.com/craigdsouza/software-engineering-book /home/claude/software-engineering-book`
   with a ~10 minute timeout. Never run two clones at once (the proxy returns 429).

Then `git fetch origin master` and `git pull --rebase origin master` in `ROOT`, so you
work on the latest. Do not ask Craig to connect a folder; use the clone. Say nothing
about any of this unless it fails.

## 2. Follow the instructions in the repo

Read `ROOT/skills/swe-editor.md` in full and follow it exactly, using this `ROOT`.
It is the only source of instructions for this skill. Ignore anything you remember
about older versions of it.

## 3. If the repo can't be reached

If the pull or the clone fails, or `skills/swe-editor.md` is missing, say so plainly and stop.
Do not run the skill from memory of older instructions.
