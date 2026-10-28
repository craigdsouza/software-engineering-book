---
prose_through: 109
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

Search and sort are the classic foundational examples, but they are not the whole domain. Sorting also exists largely to make searching cheap: sort once, then binary search many times. Shortest path, minimum spanning trees, scheduling and knapsack are neither search nor sort. The next section maps the whole problem space. Algorithms are about computing a correct answer efficiently. The design strategies (divide-and-conquer, greedy, dynamic programming) are the tools that let one idea solve many problems.

### Where it wins in practice

- **Geospatial work:** the nearest hospital and the shortest road route are graph and search problems. A naive nearest-neighbour check over 10 million map points is slow. A spatial index makes it fast.
- **Data science:** training a model repeats the same calculation millions of times, so a method that is 2 times better saves days.
- **GPUs:** a GPU runs thousands of small tasks at once. Which algorithms split cleanly into independent pieces decides what a GPU can speed up.
- **Engineering and interviews:** you often have to judge whether something still works at 100 times the data.

Three ideas here go beyond the current depth: what cannot be solved fast, parallel algorithms on GPUs, and spatial indexes. They are in the table at the bottom of this page.

The sections below cover each topic in turn. Most of them are still outlines: each says what it will cover and which earlier topics it leans on.

## Types of Problems {#problem-types}

It is fair to ask how many kinds of problem there are. The answer is: few. Thousands of real-world tasks exist, but each one is a classic problem in disguise. The main skill is recognising which family a new problem belongs to. There is no official count. Textbooks group the families differently, usually into somewhere around 7 to 10. The grouping below is a teaching grouping.

### Problem type versus design strategy

Two different things get mixed up here, so keep them apart.

- A **problem type** is the question you are asked: "find this item", "put these in order", "what is the cheapest route".
- A **design strategy** is the tool you use to build the method: divide-and-conquer, greedy, dynamic programming.

Problem types are few. Strategies are few. The same strategy crosses many problem types, and one problem type can be attacked with several strategies.

**Tempting but wrong:** "Algorithms is a list of thousands of separate problems, each needing its own trick." In practice a new problem is usually a known one wearing different clothes. Choosing which courses to take, in what order, is a topological sort. A spell-checker is edit distance. The cheapest wiring for a village is a spanning tree. A route app finding the nearest hospital is a shortest-path problem. Friend suggestions are graph traversal. Packing a van with the most valuable deliveries under a weight limit is knapsack.

### The families

- **Searching.** Is this item here, and where? One name among 1 billion sorted names takes about 30 steps with [binary search](#binary-search), against up to 1,000,000,000 by scanning. It shows up in dictionary lookups, finding a record, and checking whether a username is taken.
- **Sorting and ordering.** Arrange items by a key. For 1 million items, an n log n method takes about 2 × 10⁷ steps, against 10¹² for an n² method. Sorting also helps other problems. Sort once and you can binary search many times. Duplicates end up next to each other. You can rank by score.

**Graph problems** are about things and the connections between them: people and friendships, cities and roads, tasks and prerequisites. Four questions come up again and again.

- **Reachability:** can I get from A to B at all? This is [traversal](#graph-traversal), done with BFS or DFS.
- **Shortest path:** what is the cheapest route? This is [Dijkstra](#shortest-paths).
- **Spanning tree:** what is the cheapest way to connect every point? Prim and Kruskal solve it.
- **Ordering with dependencies:** which task goes first when some tasks need others done first? This is topological sort.

The remaining families:

- **Optimization under a limit.** Pick the best choice out of a huge number of possible choices, subject to a limit. Knapsack has items with weights and values, and a bag with a weight limit. You want the most value in the bag. Interval scheduling fits the most meetings into one room. Making change is another. For 30 with coins of 1, 15 and 25, the best answer is 15 + 15, which is 2 coins. Always grabbing the biggest coin first gives 25 + 1 + 1 + 1 + 1 + 1, which is 6 coins.
- **String and sequence problems.** Compare, match or compress text and other sequences. Edit distance is the fewest single-character changes that turn one word into another, and it sits behind spell-checkers. Longest common subsequence sits behind diff tools, which show what changed between two files.
- **Geometric and spatial problems.** Questions about points and shapes in space. For example, find the nearest neighbour of a point among 10 million map points. A naive check compares against all 10 million. A spatial index avoids that.
- **Numeric problems.** Arithmetic and linear algebra at scale: multiplying very large numbers, solving systems of equations, multiplying matrices. Matrix multiplication is the core calculation repeated in neural-network training, which is why its speed matters so much.

**Hard problems** are a label, not a separate family. A problem in any family is "hard" when no fast method is known. The travelling salesperson problem asks for the shortest trip that visits every city once and returns. 20 cities can be visited in 20! orders, which is about 2.4 × 10¹⁸. At 1 billion orders checked per second, that is about 77 years. Checking every possibility is hopeless, so these problems need different thinking. The formal name is NP-hardness, listed under Intermediate & Advanced Topics below.

### How strategies cross the families

```
Problem type (the question)         Typical strategy (the tool)
----------------------------------  ----------------------------------------
Sorting                             divide-and-conquer (merge sort, quicksort)
Shortest path, costs not negative   greedy (Dijkstra)
Minimum spanning tree               greedy (Prim, Kruskal)
Interval scheduling                 greedy
Knapsack                            dynamic programming
Edit distance                       dynamic programming
```

Making change for 30 with coins of 1, 15 and 25 shows why the two skills are separate. [Greedy](#greedy) solves it wrongly (6 coins). [Dynamic programming](#dynamic-programming) solves it correctly (2 coins). Recognising the problem is one skill. Picking the strategy is another.

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

The overview is covered: what an algorithm is, why growth rate matters more than raw speed, and how the field divides into problem types. Two check-in questions were answered correctly. Binary search on 2 billion items takes 31 steps, because the steps grow with log n. Quadratic work grows 100 times when the input grows 10 times. Two framings were corrected along the way. Search and sort are the classic examples but not the whole domain. And problem types (the question) are a different thing from design strategies (the tool), so they belong on separate lists. The problem-types section is new and has not been quizzed yet. Next up are the design strategies (divide-and-conquer, greedy, dynamic programming), starting with recursion. Every other section below is still an outline, apart from merge sort and quicksort, which came up as Big O examples.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth, tracked here to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| What cannot be solved fast (NP-hardness) | Intermediate | [Types of Problems](#problem-types) | The hard-problems label in [Types of Problems](#problem-types): some problems have no known fast method, and knowing which ones saves you from searching for one. |
| Parallel algorithms on GPUs | Intermediate | [What the domain is about](#overview) | A GPU runs thousands of small tasks at once, so which algorithms split into independent pieces decides what it can speed up. |
| Spatial indexes (k-d trees, R-trees) | Intermediate | [What the domain is about](#overview) | They make nearest-neighbour search over millions of map points fast, where a naive check over 10 million points is slow. |

## Related pages

- [Data Structures](data-structures.html) — every algorithm here runs on one of these structures
- [Trees](data-structures/trees.html) — searching a binary search tree is binary search on a linked structure
