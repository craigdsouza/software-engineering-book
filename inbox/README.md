# inbox/

Event **drafts** from agents that can't write to the repo themselves land here — today that's
Gemini in Chrome, pasted through `log.html` on the site. Each file is one submission:

```json
{ "submitted_at": "2026-09-26T08:15:02.000Z", "via": "log.html", "drafts": [ { "verb": "...", ... } ] }
```

On every push, the GitHub Action runs `scripts/ingest-inbox.mjs`, which checks each draft, numbers
it, appends it to `events.json` and deletes the file. A file with a problem moves to
`inbox/rejected/` with a `.error.txt` beside it naming each bad field; nothing from it is logged.
Draft format: `docs/events-v1.md` ("Drafts") and the generated `agent-guide.html`.
