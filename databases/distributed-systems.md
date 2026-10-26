---
prose_through: 90
---

:::callout
**Moved from Database Fundamentals.** Replication, sharding and the CAP theorem were sections of [Database Fundamentals](fundamentals.html) until they outgrew it. Quizzes on them before the move are logged against that page.
:::

## Replication {#replication}

One database on one machine is a single point of failure and a throughput ceiling. **Replication** keeps copies of the same data on multiple machines: a **leader** accepts writes, **replicas** receive a copy of every change and typically serve read traffic too.

**Synchronous** replication — the leader waits for replicas to confirm before acknowledging the write (safe, slower). **Asynchronous** — the leader confirms immediately, replicates in the background (fast, but replicas can lag).

**Read-your-writes: seeing your own change.** With one leader and two asynchronous replicas, writes go to the leader and reads go to a random replica. A user saves a new profile bio, the page reloads, and it shows the *old* bio. Ten seconds later a refresh shows the new one. The write reached the leader, but the reload read a replica that hadn't received the change yet, and ten seconds later it had. The property the user needs is **read-your-writes consistency**: after you write something, your own reads must see it.

Tempting but wrong: fixing this with an optimistic update in the browser. That only covers the moment right after Save. A page reload wipes the client's state, re-queries the server, lands on a lagging replica, and shows the old bio again. It also does nothing for the same user on another tab or device. The fix is on the server, and it doesn't require making the whole system synchronous:

- **Route this user's reads to the leader for a short window** (say 15 seconds) after they write. The cost is extra load on the leader, which is exactly what replicas were meant to offload. A variant: reads of your *own* profile always go to the leader and reads of other people's profiles go to replicas, since users only notice staleness in what they just changed.
- **Track replication position.** The leader numbers every change (say write #10,482). Remember the user's last write position in a cookie or session, and only read from a replica that has applied at least that position. Otherwise wait, or fall back to the leader. The cost is complexity and occasional slower reads.

:::callout
**Same shape as caching staleness.** See [State & Caching](../frontend/state-caching.html) — an async replica serving a slightly-behind read is the same "known vs. guessed freshness" tradeoff as stale-while-revalidate, just one layer down in the stack.
:::

## Sharding {#sharding}

Where replication copies the *same* data everywhere, **sharding** splits *different* data across machines by some key (e.g. users A–M on one shard, N–Z on another). Buys horizontal write scalability, at the cost of cross-shard operations: a query spanning shards can't join inside the database anymore — the application (or a separate reporting/analytics store) has to combine results itself, a pattern usually called **scatter-gather**. Replication and sharding are complementary — a large system often shards the data *and* replicates each shard.

**Choosing the shard key.** Every shard key makes one kind of grouping cheap and scatters all the others. Take a messaging app that shards its messages table by sender `user_id` across 8 shards. Loading all messages between a user and a friend, in time order, needs only **2 shards**, not 8: the router knows both user ids. It is still slower than one machine, for three reasons: two network round-trips, waiting on the slower of the two shards, and merge-sorting the results in the application instead of reading one indexed, ordered result. A better key for this access pattern is `conversation_id`, so a whole conversation lives on one shard. The price is that other queries get worse: "all messages a user sent" now spreads across many conversations and therefore many shards. So do "delete my account and all my messages" and a per-user inbox of latest messages. Any query that lacks the shard key at all, such as full-text search, has to hit all 8 shards.

## CAP theorem {#cap}

Once data lives on multiple machines connected by a network, that network can partition. CAP says: during a partition, choose between **Consistency** (every node gives the absolute latest write, even if that means refusing to answer) and **Availability** (every node always answers, even if slightly behind). Partition tolerance isn't optional in a real distributed system, so the real decision is CP vs. AP.

Two bank branches, NYC and London, phone line down. A withdrawal just happened in NYC. Does London refuse all transactions until the line's back (consistent, unavailable), or keep operating on its last-known balance, risking an overdraft to reconcile later (available, inconsistent for a while)? A system that keeps accepting writes on both sides of a partition is choosing **availability** — the risk isn't automatically "bad data," it's *conflicting writes needing a reconciliation strategy* once the partition heals (last-write-wins, merge, manual review), and depending on that strategy real problems can still occur (e.g. both branches believing they hold the last unit of inventory).

**Choosing CP or AP per use case.** The right side depends on what the data is for. Two regions (Mumbai and Singapore) replicate to each other, and the link drops for 3 minutes:

- **A shopping cart is AP.** A cart should always accept edits. Suppose a user adds a book in Mumbai and removes a pen in Singapore from another device. After the link heals, merge both sides: keep the union of the adds and apply the removes, so the book is added *and* the pen is removed. Last-write-wins would lose one of the two edits.
- **Flight seat booking is CP.** Seat 14C is free and two users in different regions both try to book it. Selling one seat twice is unacceptable. The region that can't confirm with the other refuses the booking, or holds it as pending ("try again shortly") until the link heals. That region is unavailable for those 3 minutes, on purpose.

:::callout
**The recurring meta-pattern of this whole course:** "answer fast and possibly wrong/stale" vs. "wait and be certain" shows up again and again — optimistic updates, async replication, and CP vs. AP are all the same underlying tension at different layers.
:::

## Consensus {#consensus}

*Not yet covered.* How several machines agree on one value, such as which one is the leader, even when some of them crash or the network drops messages. Raft and Paxos are the standard protocols. This is what makes automatic leader failover in [replication](#replication) safe.

## Where things stand

This page is needs-review. Sharding is solid: the cost of a shard key was understood, though the trade-off needed one prompt. Two things are shaky and should be retested. Replication: the stale-bio problem was diagnosed correctly, but the only fix named was a client-side optimistic update, and the server-side fixes are new. CAP: what CP and AP mean, and how to pick between them for a cart versus a seat booking, was not recalled. The next step is to retest the CAP question. Consensus has not been started. Genuinely deeper material (real per-database isolation defaults, multi-region replication topologies) is a further layer beyond all of this, for whenever it's useful.

## Related pages

- [Database Fundamentals](fundamentals.html) — transactions and isolation on a single database, which this page extends to many machines.
- [State & Caching](../frontend/state-caching.html) — replication lag as staleness, one layer down.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
