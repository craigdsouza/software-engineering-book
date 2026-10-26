---
prose_through: 99
---

## Client state vs. server state

**Client state** is transient UI stuff — is a dropdown open, what's typed in a box — that never came from the server, so it can never go "stale" in the caching sense. **Server state** is data the backend actually owns; anything the client displays is only a *cached copy* of it, and that copy can drift from the truth. The caching strategies below apply only to server state — client state was never a copy of anything, so there's no invalidation question to ask about it.

Which one a piece of data is depends on who owns it. A dark-mode toggle on a settings screen is a good test. If the toggle lives only on this screen, it is client state. If it is saved to the user's account, it is server state, and caching rules apply. They apply not because you read a cache before toggling, but because the screen shows a *copy* that can drift from the truth: switch to dark mode on your phone and the laptop still shows light.

## Caching strategies

- **TTL** — time-based expiry; treat cached data as valid for N seconds, then discard and refetch.
- **Stale-while-revalidate** — show cached data instantly, refetch in the background, swap in the fresh copy when it arrives. Trigger is *uncertainty* (freshness unknown), not necessarily elapsed time.
- **Invalidate on known mutation** — the client itself just wrote something, so it *knows* a specific cached view is now wrong, and proactively refetches it.
- **Push-based** — the server notifies the client of changes directly (e.g. WebSockets), instead of the client guessing when to check.

## Optimistic updates

The UI assumes a write will succeed and updates immediately, before the server confirms — rolling back visibly if the write fails. Distinguished from stale-while-revalidate by what's *known* (a write was just issued, unconfirmed) vs. *guessed* (cached data assumed still roughly correct).

Optimistic update is a **sibling** of invalidate-on-known-mutation, not a sub-case of it. Both respond to the same trigger — a write you know just happened — but optimistic update skips the round trip entirely (guess immediately, for the object you're directly watching), while invalidate-on-mutation still does an honest refetch (safer, slower — used for other cached views affected by the same change, where a small delay is invisible).

The key difference is what gets written into the screen. An optimistic update writes a *guessed* new value. Invalidate-on-mutation writes nothing and asks the server for the *true* value, without guessing. Both start from a known write, so they are easy to blur.

**One write, several cached views.** Liking a post shows why both are needed. The liked status and the likes count on the post you are looking at update optimistically. But a write often affects other cached views of the same data: the same post in the feed versus its detail page, a "posts I liked" list, and the author's total-likes figure. For those, guessing the new content is hard (ordering, paging) and a wrong guess is costly, while a short delay is invisible because they are not on screen. So you mark them stale and refetch them honestly, ideally when they are next opened.

Changing a profile photo works the same way. The new photo shows in the top corner right away (optimistic, because it is on screen). Other places that show the old photo, such as the profile page, comments on other people's posts, and group pages where you are admin, are off screen, so there is no visible gain from updating them early, and a wrong guess (say the server rejects the photo) would be costly. Even the on-screen guess is only a local preview: the server may resize the image or give it a new web address, so the real version replaces the preview when it arrives.

## Push vs. polling

Polling means resending a full HTTP request (headers, cookies, everything) on a fixed timer, whether or not anything changed — most of those calls are wasted. A **WebSocket** connection is set up once, then stays open as a passive, reserved slot in server memory — no repeated transmission required to "keep it open." When there's actually something to send, the server pushes it down the already-open pipe. The only recurring cost is an occasional small heartbeat frame to detect a silently-dead connection — orders of magnitude cheaper than re-polling every second.

:::callout
**Same idea, one layer down:** this exact staleness tradeoff reappears in database replication. See [Databases — Replication](../databases/distributed-systems.html#replication) — an asynchronous replica lagging behind the primary is the same "known vs. guessed freshness" shape as stale-while-revalidate, just applied to database copies instead of client caches.
:::

## Where things stand

This page is solid. The basics hold, including the push-versus-polling tradeoff and why WebSocket connections don't carry polling-like recurring cost. An earlier check mixed up client state with server-side caching layers. That is resolved: client state and server state are now separated correctly, with caching tied to server state. A later check showed two gaps, naming the other cached views a write affects and telling optimistic updates apart from invalidate-on-mutation. A fresh profile-photo scenario retested both, and both were answered correctly, including the on-screen versus off-screen reasoning. Revisit later for depth: WebSocket internals and real-world cache invalidation patterns.

## Related pages

- [Databases](../databases/fundamentals.html) — replication lag is this same staleness problem, one layer down.
- [APIs](../backend/apis.html) — optimistic updates are usually paired with a write to a REST endpoint.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
