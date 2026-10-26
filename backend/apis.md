---
prose_through: 106
---

## REST, in short

REST models data as **resources** (nouns) living at URLs, and reuses HTTP's small built-in vocabulary of verbs to act on them instead of inventing a new endpoint per action:

- `GET /users/42` — fetch user 42
- `POST /users` — create a new user
- `PATCH /users/42` — update user 42
- `DELETE /users/42` — remove user 42

Status codes come in groups: 2xx success, 4xx client error (400 bad request, 401 unauthorized, 403 forbidden, 404 not found), 5xx server error.

The two that get mixed up are 401 and 403. **401** means the server does not know who you are (you are not authenticated). **403** means it knows who you are and still refuses (you are authenticated but not allowed). A logged-out visitor opening their order history gets a 401. A logged-in regular user opening the admin page gets a 403.

**GraphQL** is noted at awareness level only — a single endpoint where the client specifies exactly which fields it wants, solving REST's common over/under-fetching problem. Not gone deep on yet.

## Case study: modeling a "like"

Two designs considered for letting a user like a post:

- `POST` / `DELETE /posts/42/likes` — resource-oriented
- `PATCH /posts/42` with a `likedBy` field — attribute-oriented

**Resource-oriented wins.** A like is an *event* (a fact that happened), not *state* (an attribute of the post). The PATCH-with-array approach requires a client-side read-modify-write: fetch the current array, append the new like, send the whole array back. That creates a **lost-update race condition** — if two users like concurrently, both read the same starting array, both append their own name, and whichever PATCH lands second silently overwrites the first's change. With 5 likes and two users liking at once, the post ends at 6 instead of 7. Both requests return success, so nothing signals that a like vanished (this is a **lost update**). `POST`-to-a-collection needs no such read first: each request adds its own like on the server, so the same two users take the post to 7 — no race.

:::callout
**General principle, not just a REST quirk:** this exact race condition — and the general-purpose fix for it — reappears when databases are covered directly. See [Databases — ACID & Isolation](../databases/fundamentals.html#isolation) for the underlying mechanism (transaction isolation) that a real database uses to prevent this class of bug automatically.
:::

### Rule of thumb

Model something as its own resource if it has independent identity, can be listed, or can be created/removed by someone other than the parent resource's owner. Otherwise, PATCH the parent's attribute — e.g. archiving an email is a PATCH, since it's a property change made by the resource's own owner, with no concurrent-actor risk.

Two more cases show the rule at work. A **follow** is its own resource (`/users/42/followers`, added with POST): it has its own identity, it can be listed, and many different users add to the same list at the same time. A notification's **read** flag is a PATCH on `/notifications/42`: only the user who received the notification ever changes it.

## Idempotency: a repeated request must not change the outcome

Suppose a user double-taps the like button, so the server receives `POST /posts/42/likes` twice from the same user. The same thing happens without a double-tap: on a weak connection the app may not get a reply in time and automatically send the request again.

**Tempting but wrong: make the POST a toggle** (like, then unlike on the second request). The outcome then depends on how many times the request happens to arrive. A user who tapped once, on a flaky network, ends with no like at all, and nothing reports an error.

**The fix is that a request says the state it wants, not a flip.** "Like" means "make sure this user's like exists". Unlike is its own action, `DELETE /posts/42/likes`. The server keeps one like per user per post, so the second POST changes nothing. It returns the existing like (200) or a 409 Conflict, and the count rises by one, not two.

Doing the same request twice and ending in the same state is called **idempotent**. Retries and double-taps are routine, so a well-designed endpoint should behave this way. Idempotency keys and safe retries go further and are listed under Intermediate & Advanced Topics below.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth, tracked here deliberately rather than left as scattered asides.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Idempotency keys and safe retries | Intermediate | Idempotency | How an endpoint can recognise a retried request and apply it only once. Needed for requests where doing it twice causes harm, such as a payment retried after a network timeout. |

## Where things stand

The REST basics are solid: resources and verbs, the 401 versus 403 difference, and the like case study (the 6 versus 7 outcome of the PATCH race). The rule of thumb for "own resource or PATCH" was forgotten but rebuilt correctly from reasoning, using follows and notification read flags. One misconception is open: proposing that a repeated POST should toggle the like on and off, instead of treating a duplicate as a no-op. The next step is a fresh check on idempotency with a retry scenario, such as a request repeated after a timeout, then pagination and versioning.

## Related pages

- [Databases](../databases/fundamentals.html) — the "like" race condition generalizes to transaction isolation.
- [Auth](auth.html) — auth decisions are themselves modeled as resources/endpoints in the same style.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
