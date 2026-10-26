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

:::callout
**Replication, sharding and the CAP theorem are now on their own page** — they belong to data spread across many machines. See [Distributed Systems](distributed-systems.html).
:::

## Where things stand

This page is needs-review. Normalization is solid: the trade-off of denormalizing was understood. Isolation levels are shaky and should be retested: the oversold-concert question was not attempted, so why Repeatable Read doesn't stop a count-then-insert race, and the fixes for it, are still open. The next step is to retest the concert question. Replication, sharding and CAP have moved to [Distributed Systems](distributed-systems.html), along with where they stand.

## Related pages

- [APIs](../backend/apis.html) — the "like" race condition that isolation generalizes.
- [Distributed Systems](distributed-systems.html) — replication, sharding and CAP, moved from this page.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
