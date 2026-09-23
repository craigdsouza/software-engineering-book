---
prose_through: 85
---

## REST, in short

REST models data as **resources** (nouns) living at URLs, and reuses HTTP's small built-in vocabulary of verbs to act on them instead of inventing a new endpoint per action:

- `GET /users/42` — fetch user 42
- `POST /users` — create a new user
- `PATCH /users/42` — update user 42
- `DELETE /users/42` — remove user 42

Status codes come in groups: 2xx success, 4xx client error (400 bad request, 401 unauthorized, 403 forbidden, 404 not found), 5xx server error.

**GraphQL** is noted at awareness level only — a single endpoint where the client specifies exactly which fields it wants, solving REST's common over/under-fetching problem. Not gone deep on yet.

## Case study: modeling a "like"

Two designs considered for letting a user like a post:

- `POST` / `DELETE /posts/42/likes` — resource-oriented
- `PATCH /posts/42` with a `likedBy` field — attribute-oriented

**Resource-oriented wins.** A like is an *event* (a fact that happened), not *state* (an attribute of the post). The PATCH-with-array approach requires a client-side read-modify-write: fetch the current array, append the new like, send the whole array back. That creates a **lost-update race condition** — if two users like concurrently, both read the same starting array, both append their own name, and whichever PATCH lands second silently overwrites the first's change. `POST`-to-a-collection needs no such read first, so it's atomic on the server — no race.

:::callout
**General principle, not just a REST quirk:** this exact race condition — and the general-purpose fix for it — reappears when databases are covered directly. See [Databases — ACID & Isolation](../databases/fundamentals.html#isolation) for the underlying mechanism (transaction isolation) that a real database uses to prevent this class of bug automatically.
:::

### Rule of thumb

Model something as its own resource if it has independent identity, can be listed, or can be created/removed by someone other than the parent resource's owner. Otherwise, PATCH the parent's attribute — e.g. archiving an email is a PATCH, since it's a property change made by the resource's own owner, with no concurrent-actor risk.

## Where things stand

Solid. Reasoned through the REST verb question unprompted, and correctly absorbed the critique when self-proposing the PATCH-with-array refinement — including recognizing the concurrency/event-vs-state distinction immediately. Confirmed again on a later recall check (archiving-email variant). No flagged gaps — safe to build on (pagination, idempotency, versioning) without re-teaching basics.

## Related pages

- [Databases](../databases/fundamentals.html) — the "like" race condition generalizes to transaction isolation.
- [Auth](auth.html) — auth decisions are themselves modeled as resources/endpoints in the same style.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
