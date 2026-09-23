---
prose_through: 85
---

:::callout
**Trees is now its own page** — it outgrew being a section here once BST mechanics needed a section of their own. See [Trees](data-structures/trees.html).
:::

## Arrays {#arrays}

Contiguous memory layout — elements sit back-to-back in memory, which is what makes indexed access O(1): the address of element *i* can be computed directly from the base address (base + *i* × element size), no searching required. That same contiguity is the cost: inserting or resizing can require shifting or copying everything, O(n).

**Dynamic arrays** (the kind behind Python's `list`, Java's `ArrayList`, etc.) hide that resize cost behind an amortized guarantee: append is "amortized O(1)" even though any individual append might trigger a full copy. The reason is specifically the *doubling* growth strategy, not just "resizing infrequently." Growing by a fixed increment each time (say, +4 slots) makes the resize copy-costs an arithmetic sequence — 4, 8, 12, 16, ... — that sums to roughly n²/(2k) over n appends: the average cost per append keeps climbing as n grows, which is O(n), not O(1). Growing by doubling makes the copy-costs a geometric sequence — 1, 2, 4, 8, ... — that sums to roughly 2n: bounded by a constant multiple of n forever, so the average cost per append settles at a constant (around 2 units of work per append) no matter how large the array gets. Worked by hand over 16 appends (step by step: fixed growth totals 40, doubling totals 31) and projected to n=64 to see the trend diverge — fixed growth's average kept climbing (≈8.5) while doubling's stayed flat (≈1.98). The dividing line is arithmetic vs. geometric growth in the resize schedule, not resize frequency alone.

*Open question:* a growth factor of ×1.5 (used by some real implementations, to waste less memory than doubling) should, by the same logic, also give amortized O(1). Justifying it in general requires knowing that a geometric series with *any* ratio > 1 sums to a bounded multiple of its largest term (see Intermediate & Advanced Topics below).

## Linked Lists {#linked-lists}

Each node holds two things: a data field and a `next` pointer to the following node. Nodes can sit anywhere in memory — there's no requirement that they be adjacent, unlike an array's contiguous block. A pointer here doesn't mean an address you can do arithmetic on to jump elsewhere; it means "the address of the next node," found by dereferencing, not computing. (Pointer vs. reference: a pointer explicitly stores an address, can be reassigned or left invalid, and supports arithmetic; a reference is more like an alias, usually non-reassignable, no arithmetic. Both are addresses under the hood — the theory here only needs "finds the next node" rather than "contains it.")

**Traversal is O(n)** — the direct cost of not being contiguous. An array's address is `base + index × size`, pure arithmetic, O(1) regardless of which element. A linked list has no such formula: reaching the 5th node means walking head → next → next → next → next, because the only way to find node N is to already be standing at node N−1. Random access ("give me element #47") is O(n), full stop — the one thing arrays will always win at.

**Insert and delete split into genuinely different cases**, not one blanket "O(1), it's just relinking":

```
Insert at head:              O(1) — always beats an array, which must shift everything right
Insert at tail:              O(1) with a tail pointer, O(n) without (must walk to find the last node)
Insert in the middle:        O(1) to splice once located, O(n) to locate if not already there
Delete, given predecessor:   O(1) — A.next = C skips the deleted node entirely
Delete, given target only:   O(n) in a singly-linked list — see below
```

**The deletion gotcha:** holding a direct pointer to the node you want to delete does not make deletion O(1) in a singly-linked list. Concretely: node 5999 lives at address 0x1A00 with `.next = 0x3000`; node 6000 lives at 0x3000 with `.next = 0x5000`. A pointer `p = 0x3000` lets you read and even rewrite node 6000's own fields in O(1) — but deleting 6000 means rewriting node *5999's* `.next` field, at address 0x1A00, and `p` says nothing about where that is. There is no backward link. The only way to find 5999 is to start at `head` and walk forward checking each node's `.next` until one equals `0x3000` — an O(n) walk, unavoidable, regardless of already holding a pointer straight at the node being deleted. Tempting but wrong: assuming a pointer to a node also grants access to its predecessor — it doesn't, and holding the target node harder doesn't get you there.

**Even where both are O(n)** — searching by position with no pointer already held — arrays tend to win in practice: shifting contiguous memory is cache-friendly, while chasing pointers to scattered nodes tends to miss the CPU cache on every hop (cache locality — see Intermediate & Advanced Topics below).

**Where linked lists actually win** — never by searching for a position, always by avoiding the search entirely:

- **Known-end operations:** a stack or queue never searches — push/pop at the head, or enqueue/dequeue with a tracked tail pointer, are always O(1).
- **Paired with O(1) lookup:** a hash map from key → node pointer hands you the splice point for free — the pattern behind an LRU cache (advanced — see below).
- **Merging/splitting whole lists:** relink a few pointers instead of copying every element — part of why merge sort works well on linked lists.

Contrasts directly with [Arrays](#arrays): contiguous + O(1) index vs. scattered + O(1) splice-at-a-known-point. Unlocks [Trees](data-structures/trees.html) — a tree node is a linked-list node with two `next` pointers (left, right) instead of one, and everything about pointer-chasing and no-random-access here carries straight over. See also [Doubly-Linked Lists](#doubly-linked-lists), added specifically to patch the deletion gotcha above.

## Doubly-Linked Lists {#doubly-linked-lists}

Each node adds a third field, `prev`, alongside `data` and `next` — every node now knows both what comes after it and what comes before it. This directly patches the [singly-linked deletion gotcha](#linked-lists): given a direct pointer to a node, its predecessor is sitting right there in `.prev`, no traversal required. Deletion given a direct node pointer becomes genuinely O(1).

Not free, in two concrete ways: **pointer overhead roughly doubles** per node (8 bytes for one pointer vs. 16 for two, on a typical 64-bit system — pure overhead paid on every node whether the backward link is ever used or not), and **every splice touches more pointers** — insertion writes 4 (the new node's `prev` and `next`, plus each neighbor's one link back to it), middle-node deletion writes 2. "Just always use doubly-linked, it's strictly more capable" isn't quite right: it trades memory and bookkeeping for backward navigation and O(1) deletion-by-pointer — worth it exactly when one of those is actually needed.

**Deletion, case by case** — this is where the extra field earns its keep:

```
Middle node B, given a pointer straight to B:
  B.prev.next = B.next     (predecessor now points forward past B)
  B.next.prev = B.prev     (successor now points backward past B)
  — 2 writes, O(1), no traversal, because B already names both neighbors.

Head node A (no predecessor to update):
  head = A.next
  A.next.prev = null
  — the "update predecessor's next" step doesn't exist; a distinct branch, not the same 2 lines.

Tail node (mirror image, no successor to update):
  tail = tail.prev
  tail.next = null

Single-node list (both neighbors absent simultaneously):
  head = null; tail = null
  — neither the head-case nor the tail-case line applies; needs an explicit guard or it dereferences null.
```

**What it doesn't fix:** doubly-linked gives no O(1) random access — "give me the 500th element" is still O(n), just with the option to walk from whichever end is closer. It fixes navigation direction and deletion-by-pointer, not indexed lookup; "it has more pointers now" doesn't mean "it behaves like an array."

The canonical real-world synthesis: an LRU cache pairs a hash map (key → node pointer, O(1) lookup) with a doubly-linked list (O(1) move-to-front / evict-from-tail) — advanced, since it composes two already-taught structures together (see Intermediate & Advanced Topics below).

Deps: [Linked Lists](#linked-lists). Contrasts: [Linked Lists](#linked-lists) (singly vs. doubly) — see that section for the deletion gotcha this one exists to solve.

## Stacks {#stacks}

LIFO — last in, first out. The canonical use case is undo functionality: each action pushes onto the stack, and undo pops the most recent one off.

## Queues {#queues}

FIFO — first in, first out.

## Big O Notation {#big-o}

The core concept is growth rate — how the cost of an operation scales as input size grows, not the exact cost at any one size. O(1), O(log n), O(n) and O(n²) come first; O(n log n) is covered at the end of this section.

**Constant factors are dropped** — Big-O describes the *shape* of growth, not an exact operation count. This is why the base of a logarithm never appears in the notation: O(log₂ n) and O(log₁₀ n) are the same class, since log₂(n) = log₁₀(n) / log₁₀(2) — a constant multiplier apart, nothing more. By convention log-time algorithms are described (and usually analyzed) in base 2, because most of them work by repeatedly halving the problem.

**Why halving specifically makes logs so cheap:** log_b(n) answers "how many times can I divide n by b before reaching 1?" That's a count of halvings, not a count of items. The mechanical consequence: *doubling n only costs one more step* — n = 1000 → 2000 costs exactly one extra halving, the same way n = 1,000,000 → 2,000,000 does. Linear cost has no such shortcut: doubling n doubles the work, full stop. That asymmetry — one more step vs. twice the steps, for the identical change to the input — is the entire reason O(log n) is considered "cheap" and O(n) isn't.

**Best, worst, and average case** are separate axes from the growth-rate classes above — any of O(1)/O(log n)/O(n)/O(n²) can be attached to any of the three. When a Big-O is stated with no case named, the convention is **worst case** — the one guarantee that holds regardless of what the input looks like, unlike average case, which depends on assumptions about the input distribution that may not hold in practice.

*Linear search* (scan an unsorted list of n items for a target) makes the three cases concrete:

```
Best case:    target is item[0]                    → 1 comparison     → O(1)
Worst case:   target is item[n-1], or absent         → n comparisons    → O(n)
Average case: target equally likely anywhere          → ~n/2 comparisons → O(n)
              (or absent half the time)
```

Here average and worst both simplify to O(n) — the constant ½ gets dropped, same rule as the log-base point above. The distinction matters more elsewhere: a well-known example contrasts an algorithm whose *average*-case class is better than its *worst*-case class, which is exactly the kind of gap that makes "unspecified defaults to worst case" a meaningful convention rather than a technicality — quicksort, at the end of this section, is that example.

**O(n log n)** is what you get from n operations that each independently cost O(log n) — no rare spikes, just n multiplied by a uniform per-operation log n cost. Concrete case: building a balanced BST from scratch by inserting n items one at a time. The i-th insert lands in a tree that already holds i−1 items, so it costs ~log₂(i):

```
insert #    tree size before    cost (~log2 of insert #)    running total
1           0                    0                            0
2           1                    1                            1
3           2                    2                            3
4           3                    2                            5
5           4                    3                            8
6           5                    3                           11
7           6                    3                           14
8           7                    3                           17
```

The running total (17) tracks the naive n·log₂n estimate (8×3=24) in shape, not exact value — the gap is a lower-order term (the exact sum is log₂(n!), which works out to n log₂n minus a smaller correction), dropped by Big-O the same way constant factors are. Projected to n=64: naive estimate 384, actual sum ≈292 — same "n log n" shape holds as n grows, gap and all.

**This is not amortized analysis**, despite both being about totals across a sequence of operations. Amortized analysis (see [Arrays](#arrays) above) specifically handles a sequence where individual costs are *skewed* — most operations cheap, a few expensive — and proves the skew averages out to something better than worst-single-op × n. The balanced-tree build has no such skew: every insert genuinely costs O(log n), individually, no exceptions. The tell: are costs uniform across the sequence (→ just multiply), or is there a rare-expensive/frequent-cheap split being smoothed over (→ that's when "amortized" actually applies)?

**Merge sort** (split the list in half recursively down to singletons, then merge sorted halves back together, walking two pointers and always taking the smaller front element) reaches O(n log n) by a different route than the tree-build case, but stays in the uniform-cost bucket for the same reason: log n levels of splitting, and at *every* level, the total merge work across that level is O(n) — proportional to n regardless of how the split fell, since merging is just a linear walk. log n levels × O(n) per level = O(n log n), identical in the best, worst, *and* average case — nothing about merge sort's cost is input-dependent, so there's no best/worst/average distinction to draw for it at all. Guarantees worst-case O(n log n), which is why it's used where predictable performance matters (real-time systems); its purely sequential access pattern is why it also works well on linked lists and in external sorting (merging sorted chunks too large to fit in memory, e.g. from disk). Costs O(n) extra space for the temporary merge buffers, and is stable (equal elements keep their original relative order).

**Quicksort** (pick a pivot, partition the rest into less-than/greater-than, recurse each side — no merge step needed once both sides are sorted) is where O(n log n) vs. O(n²) actually lands on the *best/worst/average* axis above, not the amortized axis. Well-chosen pivot → partitions stay roughly balanced → log n levels, O(n) partitioning work per level, same shape as merge sort: O(n log n), both the average and best case. Badly-chosen pivot against an adversarial input (e.g. an already-sorted array with a naive first-element pivot) → partitions become maximally unbalanced, one side empty every time → recursion depth n instead of log n, each level still doing O(n) partitioning work → O(n²) worst case. This worst case is **not amortized** — a single sort call either gets unlucky pivots for that specific input or it doesn't; there's no sequence of many separate operations being averaged together within one sort call, which is the actual test for whether "amortized" applies (tempting but wrong: calling that worst case "amortized" — spiky-and-input-dependent is the best/worst/average axis, not the amortized one). Quicksort is the concrete case that makes "unspecified Big-O defaults to worst case" a meaningful convention rather than a technicality: its average case (O(n log n)) genuinely beats its worst case (O(n²)), so quoting its complexity without naming the case would be actively misleading. In practice the worst case is rare and mitigated (randomized or median-of-three pivot selection), and quicksort's in-place operation (O(log n) extra space vs. merge sort's O(n)) plus better cache locality make it the more common default in language standard libraries despite the theoretically worse worst case.

## Hash Tables {#hash-tables}

A hash function maps a key to a bucket. Two keys can land in the same bucket — collision — resolved either by chaining (each bucket holds a small list) or open addressing (probe for the next free slot). Load factor tracks how full the table is, and rehashing (growing the table and redistributing everything) keeps performance from degrading as it fills up.

Chaining insertion stays O(1) regardless of load factor — a collision just extends the bucket's list, no searching required to write. Chaining lookup slows in proportion to chain length. Open addressing is different in kind: a lookup retraces the exact same probe sequence used at insertion, so insert and lookup cost aren't separate — they're the same walk, meaning whatever slows one slows the other identically. Occupied slots also tend to bunch into runs (**primary clustering**) — think of cars forced into the next open spot when their assigned one is taken: a cluster of collisions swallows the next arrival too, and grows. This is why open addressing tends to degrade *faster* than chaining as the table fills.

**The precise claim, and its limit:** "open addressing degrades faster than chaining at the same load factor" is an *average-case* statement that assumes a well-distributed (simple uniform) hash function — each key equally likely to land in any bucket. Under that assumption chain lengths cluster tightly around the load factor, so a long chain is rare. But chaining has no structural cap: a bad or adversarial hash function (**hash flooding** — deliberately choosing keys that all collide, a real denial-of-service technique used against web frameworks with predictable hash seeds) can put every key in one bucket, giving O(n) worst-case lookup. Open addressing can't do that — since each slot holds exactly one key, no lookup ever needs more than *m* probes (the table size), regardless of hash quality. So worst-case, the ranking flips: chaining's downside is unbounded, open addressing's isn't. *Uniform hashing* and *hash flooding* haven't been studied in depth yet (see Intermediate & Advanced Topics below).

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth — tracked here deliberately rather than left as scattered asides, to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| General geometric/arithmetic series summation | Intermediate | [Arrays](#arrays) | Needed to justify amortized O(1) for growth factors other than doubling (e.g. ×1.5). Natural fit once Discrete Math covers series. |
| Cache locality | Intermediate | [Linked Lists](#linked-lists) | Why arrays tend to beat linked lists in wall-clock time even at equal Big-O, once real hardware/cache behavior enters the picture. |
| Uniform hashing assumption & hash flooding | Advanced | [Hash Tables](#hash-tables) | Why the chaining-vs-open-addressing comparison assumes a well-distributed hash function, and how adversarial input (a real DoS technique) breaks that assumption. |
| LRU cache (hash map + doubly-linked list) | Advanced | [Doubly-Linked Lists](#doubly-linked-lists) | The canonical applied pattern combining O(1) hash-map lookup with O(1) doubly-linked-list splice — composes two already-taught structures into one. |

## Where things stand

Arrays: reviewed again and extended with dynamic-array amortized analysis — the core doubling-vs-fixed-increment mechanics land cleanly, but this is only its first section-level confirmation (needs-review, not yet solid), and general series justification for arbitrary growth factors is a flagged gap, not yet taught (the ×1.5 case was predicted correctly on intuition, 2026-09-06). Linked Lists: substantially deepened 2026-09-11 — node structure, per-case operation costs, and the singly-linked deletion gotcha are understood; two scenario-question misconceptions surfaced that session (both corrected), so status reset to needs-review pending a clean recheck. Rechecked 2026-09-17 with a light confirm-only quiz targeting exactly those two spots (middle-node deletion given a direct pointer; head-node deletion) — both answered correctly with sound reasoning, so status is now solid. Doubly-Linked Lists: new section 2026-09-11, split out of the same session — the prev-pointer fix and its deletion edge cases land, with one gap flagged (the "already holding the pointer" precondition wasn't generalized into a stated rule unprompted). Stacks and Queues have never been scored on their own (page-level review only, 2026-08-30). Big O and Hash Tables carry flagged gaps from their own last reviews — see Coverage log; within Big O, calling quicksort's O(n²) worst case "amortized" was a misconception, corrected (it belongs on the best/worst/average axis). Trees has grown into its own page — see [Trees](data-structures/trees.html) for status.

## Related pages

- [Trees](data-structures/trees.html) — grew out of this page; reuses Stacks and Queues covered here for traversal.
- [APIs](../backend/apis.html) — the "likes" race condition and hash-table collision resolution are both instances of "two things want the same slot, now what?"
- [Review Schedule](../review-schedule.html) — spaced-repetition status.
