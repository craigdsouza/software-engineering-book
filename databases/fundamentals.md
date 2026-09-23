---
prose_through: 85
---

## Why databases exist

An application server holding data only in memory has three problems: it vanishes on restart, it can't be shared across multiple server instances, and it has no way to answer precise questions about the data without hand-written scanning logic. A database gives durable, shared, queryable storage.

## Relational vs. non-relational

**Relational (SQL)** databases organize data into tables with fixed columns; relationships between tables are expressed via **foreign keys**, and reassembled at query time with **joins**. **Non-relational (NoSQL)** databases — document stores, key-value stores — relax that structure, letting each record be a self-contained blob with no enforced schema or joins.

**Normalization** (store a reference, one source of truth) vs. **denormalization** (duplicate data directly for read speed) is the same underlying tension as caching. Denormalization is a modeling *choice*, not exclusive to non-relational systems — a relational table can denormalize too; non-relational stores just make it the default since cheap joins aren't available there.

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

Two implementation strategies: **locking** (a transaction takes a lock on a row before touching it; others wait their turn) and **MVCC** — multi-version concurrency control (the database keeps multiple versions of each row; each transaction reads a consistent snapshot from when it started, without blocking anyone). Like a shared document: locking is "only one editor at a time"; MVCC is "everyone sees their own snapshot, conflicts sort out at save time." Postgres leans heavily on MVCC.

## Replication {#replication}

One database on one machine is a single point of failure and a throughput ceiling. **Replication** keeps copies of the same data on multiple machines: a **leader** accepts writes, **replicas** receive a copy of every change and typically serve read traffic too.

**Synchronous** replication — the leader waits for replicas to confirm before acknowledging the write (safe, slower). **Asynchronous** — the leader confirms immediately, replicates in the background (fast, but replicas can lag).

:::callout
**Same shape as caching staleness.** See [State & Caching](../frontend/state-caching.html) — an async replica serving a slightly-behind read is the same "known vs. guessed freshness" tradeoff as stale-while-revalidate, just one layer down in the stack.
:::

## Sharding {#sharding}

Where replication copies the *same* data everywhere, **sharding** splits *different* data across machines by some key (e.g. users A–M on one shard, N–Z on another). Buys horizontal write scalability, at the cost of cross-shard operations: a query spanning shards can't join inside the database anymore — the application (or a separate reporting/analytics store) has to combine results itself, a pattern usually called **scatter-gather**. Replication and sharding are complementary — a large system often shards the data *and* replicates each shard.

## CAP theorem {#cap}

Once data lives on multiple machines connected by a network, that network can partition. CAP says: during a partition, choose between **Consistency** (every node gives the absolute latest write, even if that means refusing to answer) and **Availability** (every node always answers, even if slightly behind). Partition tolerance isn't optional in a real distributed system, so the real decision is CP vs. AP.

Two bank branches, NYC and London, phone line down. A withdrawal just happened in NYC. Does London refuse all transactions until the line's back (consistent, unavailable), or keep operating on its last-known balance, risking an overdraft to reconcile later (available, inconsistent for a while)? A system that keeps accepting writes on both sides of a partition is choosing **availability** — the risk isn't automatically "bad data," it's *conflicting writes needing a reconciliation strategy* once the partition heals (last-write-wins, merge, manual review), and depending on that strategy real problems can still occur (e.g. both branches believing they hold the last unit of inventory).

:::callout
**The recurring meta-pattern of this whole course:** "answer fast and possibly wrong/stale" vs. "wait and be certain" shows up again and again — optimistic updates, async replication, and CP vs. AP are all the same underlying tension at different layers.
:::

## Where things stand

Basics (relational vs. non-relational, normalization, ACID, indexes) and the "beyond" layer (isolation levels, replication, sharding, CAP) are both covered — all four beyond-layer quiz questions graded correct, including a strong spontaneous callback connecting isolation to the earlier API race-condition example. Still not treated as finished — genuinely deeper material (consensus protocols like Raft/Paxos, real per-database isolation defaults, multi-region replication topologies) is a further layer beyond even this, for whenever it's useful.

## Related pages

- [APIs](../backend/apis.html) — the "like" race condition that isolation generalizes.
- [State & Caching](../frontend/state-caching.html) — replication lag as staleness, one layer down.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
