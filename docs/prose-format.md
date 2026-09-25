# Topic prose — format

Every page node in `nodes.json` (a `page` with no `#`) has its prose in `{id}.md`; the page is
generated into the build output: `computer-science/data-structures/trees.md` → `_site/computer-science/data-structures/trees.html`.
`scripts/render-pages.mjs` builds it; topic `.html` files are never committed.

What the .md does **not** contain (all generated): the `<head>`, site nav, breadcrumb, `<h1>`
(title comes from `nodes.json`), the status line, the "Coverage log" table, and the footer.
Links are written relative to the .md's own folder, exactly as they'd be from the .html (same folder in `_site/`).

## Who writes it

Only the **editor** (the `swe-editor` skill) writes prose. Every other agent — swe-teacher,
swe-quizmaster, Gemini, anything posting through the API — only appends events. Events are
append-only, so any number of writers can add them at once; prose is rewritten in place, so it
has exactly one writer. A `taught` event's `content` (and a quiz question's `feedback`) is the
raw material the editor writes the page from.

## Front matter and the backlog

Every .md starts with:

```
---
prose_through: 86
---
```

`prose_through` is the highest event id already written into this page. Any later event that
touches one of the page's nodes (as `node_id`, a question's or gap's `node_id`, or a `read`
event's `nodes[]`) is **backlog**: `scan-book.mjs` records it in `progress-data.json`
(`pages[file].prose`), and the page's status line shows it — "1 event not yet written up (#86)".
`node scripts/prose-backlog.mjs [node id]` prints the backlog events in full, plus any node that
has events but no `page` yet (the editor places it first). The editor folds the events in, then
sets `prose_through` to the highest id it folded.

The migration on 2026-09-23 started every page at `prose_through: 85`; event 86 (an Auth quiz
on 2026-09-22) was the first real backlog.

## Page layout

```
(body sections, in reading order)
## Where things stand
(one paragraph: current understanding, open gaps, what's next)
## Related pages
- [Title](relative/path.html) — why it's related
```

Everything before `## Related pages` renders above the coverage log; the related list renders
after it, in its own box. `## Related pages` is optional.

## Allowed syntax (and nothing else)

| Write | Renders as |
|---|---|
| `## Heading` / `### Subheading` | `<h2>` / `<h3>` |
| `## Hash Tables {#hash-tables}` | `<h2 id="hash-tables">` — a section node's anchor must match its `page` in nodes.json |
| blank-line-separated text | paragraph |
| `**bold**`, `*italic*`, `` `code` `` | strong, em, code |
| `[text](../backend/apis.html#anchor)` | link |
| `- item` (continuation lines indented 2 spaces) | bulleted list |
| ```` ``` ```` fence | `<pre>` block, whitespace kept exactly (ASCII diagrams, cost tables) |
| `:::callout` … `:::` | the boxed callout; one or more paragraphs inside |
| pipe table with a `\|---\|` separator row | scrollable table |

Escape a literal `*`, `` ` ``, `[`, `]` or (inside a table) `|` with a backslash.
Raw HTML is rejected — `render-pages.mjs` fails loudly rather than render it — so prose can
never break the page layout. `<`, `>` and `&` are fine as plain characters.

## After editing

`node scripts/rebuild.mjs` (validate → scan → render-pages → build-progress).
`node scripts/render-pages.mjs --check` exits 1 if any page in `_site/` is out of date with its .md.

A new page node needs its .md before the rebuild will pass (`render-pages` reports the missing file).
`render-pages` also fails if a section node that lives on this page (`page: "x.html#anchor"`)
has no `{#anchor}` heading, or if the front matter is missing.

Migrated from hand-written HTML on 2026-09-23 by `scripts/extract-prose.mjs`; the rendered
pages were checked tag-for-tag against the originals — the only differences were the `<title>`
suffix (now "Software Engineering Book" everywhere) and databases/fundamentals' `<h1>`, which now
uses its registry title, "Database Fundamentals".
