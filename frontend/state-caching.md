---
prose_through: 85
---

## Client state vs. server state

**Client state** is transient UI stuff — is a dropdown open, what's typed in a box — that never came from the server, so it can never go "stale" in the caching sense. **Server state** is data the backend actually owns; anything the client displays is only a *cached copy* of it, and that copy can drift from the truth. The caching strategies below apply only to server state — client state was never a copy of anything, so there's no invalidation question to ask about it.

## Caching strategies

- **TTL** — time-based expiry; treat cached data as valid for N seconds, then discard and refetch.
- **Stale-while-revalidate** — show cached data instantly, refetch in the background, swap in the fresh copy when it arrives. Trigger is *uncertainty* (freshness unknown), not necessarily elapsed time.
- **Invalidate on known mutation** — the client itself just wrote something, so it *knows* a specific cached view is now wrong, and proactively refetches it.
- **Push-based** — the server notifies the client of changes directly (e.g. WebSockets), instead of the client guessing when to check.

## Optimistic updates

The UI assumes a write will succeed and updates immediately, before the server confirms — rolling back visibly if the write fails. Distinguished from stale-while-revalidate by what's *known* (a write was just issued, unconfirmed) vs. *guessed* (cached data assumed still roughly correct).

Optimistic update is a **sibling** of invalidate-on-known-mutation, not a sub-case of it. Both respond to the same trigger — a write you know just happened — but optimistic update skips the round trip entirely (guess immediately, for the object you're directly watching), while invalidate-on-mutation still does an honest refetch (safer, slower — used for other cached views affected by the same change, where a small delay is invisible).

## Push vs. polling

Polling means resending a full HTTP request (headers, cookies, everything) on a fixed timer, whether or not anything changed — most of those calls are wasted. A **WebSocket** connection is set up once, then stays open as a passive, reserved slot in server memory — no repeated transmission required to "keep it open." When there's actually something to send, the server pushes it down the already-open pipe. The only recurring cost is an occasional small heartbeat frame to detect a silently-dead connection — orders of magnitude cheaper than re-polling every second.

:::callout
**Same idea, one layer down:** this exact staleness tradeoff reappears in database replication. See [Databases — Replication](../databases/fundamentals.html#replication) — an asynchronous replica lagging behind the primary is the same "known vs. guessed freshness" shape as stale-while-revalidate, just applied to database copies instead of client caches.
:::

## Where things stand

Basics solid, including the push-vs-polling tradeoff and why WebSocket connections don't carry polling-like recurring cost. A spaced-repetition check on client-vs-server state briefly conflated it with an unrelated concept (server-side caching layers) — corrected and reset for another look. Revisit later for depth: WebSocket internals, real-world cache invalidation patterns.

## Related pages

- [Databases](../databases/fundamentals.html) — replication lag is this same staleness problem, one layer down.
- [APIs](../backend/apis.html) — optimistic updates are usually paired with a write to a REST endpoint.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
