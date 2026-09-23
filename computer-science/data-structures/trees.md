---
prose_through: 85
---

:::callout
**Trees started as a section of [Data Structures](../data-structures.html)** but outgrew it once terminology, traversal and BST mechanics (search, insertion, deletion) each needed sections of their own. Still conceptually a child of Data Structures, just materialized as its own page.
:::

## Terminology

A tree is a linked structure where each node can have more than one child, with one designated **root** (no parent) and any number of **leaves** (no children). A node's **depth** is its distance from the root; the tree's **height** is the depth of its deepest leaf. A **binary tree** caps every node at two children; a **binary search tree (BST)** adds an ordering invariant — for any node, everything in its left subtree is smaller and everything in its right subtree is larger — which is what makes search fast: each comparison discards an entire half of the remaining tree, the same logic as binary search. BST mechanics (search, insertion, deletion) are covered in their own section below, since they've grown enough depth to warrant it.

## Traversal

Two ways to walk a tree, and both reuse structures already covered under [Data Structures](../data-structures.html): **depth-first (DFS)** commits to one branch all the way down before backtracking to a sibling — powered by a stack, either explicit or the call stack recursion provides for free. **Breadth-first (BFS)** checks all of a node's children before moving to the next level — powered by a queue, since children are enqueued as discovered and processed in that order.

## Balance

Speed isn't automatic. If values are inserted in already-sorted order, each new node just extends one side, producing a straight chain — structurally a linked list wearing a tree's name, with search back down to O(n). **Self-balancing** BSTs (AVL, red-black) detect this kind of skew during insertion and restructure locally (rotations) to keep height near log n regardless of insertion order — mechanics deferred for now; the concept to hold onto is that balance has to be actively maintained, not assumed.

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

*Two children*: exactly one node has to fill the vacated spot, and it has to satisfy two separate constraints. (1) **Value fit** — bigger than everything in the left subtree, smaller than everything in the right. (2) **Structural safety** — removable without a collision, meaning it has at most one child of its own, so pulling it from its old spot is just the one-child/leaf case above, not another two-children mess. A tempting shortcut — promote a child of the deleted node directly — usually satisfies (1) but not (2): if that child already has a child of its own, there's no free slot left to also attach the other subtree (this is exactly the trap either side of the tree: promoting the right child fails the moment it has a left child in the way, and promoting the left child fails the moment it has a right child in the way, by the identical logic). The node guaranteed to satisfy *both* constraints, in every tree shape, is the **successor** — walk left-until-empty starting inside the deleted node's right subtree. Everything in that subtree already outranks everything on the left (constraint 1, free), and stopping because there's no left child left means it has at most a right child (constraint 2, free). (The mirror-image node — rightmost of the left subtree, the **predecessor** — works by the same logic and is an equally valid pick.) Splicing it in: copy the successor's value up into the deleted node's spot, then delete the *original* successor node using the one-child/leaf case — it's guaranteed to qualify.

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

## Where things stand

Terminology, traversal, and balance: taught and holding up on fresh probes. BST: search direction and minimum-finding solid after a corrected misconception (local vs. global minimum); insertion solid after a corrected misconception (insertion doesn't displace existing nodes); deletion now taught end to end (leaf, one child, two-children via successor), including the two-constraint reasoning for why the successor is the safe pick and why direct child-promotion generally isn't — verified against a fresh two-children scenario, answered correctly. Splicing the deposed successor's own child up (the final micro-step, e.g. 65 in the worked example above) hasn't been separately drilled — worth a quick confirm-only check next time, not a full re-teach. After BST: Graphs, Heaps, or Tries.

## Related pages

- [Data Structures](../data-structures.html) — parent page; traversal reuses Stacks and Queues covered there.
- [Review Schedule](../../review-schedule.html) — spaced-repetition status.
