---
prose_through: 106
---

:::callout
**This page is a seeded outline.** Nothing here has been taught yet. Each section says what it will cover and which earlier topics it leans on. The editor replaces each outline with real prose once a session on it is logged.
:::

Data structures are about how data sits in memory. Algorithms are about the steps you take over that data. The topics below run roughly in the order they build on each other. Every cost is stated in [Big O](data-structures.html#big-o).

## Binary Search {#binary-search}

*Not yet covered.* Finding one item in a sorted list of 1,000,000 by halving the search range each step. That takes about 20 steps, because 2 to the power 20 is about 1,000,000. Plain scanning takes up to 1,000,000 steps. Will cover: why the list must be sorted, why it needs an [array](data-structures.html#arrays) (jumping to the middle must be O(1)), and why it does not work on a [linked list](data-structures.html#linked-lists).

## Recursion & Recurrences {#recursion}

*Not yet covered.* A function that solves a problem by calling itself on a smaller piece of it. Will cover: the base case (where it stops), how each pending call waits on the call [stack](data-structures.html#stacks), what happens when that stack runs out, and how to write a cost as a recurrence. Example of a recurrence: "the cost for n items is twice the cost for n/2 items, plus n".

## Simple Sorts (Selection & Insertion) {#simple-sorts}

*Not yet covered.* Two sorts that take O(n²) steps. For 1,000 items that is about 1,000,000 comparisons. Will cover: how each one works step by step, why insertion sort is fast on a list that is almost sorted already, and two properties every sort is judged on. "In-place" means it needs no extra copy of the data. "Stable" means equal items keep their original order.

## Merge Sort & Quicksort {#divide-and-conquer-sorts}

*Not yet covered.* Two sorts that take O(n log n) steps. For 1,000 items that is about 10,000 comparisons instead of 1,000,000. Both split the problem in half and recurse, building on [recursion](#recursion). Will cover: merge sort's guaranteed cost but extra memory, quicksort's speed in practice but O(n²) worst case, and how the choice of pivot causes or avoids that worst case.

## Graph Traversal (BFS & DFS) {#graph-traversal}

*Not yet covered.* Visiting every node of a graph. A graph is a set of points joined by lines, such as people and friendships, or cities and roads. Breadth-first search (BFS) explores level by level using a [queue](data-structures.html#queues). Depth-first search (DFS) goes as deep as it can first, using a [stack](data-structures.html#stacks). Will cover: why swapping one structure for the other changes the visiting order, and why BFS finds the fewest-hops route.

## Greedy Algorithms {#greedy}

*Not yet covered.* Algorithms that take the best-looking choice at each step and never go back. Will cover: when that is guaranteed to give the best overall answer, and a counterexample where it is not. The usual counterexample is making change for 30 with coins of 1, 15 and 25. Greedy picks 25 + 1 + 1 + 1 + 1 + 1, which is 6 coins. The best answer is 15 + 15, which is 2 coins.

## Shortest Paths (Dijkstra) {#shortest-paths}

*Not yet covered.* Finding the cheapest route when roads have different lengths, where BFS's "fewest hops" is no longer enough. Builds on [graph traversal](#graph-traversal) and the [greedy](#greedy) idea. Will cover: how Dijkstra's algorithm always settles the closest unsettled city next, why it needs a priority queue (a structure that hands back the smallest item first), and why it breaks when some roads have negative lengths.

## Dynamic Programming {#dynamic-programming}

*Not yet covered.* Solving a problem by solving its smaller sub-problems once each, and storing the answers so they are never recomputed. Will cover: the Fibonacci example, where plain recursion makes about 3.7 billion calls to compute the 45th number but storing answers needs only 45 steps. Also: storing answers top-down (memoization, often in a [hash table](data-structures.html#hash-tables)) versus filling a table bottom-up, and how dynamic programming fixes the coin problem that [greedy](#greedy) gets wrong.

## Where things stand

Not started. The suggested order is the order of the sections above. Binary search comes first because it only needs arrays and Big O, which are already covered.

## Related pages

- [Data Structures](data-structures.html) — every algorithm here runs on one of these structures
- [Trees](data-structures/trees.html) — searching a binary search tree is binary search on a linked structure
