---
prose_through: 90
---

## Why databases exist

An application server holding data only in memory has three problems: it vanishes on restart, it can't be shared across multiple server instances, and it has no way to answer precise questions about the data without hand-written scanning logic. A database gives durable, shared, queryable storage.

## Relational vs. non-relational

**Relational (SQL)** databases organize data into tables with fixed columns; relationships between tables are expressed via **foreign keys**, and reassembled at query time with **joins**. **Non-relational (NoSQL)** databases — document stores, key-value stores — relax that structure, letting each record be a self-contained blob with no enforced schema or joins.

**Normalization** (store a reference, one source of truth) vs. **denormalization** (duplicate data directly for read speed) is the same underlying tension as caching. Denormalization is a modeling *choice*, not exclusive to non-relational systems — a relational table can denormalize too; non-relational stores just make it the default since cheap joins aren't available there.

What denormalization buys is read speed: a reading app that stores `author_name` directly on every book row can load a 50-book home feed without looking anything up in an authors table. What it costs shows up on a write. If an author with 40 books changes her pen name, all 40 rows must be updated. Beyond the cost, there is an **update anomaly** risk: if one of the 40 updates fails, or a book is inserted mid-rename with the old name, some books show the old name and some the new. The normalized design keeps one row in an `authors` table, referenced by id, so a rename is a single update and the inconsistency can't happen. A single source of truth makes it impossible.

## ACID and isolation {#isolation}

A **transaction** groups multiple operations so the database guarantees they behave as one indivisible unit — **Atomicity** (all or nothing), **Consistency** (only valid states), **Isolation** (concurrent transactions can't corrupt each other's view of the data), **Durability** (once confirmed, survives a crash).

:::callout
**This is the general-purpose fix for the "likes" race condition.** See [APIs — the "like" case study](../backend/apis.html): two concurrent PATCH-array likes could silently lose one update. *Isolation* is the database property specifically designed to prevent exactly that class of bug.
:::

### Isolation is a dial, not a switch

Isolation means concurrent transactions *behave as if* serialized — not that the database literally forbids parallelism. How strictly that illusion holds is configurable, because full strictness is expensive. Three classic anomalies, weakest to worst:

```
DIRTY READ — seeing work that isn't final yet
Time ──────────────────────────────────────►
Txn A:  BEGIN ── set balance=90 ────────── ROLLBACK (back to 100)
Txn B:          BEGIN ── read balance=90 ── COMMIT
                          ▲
                          B saw a number that, in the end, never really happened

NON-REPEATABLE READ — same question, two different answers, mid-transaction
Time ──────────────────────────────────────►
Txn A:  BEGIN ── read balance=100 ─────────────── read balance=90 ── COMMIT
Txn B:               BEGIN ── set balance=90 ── COMMIT
                                                   ▲
                             A asked twice, got two different answers, in one sitting

PHANTOM READ — same search, a new row shows up
Time ──────────────────────────────────────►
Txn A:  BEGIN ── "orders>$100"→5 rows ──────────────── same query→6 rows ── COMMIT
Txn B:                  BEGIN ── insert new $150 order ── COMMIT
                                                             ▲
                                    a row "appeared" between two identical queries
```

| Isolation level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | Possible | Possible | Possible |
| Read Committed | Prevented | Possible | Possible |
| Repeatable Read | Prevented | Prevented | Possible (DB-dependent) |
| Serializable | Prevented | Prevented | Prevented |

**A phantom in practice: the oversold concert.** A booking transaction runs at Repeatable Read: (1) `SELECT count(*) FROM tickets WHERE concert_id = 7`, then (2) if `sold < 500`, `INSERT` a ticket. With 499 sold, two buyers click Buy at the same moment. Both transactions read 499, both pass the check, and both insert, so 501 tickets exist. This is a phantom-style anomaly, also called **write skew**: each transaction's check is invalidated by a *new row* the other one inserts. Repeatable Read only protects rows that were already read. It does not protect rows that don't exist yet. Tempting but wrong: "Repeatable Read means my count can't change under me" is true for the rows already counted, not for new ones appearing.

Two ways to fix it, one that changes the isolation level and some that don't:

- **Raise the level to Serializable**, so the database treats the two transactions as if they ran one after the other.
- **Lock a parent row** without changing the level: `SELECT ... FOR UPDATE` on the concert row makes the second buyer wait.
- **Keep a `seats_sold` counter** and use a conditional update: `UPDATE ... WHERE sold < 500`. Only one of the two updates will find the condition true.
- **Add a unique constraint** on `(concert_id, seat_no)`, so a second booking of the same seat is rejected by the database itself.

Two implementation strategies: **locking** (a transaction takes a lock on a row before touching it; others wait their turn) and **MVCC** — multi-version concurrency control (the database keeps multiple versions of each row; each transaction reads a consistent snapshot from when it started, without blocking anyone). Like a shared document: locking is "only one editor at a time"; MVCC is "everyone sees their own snapshot, conflicts sort out at save time." Postgres leans heavily on MVCC.

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

## Where things stand

This page is needs-review. Normalization and sharding are solid: the trade-off of denormalizing and the cost of a shard key were both understood, though the shard-key trade-off needed one prompt. Three things are shaky and should be retested. Isolation levels: the oversold-concert question was not attempted, so why Repeatable Read doesn't stop a count-then-insert race, and the fixes for it, are still open. Replication: the stale-bio problem was diagnosed correctly, but the only fix named was a client-side optimistic update, and the server-side fixes are new. CAP: what CP and AP mean, and how to pick between them for a cart versus a seat booking, was not recalled. The next step is to retest the concert and CAP questions. Genuinely deeper material (consensus protocols like Raft and Paxos, real per-database isolation defaults, multi-region replication topologies) is a further layer beyond all of this, for whenever it's useful.

## Related pages

- [APIs](../backend/apis.html) — the "like" race condition that isolation generalizes.
- [State & Caching](../frontend/state-caching.html) — replication lag as staleness, one layer down.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
