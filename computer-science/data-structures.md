---
prose_through: 104
---

:::callout
**Trees is now its own page** — it outgrew being a section here once BST mechanics needed a section of their own. See [Trees](data-structures/trees.html).
:::

## Arrays {#arrays}

Contiguous memory layout — elements sit back-to-back in memory, which is what makes indexed access O(1): the address of element *i* can be computed directly from the base address (base + *i* × element size), no searching required. In a chat app that holds its last 10,000 messages in an array, showing message 7,342 is one calculation, not a search. That same contiguity is the cost: inserting or resizing can require shifting or copying everything, O(n).

**Deleting from the front.** Suppose the oldest message (position 0) must go. Overwriting it with a placeholder such as "NA" is O(1), but it is not a real delete. The slot still exists, the oldest real message is now at position 1 (so "position 0 is the oldest" is no longer true), and every further delete leaves another hole at the front. A real delete keeps the array packed with no holes, so all 9,999 remaining messages shift one slot left: O(n), because contiguity forces the whole block to stay packed. Tempting but wrong: treating "overwrite with a placeholder" as the cost of deleting. The way around the shifting is to remember where the data now starts instead of moving it, which is the idea behind a [queue](#queues).

**Why a resize must copy.** Take an array of 100 numbers in addresses 1000 to 1399, with another program's data starting at 1400.

```
[ 1000 ......... 1399 ][ 1400 .... other data .... ]
   your array (full)       someone else's memory
```

The array cannot claim address 1400, because it is in use, so it must be copied into a new, bigger block. The alternative would be to let an array's items sit anywhere there was room. That would save the copying, but the O(1) index formula only works because every item sits at a fixed spacing in one block. Scatter the items and you lose O(1) lookup and have to traverse.

**Dynamic arrays** (the kind behind Python's `list`, Java's `ArrayList`, etc.) hide that resize cost behind an amortized guarantee. Appending is "amortized O(1)" even though any individual append might trigger a full copy. There are two cases for a single append: if there is spare room it costs 1 step, and if the array is full it costs one copy of every item (about 10,000 steps for the chat app), once.

The reason the average stays small is specifically a *multiplying* growth strategy, not just "resizing infrequently." Growing by a fixed increment each time (say, +4 slots) makes the resize copy-costs an arithmetic sequence — 4, 8, 12, 16, ... — that sums to roughly n²/(2k) over n appends: the average cost per append keeps climbing as n grows, which is O(n), not O(1). Growing by doubling makes the copy-costs a geometric sequence — 1, 2, 4, 8, ... — that sums to roughly 2n: bounded by a constant multiple of n forever, so the average cost per append settles at a constant (around 2 units of work per append) no matter how large the array gets. Worked by hand over 16 appends (step by step: fixed growth totals 40, doubling totals 31) and projected to n=64 to see the trend diverge — fixed growth's average kept climbing (≈8.5) while doubling's stayed flat (≈1.98). The dividing line is arithmetic vs. geometric growth in the resize schedule, not resize frequency alone.

**Any fixed growth factor works, with a different constant.** The cleanest way to see it is one cycle at a time. Copying n items buys some number of free appends, and the average is the cycle's total work divided by the number of appends *in that cycle* (not by the array's size):

```
growth    full at n = 100, grows to    free appends    work per cycle        average per append
x2        200                          100  (n)        n + n     = 2n        2
x1.5      150                           50  (0.5n)     n + 0.5n  = 1.5n      1.5n / 0.5n  = 3
x1.25     125                           25  (0.25n)    n + 0.25n = 1.25n     1.25n / 0.25n = 5
```

Every cycle is the same shape scaled up (at 10,000 slots, ×1.5 is 15,000 of work over 5,000 appends, still 3), so the average is constant for any fixed factor above 1. In general a factor of g costs g/(g−1) per append. Tempting but wrong: dividing the cycle's work by the array's size, which gives 1.5 for ×1.5 and would make it look cheaper than doubling. A smaller factor means more frequent resizes, so it must cost *more* per append (3 versus 2), not less. The growth factor changes the size of the constant, not the O(1) label. That is the trade-off real implementations make: ×1.5 wastes less memory than ×2 but costs more per append. The formal proof across all cycles at once uses the sum of a geometric series (see Intermediate & Advanced Topics below).

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

**Reordering by content pays for the search too.** Moving a named song to the top of a 10,000-song playlist stored as a singly-linked list is O(n), not O(1). The splice itself is cheap (`previous.next = target.next`, then `target.next = head`, then `head = target`), but it needs the node *before* the target, and with only a title to go on the only way to find it is to walk forward from the head, remembering the previous node as you go. Knowing the song's index doesn't help: a linked list has no direct access by position, so the walk is still O(n). Holding a direct pointer to the target doesn't help either, for the same reason as the deletion gotcha above. Tempting but wrong: assuming the O(1) splice cost applies to any rearrangement, when the search for the splice point is usually where the cost lives.

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

**The general rule: does the operation need a search?** In a 10,000-line document stored as a doubly-linked list, with the cursor on line 5,000 and a pointer already held to that node, "delete the current line" is O(1): no search is needed, and both neighbours are reachable from the node itself. "Find the line containing TODO and delete it" is O(n): the search dominates, and the cheap delete that follows doesn't change that. For any linked-list operation, if it needs a search for the item or for its predecessor, it costs O(n); if it doesn't, the cost is just the splice. A doubly-linked list isn't the only way to skip the search: a singly-linked list can also delete in O(1) if you already hold a pointer to the node *before* the target. The real condition is being able to reach the previous node without searching, and a doubly-linked list guarantees that for every node.

**What it doesn't fix:** doubly-linked gives no O(1) random access — "give me the 500th element" is still O(n), just with the option to walk from whichever end is closer. It fixes navigation direction and deletion-by-pointer, not indexed lookup; "it has more pointers now" doesn't mean "it behaves like an array."

The canonical real-world synthesis: an LRU cache pairs a hash map (key → node pointer, O(1) lookup) with a doubly-linked list (O(1) move-to-front / evict-from-tail) — advanced, since it composes two already-taught structures together (see Intermediate & Advanced Topics below).

Deps: [Linked Lists](#linked-lists). Contrasts: [Linked Lists](#linked-lists) (singly vs. doubly) — see that section for the deletion gotcha this one exists to solve.

## Stacks {#stacks}

LIFO — last in, first out. The canonical use case is undo functionality: each action pushes onto the stack, and undo pops the most recent one off.

A second use is checking that brackets are balanced. Read the text left to right, push each opening bracket, and when a closing bracket arrives compare it with the top of the stack: the top must be its matching opener, otherwise the check fails. For `( [ ) ]` the stack takes `(` then `[`, and the third character `)` arrives while the top is `[`, so the check fails right there.

## Queues {#queues}

FIFO — first in, first out. A help desk that serves tickets first-come, first-served is the natural case. Suppose a teammate suggests a stack instead, with tickets arriving from 9:00 to 9:04 and more arriving while the agent works. A stack serves the newest ticket first, so the 9:00 ticket waits at the bottom. If tickets arrive faster than the agent clears them it may never be served. Even if the agent is faster than the arrivals, it still sits there until a lull with no new tickets. A queue serves strictly in arrival order, so how long you wait is bounded by the work ahead of you.

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

**This is not amortized analysis**, despite both being about totals across a sequence of operations. Amortized analysis (see [Arrays](#arrays) above) specifically handles a sequence where individual costs are *skewed* — most operations cheap, a few expensive — and proves the skew averages out to something better than worst-single-op × n. The balanced-tree build has no such skew: every insert genuinely costs O(log n), individually, no exceptions. The tell: are costs uniform across the sequence (→ just multiply), or is there a rare-expensive/frequent-cheap split being smoothed over (→ that's when "amortized" actually applies)? Worked on the doubling array: each cycle is one copy of about 1,024 items plus about 1,023 one-step appends, roughly 2 steps per append, and because resizes get rarer as fast as they get bigger the average stays flat. Amortized cost depends on where an operation falls in a sequence; best/worst/average depends on the input.

**Merge sort** (split the list in half recursively down to singletons, then merge sorted halves back together, walking two pointers and always taking the smaller front element) reaches O(n log n) by a different route than the tree-build case, but stays in the uniform-cost bucket for the same reason: log n levels of splitting, and at *every* level, the total merge work across that level is O(n) — proportional to n regardless of how the split fell, since merging is just a linear walk. log n levels × O(n) per level = O(n log n), identical in the best, worst, *and* average case — nothing about merge sort's cost is input-dependent, so there's no best/worst/average distinction to draw for it at all. Guarantees worst-case O(n log n), which is why it's used where predictable performance matters (real-time systems); its purely sequential access pattern is why it also works well on linked lists and in external sorting (merging sorted chunks too large to fit in memory, e.g. from disk). Costs O(n) extra space for the temporary merge buffers, and is stable (equal elements keep their original relative order).

**Quicksort** (pick a pivot, partition the rest into less-than/greater-than, recurse each side — no merge step needed once both sides are sorted) is where O(n log n) vs. O(n²) actually lands on the *best/worst/average* axis above, not the amortized axis. Well-chosen pivot → partitions stay roughly balanced → log n levels, O(n) partitioning work per level, same shape as merge sort: O(n log n), both the average and best case. Badly-chosen pivot against an adversarial input (e.g. an already-sorted array with a naive first-element pivot) → partitions become maximally unbalanced, one side empty every time → recursion depth n instead of log n, each level still doing O(n) partitioning work → O(n²) worst case. This worst case is **not amortized** — a single sort call either gets unlucky pivots for that specific input or it doesn't; there's no sequence of many separate operations being averaged together within one sort call, which is the actual test for whether "amortized" applies (tempting but wrong: calling that worst case "amortized" — spiky-and-input-dependent is the best/worst/average axis, not the amortized one). Quicksort is the concrete case that makes "unspecified Big-O defaults to worst case" a meaningful convention rather than a technicality: its average case (O(n log n)) genuinely beats its worst case (O(n²)), so quoting its complexity without naming the case would be actively misleading. In practice the worst case is rare and mitigated (randomized or median-of-three pivot selection), and quicksort's in-place operation (O(log n) extra space vs. merge sort's O(n)) plus better cache locality make it the more common default in language standard libraries despite the theoretically worse worst case.

## Hash Tables {#hash-tables}

A hash function maps a key to a bucket. Two keys can land in the same bucket — collision — resolved either by chaining (each bucket holds a small list) or open addressing (probe for the next free slot). Load factor tracks how full the table is, and rehashing (growing the table and redistributing everything) keeps performance from degrading as it fills up.

Chaining insertion stays O(1) regardless of load factor — a collision just extends the bucket's list, no searching required to write. Chaining lookup slows in proportion to chain length. Open addressing is different in kind: a lookup retraces the exact same probe sequence used at insertion, so insert and lookup cost aren't separate — they're the same walk, meaning whatever slows one slows the other identically.

The detail that is easy to get wrong: each slot holds one key, but a key does *not* always sit in its own hashed slot. A colliding key is pushed to a later slot, so a lookup can't stop after checking the slot the key hashes to. Take 10 slots (numbered 0 to 9), the hash "key mod 10" (the last digit), and linear probing (if a slot is taken, try the next one, wrapping from slot 9 back to slot 0):

```
Insert 13 → hashes to slot 3, free                  → goes in slot 3
Insert 23 → hashes to slot 3, taken → slot 4        → goes in slot 4
Insert 33 → hashes to slot 3, taken → 4 taken → 5   → goes in slot 5

slot:   3    4    5    6
       13   23   33   (empty)

Lookup 33: slot 3 holds 13, not 33 → slot 4 holds 23 → slot 5 holds 33. Found.
Lookup 53 (not in the table, also hashes to 3): slots 3, 4, 5 don't hold it,
slot 6 is empty → stop. Absent after 4 checks.
```

**The stopping rule:** a lookup walks until it finds the key or reaches an **empty slot**. An empty slot proves the key is absent, because if the key had ever been inserted it would have taken this same walk and been placed in that empty slot or earlier. Walking the entire table is only the worst case, when no empty slot exists. At a load factor of 0.9 on 10 slots, only one slot is empty, so looking up a missing key can mean checking up to 10 slots. Tempting but wrong: "lookups stay O(1) while only inserts slow down." Lookups are O(1) on average only while the load factor stays low; near a full table they pay the same long walk as inserts. Occupied slots also tend to bunch into runs (**primary clustering**) — think of cars forced into the next open spot when their assigned one is taken: a cluster of collisions swallows the next arrival too, and grows. This is why open addressing tends to degrade *faster* than chaining as the table fills.

The walk also wraps around the end of the table. Take 8 slots (0 to 7), the hash "key mod 8", and linear probing. Keys 5, 13 and 21 all hash to slot 5 and land in slots 5, 6 and 7, with slot 0 empty. Finding 21 means checking 5, then 6, then 7, because slot 5 is not the only place a key can live. Looking up the absent key 29 (it also hashes to 5) checks 5, 6, 7, then wraps to 0, where the empty slot stops the search: 4 checks, not 8. It is safe to stop because an inserted 29 would have taken the same walk and landed in slot 0 or earlier.

**The precise claim, and its limit:** "open addressing degrades faster than chaining at the same load factor" is an *average-case* statement that assumes a well-distributed (simple uniform) hash function — each key equally likely to land in any bucket. Under that assumption chain lengths cluster tightly around the load factor, so a long chain is rare. But chaining has no structural cap: a bad or adversarial hash function (**hash flooding** — deliberately choosing keys that all collide, a real denial-of-service technique used against web frameworks with predictable hash seeds) can put every key in one bucket, giving O(n) worst-case lookup. Open addressing can't do that — since each slot holds exactly one key, no lookup ever needs more than *m* probes (the table size), regardless of hash quality. So worst-case, the ranking flips: chaining's downside is unbounded, open addressing's isn't. *Uniform hashing* and *hash flooding* haven't been studied in depth yet (see Intermediate & Advanced Topics below).

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth — tracked here deliberately rather than left as scattered asides, to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| General geometric/arithmetic series summation | Intermediate | [Arrays](#arrays) | The per-cycle argument already shows amortized O(1) for any fixed growth factor (×2, ×1.5, ×1.25). The formal proof across all cycles at once is the sum of a geometric series, which fits once Discrete Math covers series. |
| Cache locality | Intermediate | [Linked Lists](#linked-lists) | Why arrays tend to beat linked lists in wall-clock time even at equal Big-O, once real hardware/cache behavior enters the picture. |
| Uniform hashing assumption & hash flooding | Advanced | [Hash Tables](#hash-tables) | Why the chaining-vs-open-addressing comparison assumes a well-distributed hash function, and how adversarial input (a real DoS technique) breaks that assumption. |
| LRU cache (hash map + doubly-linked list) | Advanced | [Doubly-Linked Lists](#doubly-linked-lists) | The canonical applied pattern combining O(1) hash-map lookup with O(1) doubly-linked-list splice — composes two already-taught structures into one. |

## Where things stand

Linked Lists, Doubly-Linked Lists, Hash Tables, Stacks, Queues and Big O are solid. For linked lists, the two earlier misconceptions (that reordering by content is O(1), and that a pointer to a node also reaches the node before it) did not come back, and the rule "it depends on whether you already hold the pointer or must search for it" is now stated unprompted. One refinement remains: a singly-linked list can also delete in O(1) when you hold a pointer to the previous node. For hash tables, the earlier slips (assuming a key always sits in its own hashed slot, believing lookups stay fast while only inserts slow down, and not stopping at the first empty slot or handling wraparound) were resolved on a fresh worked table. Stacks and Queues each got their first check on their own, and both were clean. Big O now separates best/worst/average case from amortized cost correctly. Arrays still need review. The doubling argument is now explained correctly in Craig's own words, and he worked out ×1.5 and ×1.25 with the per-cycle method, though he first divided the cycle's work by the array's size instead of by the number of appends. He also first treated deleting the oldest item as overwriting it with a placeholder (O(1)) rather than shifting everything left (O(n)), and corrected that straight away. The next step is a fresh check on both slips, then inserting in the middle of an array and cache behaviour. Trees has grown into its own page, see [Trees](data-structures/trees.html) for status.

## Related pages

- [Trees](data-structures/trees.html) — grew out of this page; reuses Stacks and Queues covered here for traversal.
- [APIs](../backend/apis.html) — the "likes" race condition and hash-table collision resolution are both instances of "two things want the same slot, now what?"
- [Review Schedule](../review-schedule.html) — spaced-repetition status.
