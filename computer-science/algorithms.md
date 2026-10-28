---
prose_through: 108
---

Data structures are about how data sits in memory. Algorithms are about the steps you take over that data. The two are one skill: binary search works only because the list is sorted *and* an [array](data-structures.html#arrays) lets you jump to the middle in one step. On a [linked list](data-structures.html#linked-lists), reaching the middle takes n/2 steps, so binary search loses its advantage. Data structures are the containers. Algorithms are what you do with them.

## What the domain is about {#overview}

An algorithm is a step-by-step method that turns an input into an output. The steps must be precise enough for a machine to follow. The domain asks two questions about every method. First: is it correct, meaning does it always give the right answer? Second: is it efficient, meaning how much time and memory does it need as the input grows?

The second question is what makes the domain interesting. Take 1 billion sorted names, and say you want to know if one name is in the list.

- **Method A:** check every name, one by one. The worst case is 1,000,000,000 steps.
- **Method B:** binary search. Open the list at the middle. If the middle name comes after the target alphabetically, throw away the second half. Otherwise throw away the first half. Repeat on what is left.

Each step halves the list: 1 billion, then 500 million, then 250 million, and so on. After about 30 halvings one name is left. So Method B needs about 30 steps against 1,000,000,000. Doubling the list to 2 billion costs only one more step (31), because the work grows with log n.

### Comparing methods by growth rate

Seconds depend on the machine, so we ask a different question. If the input gets 10 times bigger, how much more work happens? Call the input size *n*. For n = 1,000,000:

```
Name          Written   Steps for n = 1,000,000
------------  --------  -----------------------
Logarithmic   log n     about 20
Linear        n         1,000,000
Linearithmic  n log n   about 20,000,000
Quadratic     n²        1,000,000,000,000
```

The notation is [Big O](data-structures.html#big-o). "Binary search is O(log n)" means its work grows like log n as n grows. Quadratic work grows 100 times when the input grows 10 times.

### A better algorithm beats a faster computer

Sort 1 million items. Method X takes about n² steps, which is 10¹². Method Y takes about n log n steps, which is 2 × 10⁷. Run X on a computer 1,000 times faster, and its effective cost is 10⁹ steps. Run Y on the slow computer, and its cost is 2 × 10⁷. The slow computer with the better method wins by about 50 times. Hardware cannot fix a bad growth rate.

**Tempting but wrong:** "just time both programs and pick the faster one." Small tests lie. At n = 100, a quadratic method (10,000 steps) can beat a clever method with heavy setup work. At n = 1 million the order flips completely. Growth rate tells you what happens at sizes you have not tested.

### The map of the domain

```
Searching   -> find one item          (binary search)
Sorting     -> put items in order     (merge sort, quicksort)
Graphs      -> things and connections (shortest route, who knows whom)
Design      -> reusable strategies    (divide-and-conquer, greedy, dynamic programming)
Limits      -> what cannot be solved fast (hard problems)
```

Search and sort are the classic foundational examples, but they are not the whole domain. Shortest path, minimum spanning trees, scheduling and knapsack are neither search nor sort. Sorting also exists largely to make searching cheap: sort once, then binary search many times. A fairer one-line statement is this. Algorithms are about computing a correct answer efficiently. The design strategies (divide-and-conquer, greedy, dynamic programming) are what let one idea solve thousands of different problems.

### Where it wins in practice

- **Geospatial work:** the nearest hospital and the shortest road route are graph and search problems. A naive nearest-neighbour check over 10 million map points is slow. A spatial index makes it fast.
- **Data science:** training a model repeats the same calculation millions of times, so a method that is 2 times better saves days.
- **GPUs:** a GPU runs thousands of small tasks at once. Which algorithms split cleanly into independent pieces decides what a GPU can speed up.
- **Engineering and interviews:** you often have to judge whether something still works at 100 times the data.

Three ideas here go beyond the current depth: what cannot be solved fast, parallel algorithms on GPUs, and spatial indexes. They are in the table at the bottom of this page.

The sections below cover each topic in turn. Most of them are still outlines: each says what it will cover and which earlier topics it leans on.

## Binary Search {#binary-search}

*Not yet covered.* Finding one item in a sorted list of 1,000,000 by halving the search range each step. That takes about 20 steps, because 2 to the power 20 is about 1,000,000. Plain scanning takes up to 1,000,000 steps. Will cover: why the list must be sorted, why it needs an [array](data-structures.html#arrays) (jumping to the middle must be O(1)), and why it does not work on a [linked list](data-structures.html#linked-lists).

## Recursion & Recurrences {#recursion}

*Not yet covered.* A function that solves a problem by calling itself on a smaller piece of it. Will cover: the base case (where it stops), how each pending call waits on the call [stack](data-structures.html#stacks), what happens when that stack runs out, and how to write a cost as a recurrence. Example of a recurrence: "the cost for n items is twice the cost for n/2 items, plus n".

## Simple Sorts (Selection & Insertion) {#simple-sorts}

*Not yet covered.* Two sorts that take O(n²) steps. For 1,000 items that is about 1,000,000 comparisons. Will cover: how each one works step by step, why insertion sort is fast on a list that is almost sorted already, and two properties every sort is judged on. "In-place" means it needs no extra copy of the data. "Stable" means equal items keep their original order.

## Merge Sort & Quicksort {#divide-and-conquer-sorts}

*Partly covered, on another page.* Both sorts were introduced inside [Big O Notation](data-structures.html#big-o), as the worked examples of best, worst and average case. They take O(n log n) steps. For 1,000 items that is about 10,000 comparisons instead of 1,000,000. Both split the problem in half and recurse, building on [recursion](#recursion). Still to cover here: how each one actually runs step by step, why no comparison sort can beat O(n log n), and the counting and radix sorts that get around that limit by not comparing items.

## Graph Traversal (BFS & DFS) {#graph-traversal}

*Not yet covered.* Visiting every node of a graph. A graph is a set of points joined by lines, such as people and friendships, or cities and roads. Breadth-first search (BFS) explores level by level using a [queue](data-structures.html#queues). Depth-first search (DFS) goes as deep as it can first, using a [stack](data-structures.html#stacks). Will cover: why swapping one structure for the other changes the visiting order, and why BFS finds the fewest-hops route.

## Greedy Algorithms {#greedy}

*Not yet covered.* Algorithms that take the best-looking choice at each step and never go back. Will cover: when that is guaranteed to give the best overall answer, and a counterexample where it is not. The usual counterexample is making change for 30 with coins of 1, 15 and 25. Greedy picks 25 + 1 + 1 + 1 + 1 + 1, which is 6 coins. The best answer is 15 + 15, which is 2 coins.

## Shortest Paths (Dijkstra) {#shortest-paths}

*Not yet covered.* Finding the cheapest route when roads have different lengths, where BFS's "fewest hops" is no longer enough. Builds on [graph traversal](#graph-traversal) and the [greedy](#greedy) idea. Will cover: how Dijkstra's algorithm always settles the closest unsettled city next, why it needs a priority queue (a structure that hands back the smallest item first), and why it breaks when some roads have negative lengths.

## Dynamic Programming {#dynamic-programming}

*Not yet covered.* Solving a problem by solving its smaller sub-problems once each, and storing the answers so they are never recomputed. Will cover: the Fibonacci example, where plain recursion makes about 3.7 billion calls to compute the 45th number but storing answers needs only 45 steps. Also: storing answers top-down (memoization, often in a [hash table](data-structures.html#hash-tables)) versus filling a table bottom-up, and how dynamic programming fixes the coin problem that [greedy](#greedy) gets wrong.

## Where things stand

The overview is covered: what an algorithm is, why growth rate matters more than raw speed, and the map of the domain. Two check-in questions were answered correctly. Binary search on 2 billion items takes 31 steps, because the steps grow with log n. Quadratic work grows 100 times when the input grows 10 times. One framing was corrected: search and sort are the classic examples but not the whole domain. Next up are the design strategies (divide-and-conquer, greedy, dynamic programming). Every other section below is still an outline, apart from merge sort and quicksort, which came up as Big O examples.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth, tracked here to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| What cannot be solved fast (NP-hardness) | Intermediate | [What the domain is about](#overview) | The "Limits" part of the map: some problems have no known fast method, and knowing which ones saves you from searching for one. |
| Parallel algorithms on GPUs | Intermediate | [What the domain is about](#overview) | A GPU runs thousands of small tasks at once, so which algorithms split into independent pieces decides what it can speed up. |
| Spatial indexes (k-d trees, R-trees) | Intermediate | [What the domain is about](#overview) | They make nearest-neighbour search over millions of map points fast, where a naive check over 10 million points is slow. |

## Related pages

- [Data Structures](data-structures.html) — every algorithm here runs on one of these structures
- [Trees](data-structures/trees.html) — searching a binary search tree is binary search on a linked structure
