---
prose_through: 145
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

The wording gives the shape away. A request that names two end points, such as "from town 1 to town 40", wants a path. A request that says "every town can reach every other" wants a network. Nobody drives it, and it may branch. A request that says "visit every town once and return" wants a tour. With 40 towns, the other 39 can be visited in 39! (about 2 × 10⁴⁶) orders. At 1 billion orders per second that is about 6.5 × 10²⁹ years, so checking them all is impossible.

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

Binary search finds one item in a sorted list by halving the search range at every step. Compare the target with the middle item. Throw away the half that cannot contain it. Repeat on the half that is left. It can be written as a loop or as [recursion](#recursion).

The search stops in one of two ways. Either the middle item is the target, or the remaining range is empty. The second case is the stopping rule that is easy to forget.

**Why it takes about 20 steps.** Searching 1,000,000 items by plain scanning takes up to 1,000,000 steps. Binary search halves the range each time. Since 2 to the power 20 is about 1,048,576, a million items need at most about 20 halvings. A search for a value that is not in the list costs the same as the worst case for a value that is. It still needs about 20 steps, because it only stops once the range is empty, after the last single item has been checked and does not match.

**Counting the maximum exactly.** The number of steps is the number of looks at a middle item. Count looks, not halvings. Take 100,000 cells. Halving 100,000 down to 1 takes 16 halvings (100,000, 50,000, 25,000, and so on). But after the 16th halving one cell is still left, and it must be looked at. That look is the 17th, so the maximum is 17, not 16. A small case shows it. An 8-cell array halves 3 times (8, 4, 2, 1), yet binary search looks 4 times, once at each size.

A rule that avoids the slip: **k looks can cover at most 2^k − 1 cells.** One look covers 1 cell, two looks cover 3, and three looks cover 7. The maximum number of steps is the smallest k where 2^k − 1 is at least N.

| Cells | Looks needed | Why |
|---|---|---|
| 1,000 | 10 | 2^10 − 1 = 1,023 is enough, and 2^9 − 1 = 511 is not |
| 10,000 | 14 | 2^14 − 1 = 16,383 is enough, and 2^13 − 1 = 8,191 is not |
| 100,000 | 17 | 2^17 − 1 = 131,071 is enough, and 2^16 − 1 = 65,535 is not |
| 1,000,000 | 20 | 2^20 − 1 = 1,048,575 is enough, and 2^19 − 1 = 524,287 is not |

Tempting but wrong: stopping at the number of halvings. It is one look short every time.

**Linear search versus binary search on one array.** This example is from the Chapter 2 exercises of Wengrow's *A Common-Sense Guide to Data Structures and Algorithms in Python*. Take the sorted array [2, 4, 6, 8, 10, 12, 13] and search for 8. Linear search reads from the left and stops the moment it finds the target. It reads 2, 4, 6, 8, so it takes 4 steps. Seven steps would be the cost only for the last cell (13) or for a value that is not there. Binary search has 7 cells, so it looks first at the middle one, the 4th cell, which holds 8. That is 1 step.

**Why the list must be sorted.** One comparison with the middle item can rule out half the range only because the items are in order.

**Tempting but wrong: "a sorted linked list works too."** It does not. Binary search would still make only about 20 comparisons. But on a [linked list](data-structures.html#linked-lists), reaching the middle takes n/2 steps. For 1,000,000 items that is 500,000 steps. Reaching the next middle takes about 250,000 more, then 125,000, and so on. The walking adds up to about 1,000,000 steps, the same as scanning from the start. On an [array](data-structures.html#arrays), jumping to the middle takes one step. That is why binary search needs an array.

Still to cover: the midpoint and off-by-one details, duplicate values, and what happens on unsorted input.

## Recursion & Recurrences {#recursion}

Recursion means solving a problem by asking the same question about a smaller piece of it.

### A line of people

Four people stand in a line. You are at the back and cannot see the front. You ask the person ahead: "How many people are from you to the front?" They ask the person ahead of them. This repeats until the person at the front, who has nobody ahead, answers "1". Each person then adds 1 and passes the answer back.

```
You ask  ->  P3 asks  ->  P2 asks  ->  P1 (front) says "1"
You say 4 <- P3 says 3 <- P2 says 2 <-
```

Every recursion has three parts.

- **The base case.** The question so small it is answered directly. Here it is "nobody ahead of me, so 1".
- **The smaller version.** Each call asks about a problem exactly one step smaller.
- **The combine step.** Take the smaller answer and add your own bit. Here, add 1.

The same shape works for numbers. Factorial means multiplying a number by every whole number below it, so 4! = 4 × 3 × 2 × 1 = 24. Since 4! = 4 × 3!, and 3! = 3 × 2!, and 2! = 2 × 1!, and 1! = 1, the calls reach the base case and the answers travel back up: 1, then 2 × 1 = 2, then 3 × 2 = 6, then 4 × 6 = 24.

```
4! = 4 x 3!
          3! = 3 x 2!
                    2! = 2 x 1!
                              1! = 1   <- base case
```

### The call stack

Nothing is multiplied on the way down. Every call just waits. The waiting calls are kept on the call [stack](data-structures/stacks-and-queues.html#stacks), one entry per pending call. The real arithmetic happens on the way back up, after the base case answers. If there is no base case, the calls never stop. The stack runs out of room and the program crashes. That crash is called a stack overflow.

### Choosing the base case

Take the sum of the list [3, 5, 2]. The smaller version is the sum of the rest of the list. The combine step is to add the first number to that sum.

A base case of "one element left, so return it" works for any list of 1 or more. But an empty list never reaches it, so the calls would recurse on nothing until the stack overflows. The safer base case is "empty list, so the sum is 0". It covers every input, including the empty one.

```
sum([3,5,2]) = 3 + sum([5,2])                      <- waiting
                    sum([5,2]) = 5 + sum([2])      <- waiting
                                      sum([2]) = 2 + sum([])   <- waiting
                                                     sum([]) = 0   <- base case
```

Going back up: sum([]) = 0, then sum([2]) = 2 + 0 = 2, then sum([5,2]) = 5 + 2 = 7, then sum([3,5,2]) = 3 + 7 = 10. At the deepest point 4 calls are waiting at once.

**A base case depends on the size, not on the items.** Take a function that counts a list: the count is 1 plus the count of the list with its first item removed. Give it the base case "the list has exactly 2 items, so the answer is 2". A 5-item list works. count(5) = 1 + count(4), count(4) = 1 + count(3), count(3) = 1 + count(2), and count(2) = 2 is the base case. Coming back up, count(3) = 3, count(4) = 4 and count(5) = 5. The base case never needs to know what the items are, only how many there are. A 1-item list goes wrong. It asks for the count of 0 items, and a 0-item list has nothing left to remove. Neither ever reaches exactly 2, so the calls pile up until the stack overflows. "Exactly 2" works only for lists of 2 or more.

A countdown shows the same thing. It prints n, then calls itself with n − 1, and stops when "n is exactly 10". Starting at 15 works, and starting at 10 stops at once. Starting at 4 never reaches 10, so it counts into negative numbers forever. A base case of "n is exactly 0" is better but still unsafe, because a start of −3 never ends either. The safer base case is "n is 0 or less".

The rule: every call must move closer to the base case, and every allowed input must be able to reach it. For lists, "the list is empty, so the answer is 0" is safe for every size, because each call removes exactly one item and a list of n items is empty after exactly n calls. The base case is the same whether the function sums or counts. Only the combine step differs: add the first number for a sum, add 1 for a count.

[Binary search](#binary-search) is recursion too. The smaller version is "search the half that could hold the target", so 1,000,000 items become 500,000, then 250,000, and so on. The base cases are "the range is empty" (not found) and "the middle item is the target" (found).

### Depth is a cost

Summing 1,000,000 numbers recursively leaves 1,000,000 calls waiting, which can overflow the stack. Binary search on 1,000,000 items goes only about 20 calls deep. A method that halves 1,000 items goes 1,000, 500, 250, 125, 62, 31, 15, 7, 3, 1, which is about 10 calls deep, so the stack is no worry.

**In practice a sum is done with a loop.** Keep one number, a running total, starting at 0. Walk the list once and add each item to it. This uses one memory slot whatever the size of the list. No calls wait on each other, so nothing can overflow. A million numbers still take a million additions, the same work as the recursive version, without the million waiting calls. A problem that shrinks by 1 each time is better as a loop. Recursion earns its place when the problem splits into pieces, as in merge sort, or when the data is shaped like a tree. Then it goes only about 10 to 20 calls deep. Some languages turn a call that is the very last thing a function does into a loop automatically. That is tail-call optimization, listed in the forward pointers below.

### Recurrences: a cost in terms of a smaller version of itself

Let T(n) mean the number of steps needed for n items. A recurrence reads like a sentence: the cost of n equals the cost of the smaller piece, plus the extra work done at this level.

| Algorithm | Recurrence | Reading it | Result |
|---|---|---|---|
| Sum of a list | T(n) = T(n − 1) + 1 | One step, then the same job on a list 1 item shorter | 1,000 items take 1,000 steps, O(n) |
| Binary search | T(n) = T(n / 2) + 1 | One comparison, then the same job on half the items | 1,000,000 items take about 20 steps, O(log n) |
| Merge sort | T(n) = 2 × T(n / 2) + n | Sort two halves, then spend n steps merging them | 1,000 items take about 10,000 steps, O(n log n) |

Recursion itself does not make an algorithm fast or slow. The rate at which the problem shrinks decides it. Shrinking by 1 each time takes n levels, which is slow. Shrinking by half takes only log n levels, which is fast.

### The recursion tree: rows × cost per row

A recursion tree shows where the cost comes from. Draw one box per call, write the work that call does inside it, and add up each row. The total is the number of rows times the cost of a row. The shrink rate sets the number of rows. The extra work sets the cost of a row.

Merge sort is a way to put a list in order. Take 8 jumbled numbers. Split them into two piles of 4, then split each pile again, down to piles of 1. A pile of one is already sorted, which is the base case. Then comes the merge. Take two sorted piles, say 2, 5, 9 and 1, 6, 8. Look at the top card of each pile, take the smaller, and repeat. That builds one sorted pile, 1, 2, 5, 6, 8, 9, in a single pass with no backtracking. So merge sort is: split in half, sort each half, then merge them.

For 8 items, T(n) = 2T(n/2) + n gives this tree.

```
Level 0:            [8]                    work 8
Level 1:        [4]     [4]                work 4+4 = 8
Level 2:      [2] [2] [2] [2]              work 2x4 = 8
Level 3:     [1][1][1][1][1][1][1][1]      work 1x8 = 8
```

Every row costs 8, which is n. Halving 8 down to 1 takes 3 rows, which is log₂ 8. The total is about 8 × 3 = 24 steps. For 1,000 items it is about 10 rows of about 1,000, so about 10,000 steps. Here "the work" means the number of basic steps. In merge sort a step is moving one card into the merged pile.

The sum has a much simpler tree: one box per row, 1 step each, and n rows, so the total is n.

**A recursion with three pieces.** Take T(n) = 3 × T(n / 3) + n with n = 27. Read it as: split the problem into 3 pieces, each one third the size, and spend n extra steps splitting and combining. The pieces go 27, then 9, then 3, then 1, which is 3 splits.

```
Row 1:   [27]                                  work 27
Row 2:   [9]  [9]  [9]                         work 3 x 9 = 27
Row 3:   [3][3][3][3][3][3][3][3][3]           work 9 x 3 = 27
```

The "+ n" is the cost of splitting and combining one piece of size n, and the pieces in a row always add up to the full size, 27. So every row costs 27. Each row has more pieces, but each piece is smaller by the same factor, so the row cost stays the same. The total is rows × cost per row = 3 × 27 = 81 steps. The size-1 pieces at the bottom add a little more, but 81 is the right size of the answer.

Tempting but wrong: using the number of splits (3) as the cost of a row, and reading the total as about 3 × 3 + 1 = 10. The number of splits is the number of rows, not the cost of a row. Multiply the number of rows by the cost of one row.

### Tempting but wrong: "two calls are always fine"

Merge sort makes two calls and is fast. So you might think any two-call recursion is fine. Fibonacci disproves it. The Fibonacci sequence is 1, 1, 2, 3, 5, 8, 13, where each number is the sum of the two before it. Written recursively, fib(n) = fib(n − 1) + fib(n − 2), with fib(0) = 0 and fib(1) = 1 as the base cases. So fib(5) = 5, because fib(4) + fib(3) = 3 + 2.

```
                    fib(5)
                  /        \
             fib(4)         fib(3)
            /      \        /     \
        fib(3)   fib(2)  fib(2)  fib(1)
        /    \
    fib(2) fib(1)       (each fib(2) splits again into fib(1) and fib(0))
```

fib(5) takes 15 calls, and the question fib(2) alone is asked 3 separate times, each worked out from scratch. The number of calls grows fast.

| n | Calls |
|---|---|
| 5 | 15 |
| 10 | 177 |
| 45 | about 3.7 billion |

For fib(5) the number of calls in each row is 1, 2, 4, 6, 2, and each call does about 1 step, one addition.

**Why merge sort stays fast and Fibonacci explodes.** In merge sort the number of calls doubles every row (1, 2, 4, 8). But the size of each call halves (8, 4, 2, 1). The two changes cancel, so every row costs the same, and there are only log n rows. In Fibonacci the number of calls also grows from row to row. But each call does the same 1 step, so nothing shrinks to cancel the growth. The problem only drops from n to n − 1 and n − 2, so there are about n rows instead of log n, and the calls multiply by roughly 1.6 at each step.

There are two separate causes.

- **The pieces barely shrink.** They go from n to n − 1 and n − 2, not to n / 2.
- **The same questions are asked again and again.** These are overlapping sub-problems.

Merge sort has neither problem. Each card sits in exactly one pile per row, so no work is repeated. Storing each answer the first time it is computed fixes the repetition. That idea is [dynamic programming](#dynamic-programming).

## Simple Sorts (Selection & Insertion) {#simple-sorts}

*Partly covered.* [Bubble sort](#bubble-sort) and [selection sort](#selection-sort) are written up below. Insertion sort is not yet covered. All of them take O(n²) steps in the usual case. For 1,000 items that is about 500,000 comparisons for bubble and selection sort. Still to cover for insertion sort: how it works step by step, and why it is fast on a list that is almost sorted already. Two properties judge every sort. "In-place" means it needs no extra copy of the data. "Stable" means equal items keep their original order.

## Bubble Sort {#bubble-sort}

Bubble sort sorts a list by swapping neighbours that are in the wrong order. Picture five jumbled playing cards in a row. You may only swap two cards that sit side by side.

**The idea.** Look at two neighbours. If the left one is bigger, swap them. Slide one spot right and repeat. One walk from the left end to the right end is called a **pass**.

```
One pass on [5, 1, 4, 2]
compare 5,1 -> swap -> [1, 5, 4, 2]
compare 5,4 -> swap -> [1, 4, 5, 2]
compare 5,2 -> swap -> [1, 4, 2, 5]
```

The 5 was the biggest, so it kept getting swapped and "bubbled" to the end. That is where the name comes from. The same thing happens on [6, 2, 9, 4]: the 6,2 pair swaps, 6,9 stays, 9,4 swaps, and the list becomes [2, 6, 4, 9]. That is 3 comparisons and 2 swaps. After any pass, the biggest item still in play must sit at the end.

**Each pass can stop one spot earlier.** After pass 1 the biggest item is in its final place. After pass 2 the second biggest is too. So the settled part grows from the right.

```
Pass 1: 3 comparisons -> [1, 4, 2 | 5]
Pass 2: 2 comparisons -> [1, 2 | 4, 5]
Pass 3: 1 comparison  -> [1 | 2, 4, 5]   done
```

That is 3 + 2 + 1 = 6 comparisons for 4 items. In general it is n(n-1)/2. For 1,000 items that is about 500,000 comparisons, so bubble sort is O(n²).

**Stopping early.** A plain bubble sort always does n - 1 passes, even on a list that is already sorted. The fix is to watch for swaps. If a whole pass makes zero swaps, every neighbouring pair is in order, so the list is sorted and you can stop.

- **Best case.** An already sorted list of [1, 2, 3, 4] takes one pass of 3 comparisons, not 6. For 1,000 sorted items that is about 999 steps instead of about 500,000. The best case drops from O(n²) to O(n).
- **Worst case.** A reversed list such as [4, 3, 2, 1] swaps on every comparison. It needs all 6 comparisons and 6 swaps. For 1,000 reversed items that is about 500,000 swaps. Early exit does not help here.
- **Early exit with shrinking passes.** On [2, 1, 3, 4, 5], pass 1 makes 4 comparisons and 1 swap, giving [1, 2, 3, 4, 5]. Because a swap happened, another pass is needed. Pass 2 makes 3 comparisons (the last spot is already settled) and no swaps, so it stops. The total is 7 comparisons, against 10 without early exit.

**What the early exit saves.** It saves the later passes, not the pass that finds no swaps. That confirming pass still makes its comparisons. Take 1,000 items sorted except the biggest sits at the far left. Pass 1 makes 999 comparisons and carries it to the end. Pass 2 makes about 998 comparisons, finds no swap and stops. The total is about 999 + 998 = 1,997 comparisons. For the opposite case, the smallest item at the far right, the passes cost 999 + 998 + ... + 1. Write that sum forwards and backwards and add column by column. Each column totals 1,000 and there are 999 columns, so twice the sum is 999 × 1,000 and the sum is 499,500. In general 1 + 2 + ... + (n − 1) = n(n − 1)/2. Check on n = 4: 3 + 2 + 1 = 6 = 4 × 3 / 2.

**Big items fly, small items crawl.** In one pass a big item can travel the whole way to the right. A small item moves only one spot left per pass, because each swap moves it past just one neighbour. The slow small items are nicknamed turtles, and the fast big ones rabbits. The same five numbers show it in two orders.

```
[5, 1, 2, 3, 4]   the 5 flies right
  Pass 1: 5 swaps 4 times -> [1, 2, 3, 4, 5]
  Pass 2: 0 swaps -> stop.          2 passes

[2, 3, 4, 5, 1]   the 1 crawls left
  Pass 1 -> [2, 3, 4, 1, 5]
  Pass 2 -> [2, 3, 1, 4, 5]
  Pass 3 -> [2, 1, 3, 4, 5]
  Pass 4 -> [1, 2, 3, 4, 5]
  Pass 5: 0 swaps -> stop.          5 passes
```

The number of passes is roughly how far the furthest-travelling small item must move left, plus one pass to confirm. So [3, 4, 5, 1] takes 4 passes, while [4, 1, 3, 5] takes only 2: the 4 flies right past two items in the first pass.

**Two properties every sort is judged on.** A sort is **in-place** if it needs no extra copy of the data, only swaps inside the one list. Bubble sort is in-place. A sort is **stable** if equal items keep their original order. Bubble sort is stable, because it swaps only when the left item is *strictly* bigger, so two equal neighbours are never swapped. Stability matters when you sort a class list by marks and two students both have 80. A stable sort keeps them in whatever order they were in before, say alphabetical.

The tempting-but-wrong change is to swap when the left item is bigger *or equal*. Take Asha 80, Ben 80, Cy 70, listed alphabetically and sorted by marks, lowest first. The run is [Asha, Ben, Cy] → [Ben, Asha, Cy] → [Ben, Cy, Asha] → [Cy, Ben, Asha]. Ben ends up ahead of Asha, so the alphabetical tie-break is lost. The students swap places. Their marks stay the same.

**Where it fits.** It builds on [arrays](data-structures.html#arrays), since every swap is by position, and on [Big O](data-structures.html#big-o), since n(n-1)/2 steps is O(n²). It sits beside selection and insertion sort as a simple O(n²) sort. [Merge sort and quicksort](#divide-and-conquer-sorts) take O(n log n), about 10,000 comparisons for 1,000 items instead of about 500,000.

## Selection Sort {#selection-sort}

Selection sort sorts a list by repeatedly picking the smallest item left and swapping it into place. It is the easiest sort to explain, and it does the fewest swaps of the simple sorts.

**The idea.** Split the list into a sorted part on the left and an unsorted part on the right. Repeat two steps. Find the smallest item in the unsorted part. Swap it into the first unsorted slot. The wall between the two parts only moves right, and everything left of the wall is final.

```
Selection sort on [29, 10, 14, 37, 13]
Start:   [29 10 14 37 13]
Pass 1:  smallest of all = 10 (slot 1), swap with slot 0 -> [10 | 29 14 37 13]
Pass 2:  smallest of the rest = 13, swap with 29         -> [10 13 | 14 37 29]
Pass 3:  smallest of the rest = 14, already in place     -> [10 13 14 | 37 29]
Pass 4:  smallest of the rest = 29, swap with 37         -> [10 13 14 29 | 37]
```

After n − 1 = 4 passes the last item has nowhere else to go, so it is done.

**The cost.** To find the smallest of k items you must look at all k. So the passes cost 4 + 3 + 2 + 1 = 10 comparisons for 5 items. In general that is n(n − 1)/2. For 1,000 items it is 499,500 comparisons, so selection sort is O(n²). It does at most n − 1 swaps, because each pass does at most one. That is at most 999 swaps for 1,000 items.

**There is no early exit.** Selection sort makes the same number of comparisons on every input: sorted, reversed or shuffled. On an already sorted [1, 2, 3, 4, 5] it still makes 10 comparisons. A pass can only be sure it found the smallest item after looking at every item left, even when the smallest turns out to sit in the first slot.

The tempting-but-wrong shortcut is copied from bubble sort: "if a pass needs no swap, stop." Try [1, 3, 2]. Pass 1 finds the smallest item, 1, already in slot 0, so it makes no swap, but the list is not sorted. In bubble sort a pass with no swaps has checked every neighbouring pair, so it proves the list is sorted. In selection sort a pass with no swap only shows that one slot was already right.

**In-place, but not stable.** Selection sort is in-place, because it only swaps inside the one list. It is **not** stable. Take [4a, 4b, 2], where 4a and 4b are different items with the same value.

```
[4a, 4b, 2]
Pass 1: smallest is 2 (slot 2), swap with slot 0 -> [2, 4b, 4a]
```

Before, 4a came first. After, 4b comes first. The long-distance swap carried 4a over 4b. A longer case shows the same thing. On [3a, 3b, 1, 3c], pass 1 swaps 1 with 3a and gives [1, 3b, 3a, 3c]. The later passes need no swaps, because ties keep the first smallest item found. The final order is 1, 3b, 3a, 3c, so a and b flipped.

**Where it wins.** It does at most n − 1 swaps. Bubble sort can do about 500,000 swaps on 1,000 items. That helps when moving an item is expensive, such as large records on slow storage. The price is that it never gets faster on easy input.

**Where it fits.** It builds on [arrays](data-structures.html#arrays), since every swap is by position, and on [Big O](data-structures.html#big-o), since n(n − 1)/2 steps is O(n²). It sits beside [bubble sort](#bubble-sort). Both are O(n²) and in-place. Bubble sort is stable and can exit early, so it takes about 999 steps on sorted input. Selection sort is unstable and cannot exit early, but it swaps far less. [Merge sort and quicksort](#divide-and-conquer-sorts) take O(n log n), about 10,000 comparisons for 1,000 items instead of about 500,000.

## Merge Sort & Quicksort {#divide-and-conquer-sorts}

*Partly covered, on another page.* Both sorts were introduced inside [Big O Notation](data-structures.html#big-o), as the worked examples of best, worst and average case. They take O(n log n) steps. For 1,000 items that is about 10,000 comparisons instead of 1,000,000. Both split the problem in half and recurse, building on [recursion](#recursion). The merge step, and why merge sort costs O(n log n), are worked through under [recursion](#recursion). Still to cover here: how quicksort actually runs step by step, why no comparison sort can beat O(n log n), and the counting and radix sorts that get around that limit by not comparing items.

## Graph Traversal (BFS & DFS) {#graph-traversal}

*Not yet covered.* Visiting every node of a graph. A graph is a set of points joined by lines, such as people and friendships, or cities and roads. Breadth-first search (BFS) explores level by level using a [queue](data-structures/stacks-and-queues.html#queues). Depth-first search (DFS) goes as deep as it can first, using a [stack](data-structures/stacks-and-queues.html#stacks). Will cover: why swapping one structure for the other changes the visiting order, and why BFS finds the fewest-hops route.

## Greedy Algorithms {#greedy}

*Not yet covered.* Algorithms that take the best-looking choice at each step and never go back. Will cover: when that is guaranteed to give the best overall answer, and a counterexample where it is not. The usual counterexample is making change for 30 with coins of 1, 15 and 25. Greedy picks 25 + 1 + 1 + 1 + 1 + 1, which is 6 coins. The best answer is 15 + 15, which is 2 coins.

## Shortest Paths (Dijkstra) {#shortest-paths}

*Not yet covered.* Finding the cheapest route when roads have different lengths, where BFS's "fewest hops" is no longer enough. Builds on [graph traversal](#graph-traversal) and the [greedy](#greedy) idea. Will cover: how Dijkstra's algorithm always settles the closest unsettled city next, why it needs a priority queue (a structure that hands back the smallest item first), and why it breaks when some roads have negative lengths.

## Dynamic Programming {#dynamic-programming}

*Not yet covered.* Solving a problem by solving its smaller sub-problems once each, and storing the answers so they are never recomputed. The repeated work in recursive Fibonacci is shown under [recursion](#recursion): fib(5) asks for fib(2) three times. Will cover: the Fibonacci example, where plain recursion makes about 3.7 billion calls to compute the 45th number but storing answers needs only 45 steps. Also: storing answers top-down (memoization, often in a [hash table](data-structures.html#hash-tables)) versus filling a table bottom-up, and how dynamic programming fixes the coin problem that [greedy](#greedy) gets wrong.

## Where things stand

The overview is covered: what an algorithm is, why growth rate matters more than raw speed, and how the field divides into problem types. Two check-in questions were answered correctly: binary search on 2 billion items takes 31 steps, and quadratic work grows 100 times when the input grows 10 times. Problem recognition has had two rounds of practice scenarios. Most families were named correctly: shortest path, clustering, spanning tree, dependency ordering, matching, search, string, numeric and continuous optimization. A scored question on three requests over one road map (path, network, tour) was answered correctly, so the tour-versus-tree slip looks resolved. The wording clue that separates them was supplied rather than stated, and is worth checking again at the next review. One thing is still shaky: cost versus distance was offered as the difference between a path and a network, but the weight can be either in both, and the answer shape is what differs. The knapsack goal was understood correctly: the most tips under the limit gives 44. The value-per-kg shortcut is a tempting method that fails, and it is shown above. The cell-tower question was half right: the geometry step was named, but not the subset choice that carries the hard label. How hard problems are handled has since been covered, and a spanning tree has been drawn. Sorting has not yet been practised as its own scenario. Binary search needs review. Its first scored check had all three questions right: halving a sorted range, why a linked list ruins it (the walking costs about 1,000,000 steps), and why a miss takes about 20 steps. The stopping rule was left out of the first answer and supplied unprompted in the third. A later check from the book's exercises had one real miss. The maximum number of steps for 100,000 cells was given as 16, counted by halving down to 1. It is 17, because the last cell still has to be looked at. The rule that k looks cover at most 2^k − 1 cells was then used correctly on a fresh case: 1,000 cells need 10. Finding 8 by binary search in a 7-cell array in 1 step was right. A linear search for the same 8 was first given as 7 steps instead of 4. It was called a slip, and a fresh linear search was right. The next step is a check on the maximum at an exact power of two, for example 1,023 or 1,024 cells. Recursion has had two quizzes and needs review. The halving cost was understood: about 10 calls deep for 1,000 items. The conclusion that a recursive sum risks overflowing the stack was drawn without help, and a check on a million items was answered correctly: a method that removes one item goes about 1,000,000 calls deep, and one that halves goes about 20. Doubling the calls does not grow the cost of a row, because the size of each call halves. The empty-list base case is now stated correctly, and so is the reason it is safe for every size: each call removes one item, so any list ends up empty. An earlier slip, judging that a base case "does not know what the items are", is resolved. A base case depends only on the size, and a countdown with the base case "exactly 10" was judged correctly for starts of 15, 10 and 4. One slip is open. For T(n) = 3 × T(n / 3) + n with n = 27, the 3 splits were right, but a row was costed at 3 steps and the total at 10, instead of 27 per row and 81 in total. Merge sort and Fibonacci were both new, so each was explained from scratch, and the first comparison of them named the constant row cost but not the repeated work. The next steps are a fresh recurrence where the row cost has to be worked out, a retest of why Fibonacci's calls explode while merge sort's do not, and then insertion sort. Bubble sort has had one quiz and needs review. Two of its three questions were right: a full trace with 10 comparisons and 7 swaps, and why swapping on "bigger or equal" breaks stability. One was missed. The pass that finds no swaps still makes comparisons, so the nearly sorted list with the biggest item at the far left costs about 1,997 comparisons, not 999. Getting from 1,000 items to about 500,000 comparisons was not recalled. The forwards-and-backwards sum was taught, and a retest should ask for it fresh. Three checks during the lesson went well. One slip came up: on [6, 2, 9, 4] the last swap (9 and 4) was missed on the first try. The self-check that the biggest item must end up last resolves it. The early-exit count of 7 comparisons on [2, 1, 3, 4, 5] was right, with a self-corrected slip about the second pass being one shorter. The turtle check was right: [3, 4, 5, 1] takes 4 passes and [4, 1, 3, 5] takes 2. Selection sort has been taught but not yet quizzed. Both check-ins were right: an already sorted list of 5 still needs 10 comparisons, and [3a, 3b, 1, 3c] ends as 1, 3b, 3a, 3c, which shows it is not stable. A quiz on it should cover the no-early-exit rule and stability. Every other section below is still an outline, apart from merge sort and quicksort, which came up as Big O examples.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth, tracked here to return to on purpose later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| What cannot be solved fast (NP-hardness) | Intermediate | [Types of Problems](#problem-types) | The hard-problems label in [Types of Problems](#problem-types): some problems have no known fast method, and knowing which ones saves you from searching for one. |
| Approximation algorithms and exact solvers for hard problems | Intermediate | [Types of Problems](#problem-types) | How to get a good-enough answer with a known worst case, or an exact answer for realistic sizes, on problems like cell-tower coverage (set cover). Greedy is within about ln(n) + 1 times the best. |
| Parallel algorithms on GPUs | Intermediate | [What the domain is about](#overview) | A GPU runs thousands of small tasks at once, so which algorithms split into independent pieces decides what it can speed up. |
| Spatial indexes (k-d trees, R-trees) | Intermediate | [What the domain is about](#overview) | They make nearest-neighbour search over millions of map points fast, where a naive check over 10 million points is slow. |
| Cocktail shaker sort (bubbling in both directions) | Intermediate | [Bubble Sort](#bubble-sort) | Bubble sort moves small items only one spot left per pass. Alternating a left-to-right pass with a right-to-left pass moves the slow small items faster. |
| Tail-call optimization | Intermediate | [Recursion & Recurrences](#recursion) | A language can turn a call that is the very last thing a function does into a loop. That removes the stack cost, so a recursive sum over 1,000,000 numbers need not overflow. |
| Solving recurrences formally (Master Theorem) | Intermediate | [Recursion & Recurrences](#recursion) | A rule for turning T(n) = a × T(n / b) + f(n) into a growth rate without drawing the tree. It builds on discrete mathematics. |

## Related pages

- [Data Structures](data-structures.html) — every algorithm here runs on one of these structures
- [Trees](data-structures/trees.html) — searching a binary search tree is binary search on a linked structure
