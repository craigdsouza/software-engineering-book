---
prose_through: 133
---

:::callout
**Stacks and Queues started as two short sections of [Data Structures](../data-structures.html).** They moved to their own page so that harder material about them has room to grow next to the basics. Each of the two keeps its own topic, so past quiz results still count.
:::

## Basics

### Stacks {#stacks}

A stack is LIFO: last in, first out. The newest item is always the next one out, like a pile of plates.

The canonical use is undo. Each action is pushed onto the stack, and undo pops the most recent one off.

A second use is checking that brackets are balanced. Read the text left to right and push each opening bracket. When a closing bracket arrives, compare it with the top of the stack. The top must be its matching opener, otherwise the check fails. For `( [ ) ]` the stack takes `(` then `[`, and the third character `)` arrives while the top is `[`, so the check fails right there.

A third use is the browser's back button. Visit pages A, B, C and D, and the history is a stack with D on top. Press back twice and you are on B. Now click a link to a new page E. The history becomes A, B, E, and C and D are thrown away. Pressing back from E shows E, then B, then A, and C and D can never be reached. A new visit wipes out everything above the point you went back to.

A fourth use is the call stack. When a function calls itself and 4 calls are waiting for their answers, the newest call sits on top and must finish first. Call 4 finishes, then 3, then 2, then 1. See [Recursion](../algorithms.html#recursion) for how this works in full.

### Queues {#queues}

A queue is FIFO: first in, first out. The oldest item is always the next one out, like a line at a counter.

A help desk that serves tickets first-come, first-served is the natural case. Suppose a teammate suggests a stack instead, with tickets arriving from 9:00 to 9:04 and more arriving while the agent works. A stack serves the newest ticket first, so the 9:00 ticket waits at the bottom. If tickets arrive faster than the agent clears them, it may never be served. Even if the agent is faster than the arrivals, it still sits there until a lull with no new tickets. A queue serves strictly in arrival order, so how long you wait is bounded by the work ahead of you.

## Going deeper

### Storing a queue in an array

Put a queue of 1,000 people in a plain array, with slot 0 as the front. Serving the first person removes slot 0, and every other person shifts one slot left. The first serve moves 999 people. The second moves 998. Serving everyone costs 999 + 998 + ... + 1 moves.

There is a quick way to size that sum. Pair the biggest with the smallest: 999 + 1 = 1,000, then 998 + 2 = 1,000, and so on. That gives about 500 pairs of 1,000, so about 500,000 moves (the exact figure is 499,500). That is half of 1,000 × 1,000. A line 10 times longer costs about 100 times more work. For 10,000 people it is about 10,000 × 10,000 ÷ 2 = 50,000,000 moves.

Tempting but wrong: moving the last person into the freed front slot, so that only one item moves. That is cheap, but it puts the newest arrival at the front of the line and breaks first-in, first-out. Take six customers, T1 to T6, with T1 at the front. Serve T1 and copy T6 into slot 0. Now T6 is served next, though T2 has waited longest. Repeat the shortcut and the order becomes T1, T6, T5, T4, T3, T2. The newest customer is always served first, so the line behaves like a stack, which is the opposite of a queue.

The fix that keeps the order is to remember where the front now is, instead of moving anyone. This is the same idea that is mentioned for [arrays](../data-structures.html#arrays). A head marker moves one slot right after each serve, so each serve costs 1 step instead of 999.

That fix has a cost of its own. New arrivals always go into the next free slot at the back, and the slots behind the head are never reused. So the array keeps growing. A counter that serves 1,000 customers in a day needs 1,000 slots, even if no more than 8 people are ever waiting. Nobody is copied or moved, but the memory is wasted.

### Circular buffer {#circular-buffer}

A circular buffer fixes that waste. Instead of growing at the back, the back wraps around and reuses the freed slots at the front. Picture a million people passing through a line that is never longer than 5. A head marker alone would need a million slots. A circular buffer needs about 5. The same counter that serves 1,000 customers with at most 8 waiting needs only about 8 slots.

**No item ever moves.** This is the part that is easy to get wrong. A circular buffer does not rotate existing items from the back to the front. Two markers do all the work:

- The **head marker** points at the front of the line. Serving a job moves the head forward by one slot. The front of the line is wherever the head points, not slot 0.
- The **write position** is where the next new arrival goes. It also moves forward by one slot, and it wraps from the last slot back to slot 0, reusing slots that were freed.

Here is an example with 5 slots, P1 to P5 in slots 0 to 4, and the head at slot 0. Serve P1 and P2, and the head is now at slot 2. A new job P6 goes into the freed slot 0. The serving order is slots 2, 3, 4, 0, which is P3, P4, P5, P6. P6 sits in slot 0 but is last in line.

A second example has 4 slots, numbered 0 to 3, with the head at slot 2. Job A is in slot 2 and job B is in slot 3. Job C arrives and goes into slot 0, and job D goes into slot 1. Serve one job: A is served and the head moves to slot 3. Job E arrives and goes into the freed slot 2. No job was copied or moved at any point. The buffer is now full, with E, B, C, D in slots 2, 3, 0, 1, and the serving order starts at the head: B, C, D, E.

The same wrapping applies to the head. It goes back to slot 0 when it passes the last slot, not the last item. A third example has 6 slots with the head at slot 4 and 3 jobs. The jobs sit in slots 4, 5, 0, in serving order. A new job goes into slot 1. Serving two jobs moves the head from 4 to 5 to 0.

**When the buffer is full.** A new arrival has three options. Reject it, or make the sender wait. Grow into a bigger array, copying the items out in order so the head resets to 0. Or overwrite the oldest item, which logs and audio streams use. A full buffer and an empty one both have the head and the write position at the same slot. So a count of items is kept to tell them apart.

## Advanced

Nothing here yet. The first candidate is listed in the table below.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth. They are tracked here on purpose, to return to later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Deque | Intermediate | [Queues](#queues) | A line where items can be added or removed at either end, not only the back and the front. Not covered yet. |

## Where things stand

Stacks are solid. Bracket balance, the browser back button and the call stack were all answered correctly. Queues and the circular buffer are now solid after a clean review. The help-desk question about why a stack would be unfair was answered correctly. Two earlier gaps are resolved. The first was the cost of shifting every person left on each serve. It was first answered wrongly for 10,000 people, but it was answered correctly with 2,000 and 4,000: about 2 million moves, then about 8 million, since doubling the line quadruples the work. The second was the idea of moving the last person into the freed front slot. The line-cutting problem is understood, the full wrong order T1, T6, T5, T4, T3, T2 was traced correctly, and a circular buffer with a moving head marker was named as the fix. A misconception about the circular buffer is also resolved. It had been described as rotating items from the back to the front. On fresh examples with 4 and 6 slots, the new arrival went into the freed slot and no item moved. The difference between a head marker alone, which needs 1,000 slots, and a circular buffer, which needs about 8, was answered correctly. The next step is a later review. After that, the first candidate is the deque, a line where items can be added or removed at either end.

## Related pages

- [Data Structures](../data-structures.html) — parent page. Arrays are where the "remember where the data starts" idea first appears.
- [Recursion](../algorithms.html#recursion) — the call stack is a stack of waiting calls.
- [Trees](trees.html) — traversal reuses stacks and queues.
- [Review Schedule](../../review-schedule.html) — spaced-repetition status.
