---
prose_through: 124
---

:::callout
**Trees is now its own page** — it outgrew being a section here once BST mechanics needed a section of their own. See [Trees](data-structures/trees.html).
:::

:::callout
**Stacks and Queues are now their own page.** They were two short sections here. They now sit together on [Stacks & Queues](data-structures/stacks-and-queues.html), with room for the harder material about them.
:::

## Arrays {#arrays}

Contiguous memory layout — elements sit back-to-back in memory, which is what makes indexed access O(1): the address of element *i* can be computed directly from the base address (base + *i* × element size), no searching required. In a chat app that holds its last 10,000 messages in an array, showing message 7,342 is one calculation, not a search. That same contiguity is the cost: inserting or resizing can require shifting or copying everything, O(n).

**Deleting from the front.** Suppose the oldest message (position 0) must go. Overwriting it with a placeholder such as "NA" is O(1), but it is not a real delete. The slot still exists, the oldest real message is now at position 1 (so "position 0 is the oldest" is no longer true), and every further delete leaves another hole at the front. A real delete keeps the array packed with no holes, so all 9,999 remaining messages shift one slot left: O(n), because contiguity forces the whole block to stay packed. Tempting but wrong: treating "overwrite with a placeholder" as the cost of deleting. The way around the shifting is to remember where the data now starts instead of moving it, which is the idea behind a [queue](data-structures/stacks-and-queues.html#queues).

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

Every cycle is the same shape scaled up (at 10,000 slots, ×1.5 is 15,000 of work over 5,000 appends, still 3), so the average is constant for any fixed factor above 1. In general a factor of g costs g/(g−1) per append. The reason is the same one-cycle count as in the table. Copying n items buys (g − 1) × n free appends, so one cycle costs n + (g − 1) × n = g × n of work over (g − 1) × n appends, and g × n ÷ (g − 1) × n = g/(g−1). Check with ×3 on a full array of 60 slots: the resize copies 60 items and buys 120 free appends, so the cycle costs 60 + 120 = 180 over 120 appends, which is 1.5, and 3 ÷ 2 is also 1.5. Tempting but wrong: dividing the cycle's work by the array's size, which gives 1.5 for ×1.5 and would make it look cheaper than doubling. A smaller factor means more frequent resizes, so it must cost *more* per append (3 versus 2), not less. The growth factor changes the size of the constant, not the O(1) label. That is the trade-off real implementations make: ×1.5 wastes less memory than ×2 but costs more per append. The formal proof across all cycles at once uses the sum of a geometric series (see Intermediate & Advanced Topics below).

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

## Heaps & Priority Queues {#heaps}

A **priority queue** is a queue that hands back the most urgent item, not the oldest. Think of a hospital emergency room, or an operating system choosing which task to run next. A **heap** is the structure that makes this fast. The priority queue is the idea; the heap is how you build it.

With 1,000,000 waiting items, the two obvious structures each make one operation painful:

| Structure | Add an item | Find the smallest |
|---|---|---|
| Unsorted array | 1 step | Scan all 1,000,000 |
| Sorted array | Shift up to 1,000,000 items | 1 step |
| Heap | About 20 steps | 1 step |

**What a heap is.** A heap is a binary tree with two rules. This page uses the min-heap version, where the smallest item is the most urgent.

- **Shape rule:** fill the tree one level at a time, left to right, with no gaps.
- **Order rule:** every parent is smaller than or equal to its children.

```
          3
        /   \
       8     5
      / \   / \
    12   9 7   6
```

**A heap is not a binary search tree.** A BST puts everything smaller on the left and everything larger on the right. A heap promises nothing between siblings. In the tree above, 8 is on the left and 5, the smaller one, is on the right. Only the root is guaranteed to be the smallest. The second-smallest is one of the root's two children (here 5), but you have to compare both to know which. For the same reason there is no way to steer a search. A value like 7 could sit in either subtree, so finding an arbitrary value can mean checking every item: O(n), against O(log n) in a balanced [BST](data-structures/trees.html#bst). What a heap is good at is adding items and removing the smallest, quickly. That pair of operations is what makes it a priority queue.

**Stored in an array.** The shape rule leaves no gaps, so the tree flattens into an [array](#arrays) level by level, with no pointers:

```
index:   0   1   2   3    4   5   6
value:  [3,  8,  5,  12,  9,  7,  6]
```

The children of index *i* are at 2*i* + 1 and 2*i* + 2. The parent of index *i* is at (*i* − 1) divided by 2, rounded down. Check with real numbers: the children of index 1 (the value 8) are indexes 3 and 4, which hold 12 and 9. The parent of index 5 (the value 7) is index 2, which holds 5.

**Adding an item (sift up).** Put the new item at the end of the array. That is the next open slot, so the shape rule stays true. Then swap it up while it is smaller than its parent. Add 4 to the heap above:

```
[3, 8, 5, 12, 9, 7, 6, 4]    4 lands at index 7, under 12
4 < 12  → swap               4 is now under 8
4 < 8   → swap               4 is now under 3
4 > 3   → stop
[3, 4, 5, 8, 9, 7, 6, 12]
```

An item can climb at most the height of the tree. A heap of 1,000,000 items has about 20 levels, because each level doubles the number of slots and 20 levels hold about a million. So an add costs at most about 20 swaps: O(log n). It is the halving idea of binary search, run in reverse. The worst case is a new item smaller than everything else, which climbs every level.

**Removing the smallest (sift down).** The smallest item is at index 0, so looking at it is 1 step. Removing it leaves a hole at the top. The method is to move the **last** item of the array to the root, then swap it down with its **smaller** child until it fits. Remove the 3 from the original heap:

```
[3, 8, 5, 12, 9, 7, 6]
move the last item (6) to the root:  [6, 8, 5, 12, 9, 7]
children of 6 are 8 and 5; smaller is 5; 6 > 5 → swap:  [5, 8, 6, 12, 9, 7]
6 now has one child, 7; 6 < 7 → stop
```

It also costs at most one swap per level, so O(log n). Take the smaller child because the new parent must be less than or equal to *both* children. Swapping with the larger child (8) would put 8 above 5 and break the order rule. A second example: removing the 2 from `[2, 5, 4, 9, 6, 7]` moves 7 to the root, giving `[7, 5, 4, 9, 6]`. Then 7 swaps with the smaller child 4 and sits at index 2. Its would-be child slot, index 5, no longer exists, so it stops at `[4, 5, 7, 9, 6]`.

**Tempting but wrong: slide a child up into the empty hole.** This looks natural. Promote a child into the root, then a grandchild into that hole, and so on. It is not as expensive as it looks, because the hole travels down one path, about log n slides and not n. The real problem is the shape rule. The hole ends up somewhere in the middle of the bottom level instead of at the end of the array. The array then has a gap, and the arithmetic for finding parents and children stops working. Moving the last item keeps the array gap-free, so only the order rule needs repairing afterward.

**Where this wins.**

- A hospital triage queue or an operating system scheduler always needs the most urgent item next.
- To keep the 10 largest values from a stream of billions, hold a min-heap of size 10. Each new value only has to be compared with the smallest of your current 10.
- Shortest-path algorithms, such as route-finding, repeatedly need the closest unexplored place.

Compared with a [queue](data-structures/stacks-and-queues.html#queues), which serves the oldest item first, a priority queue serves the most urgent. The heap lives in an array, and its height comes from the same level-by-level shape that gives a balanced tree its log n bound.

## Graphs {#graphs}

Many real things are dots joined by lines, not lists or trees. People and friendships. Cities and roads. Web pages and links. A **graph** is the structure for that.

**What a graph is.** A graph is two things: a set of **vertices** (the dots) and a set of **edges** (the lines between them). Take five people, Asha, Ben, Chen, Dev and Esha. There are four friendships: Asha-Ben, Asha-Chen, Ben-Chen and Chen-Dev. Esha has no friends yet. That makes 5 vertices and 4 edges.

```
   Asha ---- Ben
     \       /
      \     /
       Chen ---- Dev

   Esha
```

A few words come up again and again:

- **Neighbors:** two vertices joined by an edge. Chen's neighbors are Asha, Ben and Dev.
- **Degree:** how many edges touch a vertex. Chen has degree 3, Dev has 1, Esha has 0.
- **Path:** a walk along edges. Dev, Chen, Asha is a path of 2 edges.
- **Cycle:** a path that ends where it started. Asha, Ben, Chen, Asha is a cycle of 3 edges.
- **Connected:** every vertex can reach every other. This graph is not connected. Esha is cut off, so the graph has 2 separate pieces, called components.

**Not a list, not a tree.** A [linked list](#linked-lists) gives each item at most one next item, but Chen has three friends. A [tree](data-structures/trees.html) has exactly one path between any two nodes, so it can never contain a cycle. A cycle would give two different paths between the same pair. The Asha-Ben-Chen triangle is a cycle, so this graph is not a tree. Put another way, a tree is a graph that is connected and has no cycles. A linked list is a graph where each vertex has at most one outgoing edge. A graph is what you get when you drop those rules. It may be disconnected, and it may contain cycles.

**Storing a graph.** A graph is only an idea, dots and lines. Memory holds numbers, not drawings. So before you can ask a graph anything ("are these two friends?", "what is a route between two cities?"), you have to write it into memory in some layout. The two standard layouts are the adjacency list and the adjacency matrix, described next. The graph is the *what*. The layout is the *how*. Every graph algorithm asks questions like "who are this vertex's neighbors?" or "are these two linked?", and how fast it can ask depends on the layout you chose.

### Adjacency List vs Matrix {#representations}

Both layouts store the same graph, the five people and four friendships above.

**Adjacency list.** Each vertex gets its own array of neighbors.

```
Asha: Ben, Chen
Ben:  Asha, Chen
Chen: Asha, Ben, Dev
Dev:  Chen
Esha: (empty)
```

Every friendship appears twice, once in each person's array, because the line goes both ways. Four friendships make 8 entries. Memory is about the number of vertices plus twice the number of edges.

**Adjacency matrix.** A grid with the vertices down the side and across the top. A 1 means the two are joined. A 0 means they are not.

```
          Asha Ben Chen Dev Esha
   Asha     0    1   1    0   0
   Ben      1    0   1    0   0
   Chen     1    1   0    1   0
   Dev      0    0   1    0   0
   Esha     0    0   0    0   0
```

The matrix always has V × V cells, however few friendships exist. Here that is 5 × 5 = 25 cells. Only 8 of them are 1s (4 friendships, each written twice). The other 17 are 0s that store nothing useful.

Neither layout is a new structure. A matrix is an [array](#arrays) of arrays, and a row number plus a column number reaches a cell. A list layout is an array whose slots each hold a list of neighbors.

**Are Asha and Dev friends?** In the matrix, Asha is row 1 and Dev is column 4. You jump straight to that cell and read it. That is 1 step, however big the graph is, because both positions are known, just like indexing into an array. In the list, you scan Asha's array (2 names) or Dev's (1 name, so you would pick the shorter). The cost grows with how many friends a person has. If Asha had 1,000 friends, it could take up to about 1,000 steps. On this question, the matrix wins.

**Tempting but wrong: "the matrix answers faster, so it is the better design."** Take a social network of 1,000,000 people with about 200 friends each.

| Layout | Memory |
|---|---|
| Matrix | 1,000,000 × 1,000,000 = 1,000,000,000,000 cells (1 trillion). About 125 GB even at 1 bit per cell. |
| Lists | 1,000,000 × 200 = 200,000,000 entries (200 million). That is 5,000 times fewer. |

Each person knows only 200 of the 1,000,000 possible people, so nearly every matrix cell is 0. A graph with few edges compared with the most it could have is called **sparse**.

**Choosing.** A sparse graph favors the list. It is compact, and an edge check costs at most about 200 steps, which is tiny next to 1,000,000. A **dense** graph, where nearly every pair is connected, favors the matrix. Take a group chat of 50 people who are all friends with each other. The matrix has 50 × 50 = 2,500 cells. The lists hold 50 × 49 = 2,450 entries, because nobody is their own friend, so each person has 49 friends, not 50. The matrix agrees: its 50 diagonal cells, each person against themselves, are 0, so only 2,450 of its 2,500 cells are 1s. A common slip is to count 50 × 50 = 2,500 list entries, which treats each person as their own neighbor. The two layouts store almost the same amount here. So the matrix gives the 1-step check at almost no extra memory cost, and it wastes almost nothing. In one line: the list saves memory and pays with slower "are these two linked?" checks. The matrix gives the 1-step check and pays with memory.

One trick softens the list's cost. Keep each person's friends in a [hash table](#hash-tables) instead of a plain array, and the "are these two friends?" check drops back to about 1 step.

### Directed, Weighted & Acyclic Graphs {#graph-kinds}

So far every edge worked both ways. Real graphs bend that rule in two ways, and add a third idea.

**Directed edges.** A directed edge has a direction and is drawn as an arrow. If Asha follows a celebrity on Instagram, the celebrity does not automatically follow Asha back. One-way streets work the same way. So do links between web pages: page A can link to B without B linking back.

Storage changes in a neat way. An undirected friendship was stored twice. A directed arrow from Asha to Ben is stored once, in Asha's list only. In the matrix, the Asha row and Ben column holds a 1, and the Ben row and Asha column stays 0. So a directed matrix is no longer a mirror image of itself.

Here is an example with three web pages. A links to B, B links to C, and C links to A.

```
        A  B  C
   A    0  1  0
   B    0  0  1
   C    1  0  0
```

Row B has a 0 under A, a 1 under C, and a 0 under B itself, because B does not link to itself. Follow the arrows A, B, C, A and you are back at the start. So this graph contains a cycle.

**Two-way connections.** A graph can mix one-way and two-way connections and is still a directed graph. A two-way connection is just two arrows, one each way, such as Asha following Ben and Ben following Asha. No special edge type is needed. An undirected graph is the special case where every arrow comes paired with its twin. That is why an undirected friendship is stored twice.

**Weighted edges.** A weight is a number on an edge. On a road map, two roads can both touch Mumbai, one 150 kilometers long and the other 900. A weight can be distance, travel time or cost. In an adjacency list, store pairs instead of plain names, so Asha's entry might read "Pune, 150". In a matrix, the cell holds the weight instead of a 1, and you need a marker for "no road", such as 0 or infinity. Finding the cheapest route on a weighted graph is the job of [Shortest Paths](algorithms.html#shortest-paths).

**Acyclic graphs and DAGs.** Acyclic means no cycles. A directed graph with no cycles is a **DAG**, short for directed acyclic graph. Getting dressed is the classic example. Socks come before shoes, and shirt before jacket. Each arrow means "this must happen before that".

**Why a cycle breaks a plan.** Say a build system has task A needing B, B needing C, and C needing A. No task can go first, because every task is waiting on another task in the loop. That is a deadlock. So any "do this before that" ordering has to be a DAG. Putting tasks into a valid order is called topological sort, covered under [Types of Problems](algorithms.html#problem-types).

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth — tracked here deliberately rather than left as scattered asides, to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| General geometric/arithmetic series summation | Intermediate | [Arrays](#arrays) | The per-cycle argument already shows amortized O(1) for any fixed growth factor (×2, ×1.5, ×1.25). The formal proof across all cycles at once is the sum of a geometric series, which fits once Discrete Math covers series. |
| Cache locality | Intermediate | [Linked Lists](#linked-lists) | Why arrays tend to beat linked lists in wall-clock time even at equal Big-O, once real hardware/cache behavior enters the picture. |
| Uniform hashing assumption & hash flooding | Advanced | [Hash Tables](#hash-tables) | Why the chaining-vs-open-addressing comparison assumes a well-distributed hash function, and how adversarial input (a real DoS technique) breaks that assumption. |
| Building a heap from n items in O(n), and heapsort | Intermediate | [Heaps & Priority Queues](#heaps) | Adding n items one at a time costs O(n log n). There is a way to build a heap in O(n), and a sorting method (heapsort) built on repeated removal of the smallest. |
| Decrease-key | Intermediate | [Heaps & Priority Queues](#heaps) | Shortest-path algorithms need to lower the priority of an item already inside the heap, which the add and remove-smallest operations here do not cover. |
| LRU cache (hash map + doubly-linked list) | Advanced | [Doubly-Linked Lists](#doubly-linked-lists) | The canonical applied pattern combining O(1) hash-map lookup with O(1) doubly-linked-list splice — composes two already-taught structures into one. |

## Where things stand

Linked Lists, Doubly-Linked Lists, Hash Tables and Big O are solid. For linked lists, the two earlier misconceptions (that reordering by content is O(1), and that a pointer to a node also reaches the node before it) did not come back, and the rule "it depends on whether you already hold the pointer or must search for it" is now stated unprompted. One refinement remains: a singly-linked list can also delete in O(1) when you hold a pointer to the previous node. For hash tables, the earlier slips (assuming a key always sits in its own hashed slot, believing lookups stay fast while only inserts slow down, and not stopping at the first empty slot or handling wraparound) were resolved on a fresh worked table. Stacks and Queues now have their own page, see [Stacks & Queues](data-structures/stacks-and-queues.html) for status. Big O now separates best/worst/average case from amortized cost correctly. Arrays are solid after a clean review of the slips that came up before. Craig explains the doubling argument in his own words and works out several growth factors with the per-cycle method (×3 on 60 slots gives 1.5 per append), dividing the cycle's work by the number of appends and not by the array's size. He says a front insert or a real delete moves every item and costs O(n) every time, not only in a worst case, because the array is one contiguous block and cannot grow to the left. He also says an append at the end is amortized O(1) and not always O(1), because of the occasional resize. One precision point: when the array has a free slot at the end, the items shift one place inside the same block, and a new block is needed only at a resize. The next step is inserting in the middle of an array and cache behaviour. Heaps & Priority Queues is new and needs review. Adding an item, removing the smallest, and why an add costs about log n (20 levels for a million items) were all answered correctly. One misconception is open: asked why removal moves the last item to the root instead of promoting a child, the answer was that promoting children would move nearly every item up a level. In fact the hole travels one path, about log n slides. The real reason is the shape rule: promoting children leaves a gap in the middle of the array and breaks the index arithmetic. The next step is a fresh check on that reason. Graphs, Adjacency List vs Matrix, and Directed, Weighted & Acyclic Graphs got a first quiz. Graphs shows as needing review only because one of its parts does, since its own questions were clean. Craig described a tree as a graph that is connected with no cycles, and worked out that adding one road to a chain of six towns creates a cycle of 6 edges. For Directed, Weighted & Acyclic Graphs he wrote one-way weighted roads as an adjacency list, read a row of the matrix correctly, and explained that a cycle in course prerequisites leaves no course to start from. Adjacency List vs Matrix needs review. He picked the matrix for a dense graph of 50 friends and gave the right reason, but counted 2,500 list entries instead of 2,450 by treating each person as their own neighbor. That slip is still open, and the next step is a fresh check that a vertex is not its own neighbor. Not covered yet: the cost of listing all of one vertex's neighbors, which is cheap in a list and a full row scan in a matrix. Trees has grown into its own page, see [Trees](data-structures/trees.html) for status.

## Related pages

- [Stacks & Queues](data-structures/stacks-and-queues.html) — grew out of this page; a queue is the fix for the front-delete cost in arrays.
- [Trees](data-structures/trees.html) — grew out of this page; reuses Stacks and Queues covered here for traversal, and a heap is a tree stored in an array.
- [Algorithms](algorithms.html) — graph traversal, topological sort and shortest paths all run on graphs stored in the layouts above.
- [APIs](../backend/apis.html) — the "likes" race condition and hash-table collision resolution are both instances of "two things want the same slot, now what?"
- [Review Schedule](../review-schedule.html) — spaced-repetition status.
