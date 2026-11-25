---
prose_through: 158
---

## Why databases exist

An application server holding data only in memory has three problems: it vanishes on restart, it can't be shared across multiple server instances, and it has no way to answer precise questions about the data without hand-written scanning logic. A database gives durable, shared, queryable storage.

## Relational vs. non-relational

**Relational (SQL)** databases organize data into tables with fixed columns; relationships between tables are expressed via **foreign keys**, and reassembled at query time with **joins**. **Non-relational (NoSQL)** databases — document stores, key-value stores — relax that structure, letting each record be a self-contained blob with no enforced schema or joins.

**Normalization** (store a reference, one source of truth) vs. **denormalization** (duplicate data directly for read speed) is the same underlying tension as caching. Denormalization is a modeling *choice*, not exclusive to non-relational systems — a relational table can denormalize too; non-relational stores just make it the default since cheap joins aren't available there.

What denormalization buys is read speed: a reading app that stores `author_name` directly on every book row can load a 50-book home feed without looking anything up in an authors table. What it costs shows up on a write. If an author with 40 books changes her pen name, all 40 rows must be updated. Beyond the cost, there is an **update anomaly** risk: if one of the 40 updates fails, or a book is inserted mid-rename with the old name, some books show the old name and some the new. The normalized design keeps one row in an `authors` table, referenced by id, so a rename is a single update and the inconsistency can't happen. A single source of truth makes it impossible.

## Tables, primary keys and foreign keys {#tables-keys}

A **table** is rows and columns. A **primary key** is a column (or columns) whose value is different in every row and is never empty. It is the row's ID card. To change or delete exactly one row, such as one author in the rename example above, the database must be able to point at that row.

```
authors
 id | name        | city
----+-------------+-------
 1  | Meera Rao   | Pune
 2  | Meera Rao   | Delhi    <- same name, different person
 3  | Sam Iyer    | Pune
```

Two different people are both called Meera Rao. `UPDATE ... WHERE name = 'Meera Rao'` would change both. `WHERE id = 2` touches exactly one row.

A primary key must satisfy two constraints at once:

1. **Unique:** no two rows share the value.
2. **Never empty:** a row you can't point at is useless.

The database enforces both. Inserting a second row with `id = 2` is refused.

**Tempting but wrong: use a name or an email as the key.** With student name as the key, a second student called Priya Shah is refused, so a real student can't be enrolled. Names and emails also change. If `jo@old.com` becomes `jo@new.com`, every other table that stored the old value now points at nothing. A good key never changes, so most tables use a meaningless number (1, 2, 3...) or random ID, called a **surrogate key**. The key's job is to be stable, not meaningful. Order numbers and booking references like PNR 4829103 work this way.

A **foreign key** is a column in one table that holds the primary key of a row in another table. It is a pointer.

```
authors (parent)           books (child)
 id | name                  id | title        | author_id
----+----------             ---+--------------+----------
 1  | Meera Rao             10 | Salt Roads   | 1
 2  | Sam Iyer              11 | Night Trains | 1
                            12 | Paper Boats  | 2
```

Here `books.author_id` is the foreign key. Meera's name lives in one row, so a rename is one update and all her books follow. This is the normalized design from above. It costs a join to read, which is why some systems denormalize for read speed.

The database enforces **referential integrity**: every foreign key value must match an existing primary key.

```
INSERT book with author_id = 99  -> REFUSED   (no author 99 exists)
DELETE author 2 (has book 12)    -> REFUSED, or the book goes too
DELETE author 5 (has no books)   -> allowed
```

**Tempting but wrong: just store the number and skip the constraint.** An app bug or a manual delete then leaves `author_id = 2` pointing at nothing, called an **orphan**. The book page shows "by: (missing)" and nothing warns you. With a foreign key, the bad delete is refused at that moment. A foreign key is a guarantee, not just a pointer: a bare number can silently rot, and the constraint keeps the pointer true.

**Deleting a parent that still has children.** The rule is chosen up front:

- **Block** the delete: the parent can't go while children exist.
- **Cascade**: deleting the parent also deletes its children.
- **Soft delete**: keep the parent row and mark it archived or inactive. Nothing points at nothing.

A shop that must keep sales records for taxes can't cascade, because that destroys the orders. Soft delete (or blocking) keeps them. If privacy law requires erasing a person's details while the tax record must stay, keep the customer row and its `id` but blank the name and contact fields. Orders still link to a real row, but the row no longer identifies anyone.

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

The same shape appears in a hospital on-call rule: a doctor may go off call only if at least 2 are on call, and with exactly 2 on call (Asha and Ben) both tap "go off call" at once. Each transaction counts 2 and passes the check, and both update a different row (their own), so the database sees no write conflict and both go off call. Each one checked a rule that spans both rows without seeing the other's change.

Two ways to fix it, one that changes the isolation level and some that don't:

- **Raise the level to Serializable**, so the database treats the two transactions as if they ran one after the other.
- **Lock a parent row** without changing the level: `SELECT ... FOR UPDATE` on the concert row makes the second buyer wait.
- **Keep a `seats_sold` counter** and use a conditional update: `UPDATE ... WHERE sold < 500`. Only one of the two updates will find the condition true.
- **Add a unique constraint** on `(concert_id, seat_no)`, so a second booking of the same seat is rejected by the database itself.

A unique constraint doesn't fit the on-call case, because no single value is duplicated. There, a counter row or `FOR UPDATE` on a parent "night shift" row works instead. At Serializable the database may abort one transaction instead of making it wait, and the app then reruns it.

Two implementation strategies: **locking** (a transaction takes a lock on a row before touching it; others wait their turn) and **MVCC** — multi-version concurrency control (the database keeps multiple versions of each row; each transaction reads a consistent snapshot from when it started, without blocking anyone). Like a shared document: locking is "only one editor at a time"; MVCC is "everyone sees their own snapshot, conflicts sort out at save time." Postgres leans heavily on MVCC.

:::callout
**Replication, sharding and the CAP theorem are now on their own page** — they belong to data spread across many machines. See [Distributed Systems](distributed-systems.html).
:::

## Where things stand

Database Fundamentals is solid. Normalization is understood, including the update anomaly on a rename. Isolation levels are now understood too: the write-skew cases (oversold concert, two doctors going off call) were explained correctly, with fixes named. Primary keys and foreign keys were taught and both check-ins were answered correctly, including choosing a soft delete for a shop that must keep tax records. They have not been quizzed yet, so the next step is a quiz on keys. Replication, sharding and CAP, including the read-your-writes question, are tracked on [Distributed Systems](distributed-systems.html).

## Related pages

- [APIs](../backend/apis.html) — the "like" race condition that isolation generalizes.
- [Distributed Systems](distributed-systems.html) — replication, sharding and CAP, moved from this page.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
