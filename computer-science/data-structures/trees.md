---
prose_through: 128
---

:::callout
**Trees started as a section of [Data Structures](../data-structures.html)** but outgrew it once terminology, traversal and BST mechanics (search, insertion, deletion) each needed sections of their own. Still conceptually a child of Data Structures, just materialized as its own page.
:::

## Terminology

A tree is a linked structure where each node can have more than one child, with one designated **root** (no parent) and any number of **leaves** (no children). A node's **depth** is its distance from the root; the tree's **height** is the depth of its deepest leaf. A **binary tree** caps every node at two children; a **binary search tree (BST)** adds an ordering invariant — for any node, everything in its left subtree is smaller and everything in its right subtree is larger — which is what makes search fast: each comparison discards an entire half of the remaining tree, the same logic as binary search. BST mechanics (search, insertion, deletion) are covered in their own section below, since they've grown enough depth to warrant it.

## Traversal

Two ways to walk a tree, and both reuse structures already covered under [Data Structures](../data-structures.html): **depth-first (DFS)** commits to one branch all the way down before backtracking to a sibling — powered by a stack, either explicit or the call stack recursion provides for free. **Breadth-first (BFS)** checks all of a node's children before moving to the next level — powered by a queue, since children are enqueued as discovered and processed in that order.

## Balance

Speed isn't automatic. If values are inserted in already-sorted order, each new node just extends one side, producing a straight chain — structurally a linked list wearing a tree's name, with search back down to O(n). **Self-balancing** BSTs (AVL, red-black) detect this kind of skew during insertion and restructure locally (rotations) to keep height near log n regardless of insertion order. The concept to hold onto is that balance has to be actively maintained, not assumed. How they do it is in [Self-Balancing Trees](#balanced-trees) below.

## Binary Search Trees (BST) {#bst}

**Search direction** follows directly from the ordering invariant: at any node, compare the target to the current value — smaller goes left, larger goes right, equal means found. Each comparison discards an entire subtree, which is why search costs O(log n) on a balanced tree.

**Finding the minimum** of a whole tree means starting at the *root* and always going left until there's no left child left. Root matters specifically: any other node's subtree is a strict subset of the whole tree, so it can silently exclude smaller values sitting outside it (a node with no left child is only the minimum of its own subtree, not necessarily the whole tree — a real trap: a node reached via a right turn from some ancestor can have that ancestor be smaller than it, even though the node itself has no left child). Mechanically, going left only ever discards provably-larger material; going right risks discarding something smaller — which is exactly why the always-left walk has to start at the root, where nothing has been discarded yet.

**Insertion** is the same walk as search, run until it fails: compare, go left or right, and when the direction you'd move in doesn't exist, that empty slot is where the new node goes, as a new leaf. Insertion never displaces or moves an existing node — the invariant guarantees the walk always terminates at a gap, never a collision.

**Deletion** has three cases, and only the last one is genuinely hard.

*Leaf* (no children): just drop the parent's pointer to it.

```
    50                50
   /  \      -->      /  \
 30    70           30    70
 /
20  (delete 20)
```

*One child*: the child slides directly into the vacated spot — a promotion, nothing else changes.

```
    50                50
   /  \      -->      /  \
 30    70           40    70
   \
   40  (delete 30)
```

*Two children*: exactly one node has to fill the vacated spot, and it has to satisfy two separate constraints. (1) **Value fit** — bigger than everything in the left subtree, smaller than everything in the right. (2) **Structural safety** — removable without a collision, meaning it has at most one child of its own, so pulling it from its old spot is just the one-child/leaf case above, not another two-children mess. A tempting shortcut — promote a child of the deleted node directly — usually satisfies (1) but not (2): if that child already has a child of its own, there's no free slot left to also attach the other subtree (this is exactly the trap either side of the tree: promoting the right child fails the moment it has a left child in the way, and promoting the left child fails the moment it has a right child in the way, by the identical logic). The node guaranteed to satisfy *both* constraints, in every tree shape, is the **successor** — walk left-until-empty starting inside the deleted node's right subtree. Everything in that subtree already outranks everything on the left (constraint 1, free), and stopping because there's no left child left means it has at most a right child (constraint 2, free). (The mirror-image node — rightmost of the left subtree, the **predecessor** — works by the same logic and is an equally valid pick.) Splicing it in: copy the successor's value up into the deleted node's spot, then delete the *original* successor node using the one-child/leaf case — it's guaranteed to qualify. In the worked example below, the original 60 has only a right child, 65, so 60's parent (70) has its left pointer redirected to 65, and the original 60 node is gone.

```
       50                     60
      /  \                   /  \
    30    70      -->      30    70
         /  \                   /  \
       60    80                65    80
         \                (delete 50: successor is 60,
         65                 copy 60 up, then remove the
                             original 60 via its one child, 65)
```

## Self-Balancing Trees (AVL, Red-Black) {#balanced-trees}

A BST is only fast while it stays short and bushy. With 1,000 numbers, a bushy BST finds any one of them in about 10 steps. Feed it the same numbers already sorted (1, 2, 3 and so on up to 1,000) and every new number lands to the right of the last one. The tree becomes a single chain, and finding the last number takes 1,000 steps. A **self-balancing tree** repairs its own shape as you insert, so that cannot happen.

Take the smallest case. Insert 10, then 20, then 30 into an empty BST. 20 goes right of 10, and 30 goes right of 20. Searching for 30 takes 3 steps. That is a chain, the worst case.

**Tempting but wrong: keep the same number of elements on each side of the root.** Take 51 numbers. Put 50 at the root. Put 1 to 25 on the left, inserted in order, so they form a chain. Put 51 to 75 on the right, also a chain. Both sides of the root hold 25 numbers, so the rule is satisfied. But finding 25 takes 26 steps, where a well-shaped tree of 51 numbers needs about 6. The rule has two flaws. It only checks the root, so the mess can hide lower down. And it compares counts, when what matters is how deep each side goes.

**The AVL rule.** AVL is named after its inventors, Adelson-Velsky and Landis. The rule is: at **every** node, the height of the left side and the height of the right side may differ by at most 1. Here, height means how many levels a subtree has, counting an empty side as 0. A lone node has height 1.

A difference of 1 is slack on purpose. Demanding 0 would fail for most sizes. Any tree with 2 nodes would break it.

Counts mislead in both directions. Suppose a node has a chain of 7 nodes on the left (height 7) and a bushy tree of 7 nodes on the right (height 3). The counts are equal, but the tree is badly broken. Now suppose a node has 1 node on the left (height 1) and 3 bushy nodes on the right (height 2). The counts differ by 2, but the rule is satisfied. Compare heights, never counts.

Apply it to the chain 10, 20, 30. At node 10, the left height is 0 and the right height is 2. The difference is 2, so node 10 breaks the rule.

**The repair is a rotation.** A rotation is a small local rearrangement. It moves a few pointers, so it costs O(1) and never touches the rest of the tree. For the chain 10, 20, 30, lift 20 up and let 10 drop to its left:

```
 Before            After
 10                   20
   \                 /  \
    20     -->      10   30
      \
       30
```

It is still a valid BST, because 10 < 20 < 30. The order is preserved. Searching for 30 now takes 2 steps instead of 3.

**Fix the lowest broken node first.** Start from the tree with 20 on top, 10 on its left and 30 on its right. Insert 40. The root has left height 1 and right height 2. The difference is 1, which is allowed. Now insert 50. Two nodes break the rule: node 30 (left height 0, right height 2) and the root 20 (left height 1, right height 3, difference 2). The root only looks broken because 30's lump is too tall. Rotate at 30: lift 40 and let 30 drop to its left, with 50 staying on 40's right. The root now has heights 1 and 2, so one rotation healed both broken nodes.

```
   20                20
  /  \              /  \
 10   30     -->   10   40
        \              /  \
         40           30   50
           \
            50
```

**Tempting but wrong: use the same single rotation on a bent chain.** Insert 10, then 30, then 20. Node 10 is broken (left height 0, right height 2). But this time the lump bends. 30 is to the right of 10, and 20 is to the left of 30. Try the single rotation: lift 30 and drop 10 to its left. 20 sits between 10 and 30, so it has to go to the right of 10.

```
 10                  30
   \                /
    30     -->    10
   /                 \
  20                  20
```

Now node 30 is broken the other way (left height 2, right height 0). The rotation only mirrored the problem.

The right repair takes two rotations. First, straighten the bend by lifting the middle value above its parent. Here that means lifting 20 above 30, which gives a plain chain 10, 20, 30. Then do the single rotation you already know, lifting 20 above 10.

```
 10                 10                  20
   \                  \                /  \
    30      -->        20      -->    10   30
   /                     \
  20                      30
```

The mirror image works the same way. Insert 30, then 10, then 20. First lift 20 above 10 to get the chain 30, 20, 10. Then lift 20 above 30. The final tree is again 20 on top, with 10 and 30 below it.

**Four cases in total.** Look at the two steps from the broken node toward the tall lump. If both steps go the same way (right-right or left-left), the lump is a straight chain and one rotation fixes it. If the second step turns the other way (right-left or left-right), the lump is a bend and it needs two rotations.

**How it fits with other structures.** Rotations preserve the BST ordering, left smaller than node smaller than right, and that is why they are safe. A plain BST is fast only if the insertion order is lucky. A [heap](../data-structures.html#heaps) stays short a different way, by always filling level by level, so it never needs rotations. AVL is one of the two common self-balancing designs. The other is red-black, which is not covered yet. Further details beyond this page's depth are tracked in the table below.

## B-Trees {#b-trees}

A balanced BST with 1,000,000 keys is about 20 levels tall, so a search takes about 20 steps. In memory, that is nothing. But a large database lives on disk, where one read costs roughly 10 milliseconds. That is a round number. If every step lands on a different part of the disk, 20 steps cost about 200 ms.

Moving everything into memory is no answer. A real database can hold billions of keys that do not fit, and memory forgets everything when the power goes off. You also cannot make one disk read faster. So the goal is fewer reads. A search needs one read per level, so the tree has to be shorter.

**Disks read in blocks.** A disk cannot hand over just 8 bytes. A hard disk reads in sectors of 512 or 4,096 bytes. An SSD reads in pages, usually 4 to 16 thousand bytes. The exact size varies, but neither can give less than a whole unit. A BST node holds one key of a few bytes. Out of a 4,096-byte read, that uses 8 bytes, about 0.2%, and the whole read is still paid for. So if the disk hands you 4,096 bytes anyway, fill all of them with useful keys. A **B-tree** node is one disk block packed with hundreds of sorted keys.

**What a node holds.** A BST node holds 1 key and 2 child addresses. A B-tree node holds n keys and n+1 child addresses. A BST is the case n = 1. An address says where a child's block lives on disk, so following it costs one read.

The keys are real stored values, exactly like the value in a BST node. They are not just signposts. If the key you want is in the node, the search ends there with no further read. The children hold only the values strictly between the keys. Here is a node with 3 keys and 4 children:

```
            [ 20 | 40 | 60 ]
           /    |     |    \
          A     B     C     D
        <20   21-39  41-59  >60
```

To search for 10, go to A, because it is below 20. For 45, it is above 20, above 40 and below 60, so go to C. For 75, it is above every key, so go to D. For 60, the search stops right in the node.

**The numbers.** Take 8-byte keys and 8-byte addresses. A 4,096-byte block holds 255 keys and 256 addresses. That is 255 × 8 + 256 × 8 = 4,088 bytes, which leaves a few bytes for bookkeeping. The number of children, about 256, is called the **fan-out**. A BST has a fan-out of 2.

Now count the levels. Level 1 is the root, 1 node. Level 2 has 256 nodes. Level 3 has 65,536 nodes, and 256³ = 16,777,216 child slots. So three levels hold over 16 million keys, and 1,000,000 keys fit in about 3 levels. A search is 3 disk reads, which is 30 ms, against 200 ms for the balanced BST. That is almost 7 times faster, only because each node is wide.

At 1,000,000,000 keys the gap is bigger. 256³ is 16.7 million and 256⁴ is about 4.3 billion, so the B-tree needs 4 levels, about 40 ms. A balanced BST needs about 30 levels, because 2³⁰ is about 1 billion. That is about 300 ms. Real nodes are only guaranteed to be about half full, so the B-tree's worst case could be 5 levels, about 50 ms. That is still far below the BST.

**The extra work inside a node is cheap.** Finding the right spot among up to 255 keys sounds like more work than a BST's one comparison per step. But the block is read from disk once. After that, every comparison happens in memory. A memory comparison takes about a nanosecond, so even all 255 comparisons take about a microsecond. One disk read is 10 ms, which is 10,000 microseconds, about 10,000 times more. The keys are sorted, so binary search inside the node takes only about 8 comparisons. The lesson is that doing more work in memory to save disk reads is a good trade.

**How a B-tree stays balanced.** A BST grows downward. A new value becomes a new leaf at the bottom, and that is how chains form. A B-tree grows **upward**. Use a tiny node that holds at most 3 keys. Insert 10, 20 and 30, and they fit in one node, `[10 | 20 | 30]`. Insert 40, and there is no room. The node **splits**. A split has two steps.

- The middle key moves up into the parent. For 4 keys, take the lower of the two middle keys.
- The remaining keys divide into two nodes, one on each side of it.

Here, 10, 20, 30 and 40 give 20 moving up into a new root, with children `[10]` and `[30 | 40]`:

```
      [ 20 ]
      /    \
  [10]    [30 | 40]
```

Insert 50. It goes right of 20, and that child becomes `[30 | 40 | 50]`. That is exactly full, but legal. Insert 60, and that node overfills with 30, 40, 50 and 60. So 40 moves up into the existing root, and the rest divide into `[30]` and `[50 | 60]`:

```
        [ 20 | 40 ]
        /    |    \
     [10]  [30]  [50 | 60]
```

A split only touches the full node and its parent. Nothing elsewhere moves. Both halves start about half full, and that guarantee keeps the tree short.

**Tempting but wrong: move the middle key up and leave the other keys together in one node.** For the 60 insertion, this gives a root `[20 | 40]` with only 2 children, where the right one is `[30 | 50 | 60]`. It breaks two rules. A root with 2 keys needs 3 children, because a node with n keys has n+1 children. And the child between 20 and 40 may only hold values strictly between 20 and 40. But `[30 | 50 | 60]` mixes 30 with 50 and 60 across the key 40, so a search for 50 would be sent to the wrong place.

**Splits can cascade, and the tree grows only at the root.** Start from the tree above and insert 31, 32, 33, 34 and 35.

- 31 and 32 join the node holding 30, which becomes `[30 | 31 | 32]`.
- 33 overfills it, with 30, 31, 32 and 33. So 31 moves up into the existing root, which becomes `[20 | 31 | 40]`. Its children are `[10]`, `[30]`, `[32 | 33]` and `[50 | 60]`. The tree is still 2 levels tall.
- 34 joins `[32 | 33]`, which becomes `[32 | 33 | 34]`.
- 35 overfills it. So 33 moves up, leaving `[32]` and `[34 | 35]`.
- The parent `[20 | 31 | 40]` now has 4 keys, 20, 31, 33 and 40, so it splits too. 31 moves up, leaving `[20]` and `[33 | 40]`. The parent was the root, so a new root `[31]` appears.

```
              [ 31 ]
             /      \
        [ 20 ]      [ 33 | 40 ]
        /    \      /    |     \
     [10]   [30]  [32] [34|35] [50|60]
```

All leaves are at depth 3. The old parent's 5 children divided 2 and 3, so the rule of n+1 children holds on both sides. The rule is the same at every level, and a cascade touches at most one node per level.

The height grows only when the **root** splits. Then a new root appears on top and every leaf moves down one level together. A split below the root stays on its own level and pushes its middle key into a parent that already exists, so the height does not change. That is why all leaves always stay at the same depth, and why a B-tree cannot end up lopsided like a BST chain. Splits are also rare. Most inserts land in a leaf that has room and change only that leaf.

**How it fits with other structures.** A BST node is the n = 1 case of a B-tree node. Both keep the sorted left-to-right order. An AVL tree keeps a fan-out of 2 and stays short by rotating after the fact. A B-tree keeps every leaf at the same depth by splitting and growing upward, and its very wide fan-out makes it far shorter. It is the structure behind database indexes.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth. They are tracked here on purpose, to return to later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Red-black trees | Intermediate | [Self-Balancing Trees](#balanced-trees) | The second common self-balancing design. It uses a looser rule than AVL's height difference of 1 to decide when to restructure. |
| The AVL height guarantee | Intermediate | [Self-Balancing Trees](#balanced-trees) | A proof of how tall an AVL tree of n nodes can get at worst, which is about 1.44 times log2 of n. That is what turns "kept roughly balanced" into a hard promise for search. |
| Rebalancing after deletion | Intermediate | [Self-Balancing Trees](#balanced-trees) | This page only covers rebalancing after an insert. Removing a node can also break the rule, and the repair has its own cost to work out. |
| B+ trees | Intermediate | [B-Trees](#b-trees) | A variant where the records live only in the leaves, and the keys in the inner nodes are copies. The leaves are linked to each other, which makes scanning a range of keys easy. It is the variant most databases use. |
| B-tree deletion and minimum fill | Intermediate | [B-Trees](#b-trees) | This page only covers inserting, where a full node splits. Removing a key can leave a node too empty, and the repair is to borrow from a neighbour or merge with it. The rule for how empty a node may get is what gives the half-full guarantee. |
| The B-tree height bound | Intermediate | [B-Trees](#b-trees) | A proof of how tall a B-tree can get when nodes are only guaranteed to be about half full. For 1,000,000,000 keys at a fan-out of 256, the worst case is about 5 levels. |
| Caching the top levels in memory | Intermediate | [B-Trees](#b-trees) | The root and the levels just below it are read by every search, so they can stay in memory. That would cut the number of disk reads per search even further. |

## Where things stand

Terminology, traversal, and balance: taught and holding up on fresh probes. BST: search direction and minimum-finding solid after a corrected misconception (local vs. global minimum); insertion solid after a corrected misconception (insertion doesn't displace existing nodes); deletion now taught end to end (leaf, one child, two-children via successor), including the two-constraint reasoning for why the successor is the safe pick and why direct child-promotion generally isn't — verified against a fresh two-children scenario, answered correctly. The final micro-step, splicing the removed successor's own child up (65 in the worked example above), has now been walked through correctly on a fresh tree: with 30 (children 20 and 40), 70 (children 60 and 80) and 65 under 60, deleting the root 50 gives root 60, with 65 as 70's left child. Self-Balancing Trees: taught and quizzed once. Three questions were asked. The rotation question (insert 30, 10, 20, which needs two rotations because the chain bends) was answered fully correctly, including the order of the two rotations. One misconception came up. When asked what the AVL rule checks, the answer was that it compares the number of nodes on each side. It compares heights, not counts. A fresh retest with different numbers (a node with 6 bushy nodes against 2 in a short chain, and a node with a 6-node chain against 6 bushy nodes) was then answered correctly by comparing heights. It is still worth rechecking later without a hint, because the first answer was wrong. B-Trees: taught and quizzed once, in the same sitting. Three questions were asked. What a node holds (n keys and n+1 children) and why its size matches a disk block was answered correctly. So was the prediction for 1,000,000,000 keys, about 30 levels and 300 ms for a balanced BST against 4 levels and 40 ms for a B-tree. One misconception came up. When asked why a B-tree cannot end up with leaves at different depths, the answer said that every overflow creates a new parent and adds a level. Only an overflow of the root does that. Any other split pushes the middle key into the parent that already exists, and the height stays the same. The same person had traced inserting 31 to 35 correctly earlier, so this looks like loose wording rather than a gap in understanding. It is still worth rechecking later with a fresh case, because the answer as written was wrong. Along the way, a first attempt at a split moved the middle key up but left the remaining keys together in one node. That was fixed with the rule of n+1 children and the rule that a child holds only values between its two keys. Not covered yet: red-black trees, the worst-case height of an AVL tree, rebalancing after a deletion, B+ trees, deleting from a B-tree, and the B-tree height bound. Next in this area: recheck when a split makes a B-tree taller.

## Related pages

- [Data Structures](../data-structures.html) — parent page; traversal reuses Stacks and Queues covered there.
- [Review Schedule](../../review-schedule.html) — spaced-repetition status.
