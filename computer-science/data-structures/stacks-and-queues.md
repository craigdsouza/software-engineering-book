---
prose_through: 129
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

Tempting but wrong: moving the last person into the freed front slot, so that only one item moves. That is cheap, but it puts the newest arrival at the front of the line and breaks first-in, first-out.

The fix that keeps the order is to remember where the front now is, instead of moving anyone. This is the same idea that is mentioned for [arrays](../data-structures.html#arrays). A head marker moves one slot right after each serve, so each serve costs 1 step instead of 999.

That fix has a cost of its own. The slots at the front that were already served are never reused, so the array keeps growing at the back.

### Circular buffer {#circular-buffer}

A circular buffer fixes that waste. Instead of growing at the back, the back wraps around and reuses the freed slots at the front. Picture a million people passing through a line that is never longer than 5. A head marker alone would need a million slots. A circular buffer needs about 5.

## Advanced

Nothing here yet. The first candidate is listed in the table below.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth. They are tracked here on purpose, to return to later.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Deque | Intermediate | [Queues](#queues) | A line where items can be added or removed at either end, not only the back and the front. Not covered yet. |

## Where things stand

Stacks are solid. Bracket balance, the browser back button and the call stack were all answered correctly. Queues need review. The help-desk question about why a stack would be unfair was answered correctly. The array questions were not. One gap is open: the cost of shifting every person left on each serve. The sum was set up correctly, but a rough size was never reached, and a second try with 10,000 people gave 10,000 moves instead of about 50,000,000. A second gap is open: the idea of moving the last person into the freed front slot, which breaks first-in, first-out. The head marker idea was right, and its drawback of unused front slots was spotted unprompted. The circular buffer was explained once in a quiz answer and has not been checked yet. The next step is a fresh check on the shifting cost with new numbers.

## Related pages

- [Data Structures](../data-structures.html) — parent page. Arrays are where the "remember where the data starts" idea first appears.
- [Recursion](../algorithms.html#recursion) — the call stack is a stack of waiting calls.
- [Trees](trees.html) — traversal reuses stacks and queues.
- [Review Schedule](../../review-schedule.html) — spaced-repetition status.
