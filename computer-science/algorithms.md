---
prose_through: 112
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

- **Searching.** Is this item here, and where? One name among 1 billion sorted names takes about 30 steps with [binary search](#binary-search), against up to 1,000,000,000 by scanning. It shows up in dictionary lookups, finding a record, and checking whether a username is taken. For 500,000 company names sorted by name, binary search needs at most 19 steps, because 2¹⁹ = 524,288 is at least 500,000. A [binary search tree](data-structures/trees.html) gives about 19 steps only if it is balanced. A tree built by inserting names that are already in sorted order becomes a single chain, and one lookup can take up to 500,000 steps.
- **Sorting and ordering.** Arrange items by a key. For 1 million items, an n log n method takes about 2 × 10⁷ steps, against 10¹² for an n² method. Sorting also helps other problems. Sort once and you can binary search many times. Duplicates end up next to each other. You can rank by score.

**Graph problems** are about things and the connections between them: people and friendships, cities and roads, tasks and prerequisites. Five questions come up again and again.

- **Reachability:** can I get from A to B at all? This is [traversal](#graph-traversal), done with BFS or DFS.
- **Shortest path:** what is the cheapest route? This is [Dijkstra](#shortest-paths).
- **Spanning tree:** what is the cheapest way to connect every point? Prim and Kruskal solve it.
- **Ordering with dependencies:** which task goes first when some tasks need others done first? This is topological sort. The tasks form a web of arrows, not a tree: a file can need two other files, so it can have two parents. If A needs B and B needs A, no valid order exists.
- **Matching:** pair up the members of two groups at the least total cost. 50 drivers and 50 riders have 50! (about 3 × 10⁶⁴) possible pairings, so checking them all is hopeless. A fast method needs roughly 50³ = 125,000 steps. With 8 vans and 8 delivery zones there are only 8! = 40,320 assignments, which a computer checks instantly.

The remaining families:

- **Optimization under a limit.** Pick the best choice out of a huge number of possible choices, subject to a limit. You pick items from a list, like ordering from a menu. Knapsack has items with weights and values, and a bag with a weight limit. You want the most value in the bag. Interval scheduling fits the most meetings into one room. Making change is another. For 30 with coins of 1, 15 and 25, the best answer is 15 + 15, which is 2 coins. Always grabbing the biggest coin first gives 25 + 1 + 1 + 1 + 1 + 1, which is 6 coins.
- **Continuous optimization.** Find the best settings for knobs that can slide to any value, like a volume dial. This differs from knapsack, where you pick items from a list. Training a neural network adjusts millions of knobs this way, for example 5 million, by following the slope of the error downhill.
- **Clustering.** Split items into groups of similar ones when nobody tells you the groups in advance. For example, put 1 million bank customers into segments by spending. Good-enough methods are the usual tool.
- **String and sequence problems.** Compare, match or compress text and other sequences. Edit distance is the fewest single-character changes that turn one word into another, and it sits behind spell-checkers. Longest common subsequence sits behind diff tools, which show what changed between two files. Showing which lines changed between two versions of a 2,000-line config file is this problem.
- **Geometric and spatial problems.** Questions about points and shapes in space. For example, find the nearest neighbour of a point among 10 million map points. A naive check compares against all 10 million. A spatial index avoids that.
- **Numeric problems.** Arithmetic and linear algebra at scale: multiplying very large numbers, solving systems of equations, multiplying matrices. Matrix multiplication is the core calculation repeated in neural-network training, which is why its speed matters so much. Multiplying two 4,096 × 4,096 tables of numbers takes 4,096³, about 69 billion, multiplications by the plain method.

**Hard problems** are a label, not a separate family. A problem in any family is "hard" when no fast method is known. The travelling salesperson problem asks for the shortest trip that visits every city once and returns. 20 cities can be visited in 20! orders, which is about 2.4 × 10¹⁸. At 1 billion orders checked per second, that is about 77 years. Checking every possibility is hopeless, so these problems need different thinking. The formal name is NP-hardness, listed under Intermediate & Advanced Topics below. Choosing the fewest cell towers so that all 200 villages are in range of one is also hard. With 1,000 candidate sites there are 2¹⁰⁰⁰ (about 1.07 × 10³⁰¹) possible sets of towers. In practice you settle for a good-enough answer, for example by repeatedly adding the tower that covers the most uncovered villages.

### Recognising a problem: read the shape of the answer

A map app, a bank and a game all contain the same few problems. Only the story changes. So ask one question: what does the finished answer look like?

| The answer looks like | Family | Example |
|---|---|---|
| Yes/no, or a position in a list | Searching | Is this username taken? |
| The same items in a new order | Sorting | Rank 1 million products by rating |
| A route from A to B | Graph: shortest path | Fastest drive to a hospital |
| A set of links that joins everything | Graph: spanning tree | Least cable to join 12 villages |
| A to-do order where "X comes before Y" | Graph: dependency ordering | Compile 200 files, some needing others first |
| Pairs, one from each of two groups | Graph: matching | 50 drivers paired with 50 riders |
| A chosen subset that fits a limit | Optimization under a limit | Which orders fit a 100 kg van |
| Groups of similar things, with no groups given | Clustering | Split 1 million customers into segments |
| A number for how different two texts are | String and sequence | Spell-checker, diff |
| Closest, inside or overlapping, in space | Geometry | Nearest of 10 million map points |
| Numbers that solve equations or fit a curve | Numeric | Multiply two matrices |
| Best settings for knobs that slide smoothly | Continuous optimization | Train a neural network |

### The weight on a link does not decide the family

Cost, distance and time are just numbers on the links. The same flight network can be asked three different questions, and the shape of the answer separates them.

- **A path** is one route from A to B. The cheapest way to fly from Pune to Berlin, with stopovers allowed, is a shortest-path problem.
- **A network** is a web of links that joins everything, and it may branch. Connecting 12 cities with the least total flight distance, so that any city can reach any other, is a spanning tree.
- **A tour** is one closed loop through every stop that returns to the start. A courier leaves the depot (the home base, such as a warehouse), visits 25 stops once each and returns. That is the travelling salesperson problem, and it carries the hard label.

Cost or distance can be the weight in any of the three. When the weights are travel times, time = length ÷ average speed, never length × speed. A 10 km road at 50 km/h takes 10 ÷ 50 = 0.2 hours, which is 12 minutes. Multiplying gives 500, which means nothing.

**What a spanning tree looks like.** It is a set of links that connects every point, with no loops. Take five villages and five possible roads, with lengths in km: A-B 4, A-C 3, B-C 2, B-D 5, D-E 4. Building every road costs 4 + 3 + 2 + 5 + 4 = 18 km.

```
 A ---4--- B
  \       / \
   3     2   5
    \   /     \
      C        D ---4--- E
```

The roads A-B, B-C and A-C form a loop. A tree has no loops, so one road of the loop must go. Dropping A-B (4 km) leaves 3 + 2 + 5 + 4 = 14 km. Dropping A-C leaves 15 km. Dropping B-C leaves 16 km. This map has exactly three spanning trees, and the cheapest one is the minimum spanning tree.

```
 A         B
  \       / \
   3     2   5
    \   /     \
      C        D ---4--- E          total: 14 km
```

Five villages always need exactly 4 links, because n villages need n − 1 links. Every village can reach every other along the links. The links may branch: C and B each have two.

**A tour is not a spanning tree**, even though both reach every point. Put the depot in the centre with four stops 10 km away to the north, east, south and west.

```
            N
            |
      W --- D --- E        spokes: 4 x 10 = 40 km (a tree can branch)
            |
            S              tour: D-N-E-S-W-D = 10 + 14.14 x 3 + 10 = 62.4 km
```

A tree can branch, so four spokes cost 4 × 10 = 40 km. A courier cannot branch, because one person is in one place. The tour goes depot, north, east, south, west, depot. That is 10 + 14.14 + 14.14 + 14.14 + 10, about 62.4 km. Each corner-to-corner hop is 10 × √2 = 14.14 km. Another order, north, south, east, west, is worse at about 74.1 km. The tree is always a floor under the tour, because dropping one hop from a tour leaves a spanning tree. Shortest path names two end points. A tour must visit every stop.

### Three traps

**1. Real tasks chain several problems.** Take "show the 3 nearest open pharmacies by drive time." The steps are:

- Filter for pharmacies that are open, which is a simple search on an attribute.
- Find nearby candidates among 10 million points, which is geometry.
- Work out the drive time to each candidate, which is shortest path.
- Sort by drive time.

Close in a straight line is not close by road. A pharmacy 1 km away across a river may be 25 minutes by road. So take about 10 nearby candidates, compute drive times for all of them, and keep the best 3. Choosing the fewest cell towers is a chain too. A geometry step works out which villages each candidate site covers. Then comes the subset choice, which carries the hard label. Name each step before choosing any method.

**2. Looks hard, isn't.** Pairing 50 drivers with 50 riders has about 3 × 10⁶⁴ possibilities, yet matching has a fast method. The number of possibilities does not tell you the problem is hard.

**3. Looks easy, isn't.** Visiting 25 stops and returning with the least distance feels like shortest path. Check whether the question names a start and an end (a path) or says to visit everything and return (a tour).

### Hard problems: is there a right answer, and a method?

Take the cell-tower problem: choose the fewest towers so that each of 200 villages is within range of at least one. Its formal name is set cover. Yes, there is a right answer. Some smallest number of towers exists, and a best set achieves it. "Hard" does not mean there is no answer. It means no method is known that is both always right and fast on every input. There are four options.

- **Try every set of towers.** This is always right and hopeless in time. 1,000 candidate sites give 2¹⁰⁰⁰ (about 1.07 × 10³⁰¹) sets.
- **Greedy.** Repeatedly add the tower that covers the most still-uncovered villages. It is fast but not always best. Take 6 villages. Tower T1 covers villages 1, 2, 3 and 4. T2 covers 1, 3 and 5. T3 covers 2, 4 and 6. Greedy takes T1 first, because it covers 4. Then it needs T2 for village 5 and T3 for village 6, so 3 towers. The best is T2 + T3, which covers all six with 2 towers. A known result says greedy is never worse than about ln(n) + 1 times the best. For 200 villages that is ln(200) + 1, about 6.3 times. In practice it is usually much closer.
- **Exact solvers for real instances.** "Hard" describes the worst case. Many real instances of a few hundred villages can be solved exactly, with a proof that the answer is best, by integer-programming or branch-and-bound solvers.
- **Use the problem's structure.** Tower range is a circle on a map, and that geometry can allow better methods than the general case.

This is the same pattern as making change for 30 with coins of 1, 15 and 25, where [greedy](#greedy) gives 6 coins and the best is 2. For a hard problem you accept one of two things: "good enough, with a known worst case", or "exact, but only for the sizes a solver can handle".

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

**Tempting but wrong for knapsack: pick by value per kg.** The goal is the most tips earned while staying within the limit. Taking the best tip per kg first is one method for reaching it, and it can miss. A rider can carry 10 kg. Order A weighs 2 kg and tips 12, which is 6 per kg. Order B weighs 4 kg and tips 20, which is 5 per kg. Order C weighs 6 kg and tips 24, which is 4 per kg. Taking the best tip per kg first, with no going back, picks A and then B. That is 6 kg and 32 in tips, and C no longer fits because 6 + 6 = 12 kg. The best choice is B + C, which is 10 kg and 44 in tips. So the per-kg rule gets 32 against the best 44. The same numbers scaled up work for a 50 kg van: A is 10 kg for 60, B is 20 kg for 100, C is 30 kg for 120. The ratio rule gets 160 and the best is 220. The family is optimization under a limit. Trying every set always works, but 30 orders give 2³⁰ = 1,073,741,824 sets. Greedy by ratio is the strategy not to trust, and dynamic programming is the one to use.

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

The overview is covered: what an algorithm is, why growth rate matters more than raw speed, and how the field divides into problem types. Two check-in questions were answered correctly: binary search on 2 billion items takes 31 steps, and quadratic work grows 100 times when the input grows 10 times. Problem recognition has had two rounds of practice scenarios. Most families were named correctly: shortest path, clustering, spanning tree, dependency ordering, matching, search, string, numeric and continuous optimization. Two things are shakier. First, a tour through every stop (the courier) was mistaken for a spanning tree, and the reason given was the setting rather than the shape of the answer. Second, cost versus distance was offered as the difference between a path and a network, but the weight can be either in both, and the answer shape is what differs. The knapsack goal was understood correctly: the most tips under the limit gives 44. The value-per-kg shortcut is a tempting method that fails, and it is shown above. The cell-tower question was half right: the geometry step was named, but not the subset choice that carries the hard label. How hard problems are handled has since been covered, and a spanning tree has been drawn. Sorting has not yet been practised as its own scenario. Next up are the design strategies (divide-and-conquer, greedy, dynamic programming), starting with recursion. Every other section below is still an outline, apart from merge sort and quicksort, which came up as Big O examples.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth, tracked here to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| What cannot be solved fast (NP-hardness) | Intermediate | [Types of Problems](#problem-types) | The hard-problems label in [Types of Problems](#problem-types): some problems have no known fast method, and knowing which ones saves you from searching for one. |
| Approximation algorithms and exact solvers for hard problems | Intermediate | [Types of Problems](#problem-types) | How to get a good-enough answer with a known worst case, or an exact answer for realistic sizes, on problems like cell-tower coverage (set cover). Greedy is within about ln(n) + 1 times the best. |
| Parallel algorithms on GPUs | Intermediate | [What the domain is about](#overview) | A GPU runs thousands of small tasks at once, so which algorithms split into independent pieces decides what it can speed up. |
| Spatial indexes (k-d trees, R-trees) | Intermediate | [What the domain is about](#overview) | They make nearest-neighbour search over millions of map points fast, where a naive check over 10 million points is slow. |

## Related pages

- [Data Structures](data-structures.html) — every algorithm here runs on one of these structures
- [Trees](data-structures/trees.html) — searching a binary search tree is binary search on a linked structure
