---
prose_through: 89
---

## Why memory exists

A large language model (LLM) is stateless: each call sees only what is in its context window. "Memory" is the system that decides what goes into that window on each turn. Stuffing the whole conversation history in does not work well. It fails on cost, on latency and on accuracy. In the Hindsight paper, a 20B-parameter model given the full conversation history scored 39% on LongMemEval (a standard memory benchmark, described below). The same model with a memory layer scored 83.6%.

## The four-stage pipeline

Every memory system has the same four stages:

```
conversation --> [1 WRITE: extract facts] --> [2 STORE] --> [3 READ: retrieve + assemble] --> context window
                                                  ^
                                      [4 MAINTAIN: update / merge / forget]
```

Stage 4 is the hard one. It is cache invalidation again (see [State & Caching](../frontend/state-caching.html)): the problem is not finding a fact, it is knowing that a fact has stopped being true.

## Tempting but wrong: plain RAG over chat logs

The obvious design is plain retrieval-augmented generation (RAG): chop the chat logs into chunks, embed each chunk, and return the top few by cosine similarity (how close two embeddings are in direction). It fails in two ways.

- **It can't tell which fact is current.** In March the user says "I work at Google". In June they say "I just started at Stripe as a PM". Asked "where does Alex work?", similarity search returns both chunks, and may rank the Google one first simply because its wording matches the question better. RAG has no idea which fact is current.
- **It fails multi-hop questions.** "Book a table in my sister's city on her birthday" needs two facts that never appear together in any one chunk.

## Three designs for knowledge that changes over time

The three systems below each take a different approach to the question "what do you do when a fact changes?"

### Supermemory: a graph of extracted facts

Built for fast personalization. It keeps **documents** (raw PDFs, chats, URLs) separate from **memories** (facts extracted from them). Memories link to each other by three relations:

- **UPDATES:** the new fact replaces the old one. "Alex at Stripe" UPDATES "Alex at Google". The old memory is kept for history, and an `isLatest` flag makes search return only the current one.
- **EXTENDS:** adds detail without invalidating anything. "Leads a team of 5" extends "PM at Stripe".
- **DERIVES:** inferred from several memories. "Likely works on core payments."

Forgetting is built in: time-based decay for temporary facts, newer-wins handling of contradictions, and filtering out casual chatter. It keeps a static plus a dynamic user profile always in context, and claims sub-400ms retrieval. See the [Supermemory graph-memory docs](https://supermemory.ai/docs/concepts/graph-memory).

### Zep / Graphiti: a temporal knowledge graph

Entities are nodes and facts are edges. The graph is **bi-temporal**: every edge records two timelines, when the fact was true in the world (valid / invalid) and when the system learned or retired it (created / expired). For example, the edge `Alex -WORKS_AT-> Google` is valid from 2023 and invalid from June 2026. The edge is closed, not deleted, so "where did Alex work in 2024?" is still answerable.

There are three layers: **episodes** (raw messages, kept as provenance), the **entity graph**, and **communities** (clusters of entities, each with a summary). Retrieval combines cosine similarity, BM25 keyword search (a classic keyword-ranking formula) and graph traversal (breadth-first search), then reranks the results. Reported results: 94.8% versus MemGPT's 93.4% on DMR, and on LongMemEval up to +18.5% accuracy and about 90% lower latency than full-context. See the [Zep paper](https://arxiv.org/abs/2501.13956).

### Hindsight: memories sorted by epistemic type

Hindsight (from Vectorize, open source, December 2025) separates memories into four networks by what kind of knowledge they are:

- **World:** objective facts.
- **Experience:** what the agent itself did, in the first person.
- **Opinion:** judgements, each stored with a confidence between 0 and 1 and a timestamp. Confidence goes up with supporting evidence and down with contradicting evidence.
- **Observation:** neutral summaries of an entity, built from many facts.

It has three operations:

- **RETAIN** turns transcripts into facts, with time ranges, canonical entities and links.
- **RECALL** runs four parallel channels (semantic vectors, BM25 keywords, graph spreading activation, and a temporal filter). It fuses them with Reciprocal Rank Fusion, reranks with a cross-encoder, and cuts the result to a token budget.
- **REFLECT** answers the question, and forms or updates opinions.

Reported LongMemEval results: 39% for the full-context baseline, 83.6% with the same 20B model plus Hindsight, and 91.4% with a larger backbone. On LoCoMo, the prior best open system scored 75.78% and Hindsight scored 85.67% or 89.61%. See the [Hindsight paper](https://arxiv.org/abs/2512.12818).

### Worked example: Reciprocal Rank Fusion

Reciprocal Rank Fusion (RRF) merges ranked lists from several search channels. A fact's score is the sum over channels of `1 / (60 + rank)`.

```
Fact A: rank 1 in vector search, rank 3 in BM25
        1/61 + 1/63 = 0.0164 + 0.0159 = 0.0323
Fact B: rank 2 in vector search, missing from BM25
        1/62 = 0.0161
```

A wins because two independent channels agree. RRF uses ranks, not raw scores, so a cosine score of 0.83 and a BM25 score of 14.2 never have to be put on the same scale.

## A map of the field

Two axes organize the designs.

- **Representation.** A flat vector store (LangMem, early Mem0) leads to a fact graph with versions (Supermemory, Mem0 graph), then a temporal knowledge graph (Zep), then typed epistemic networks (Hindsight). A separate line is OS-style tiers (Letta / MemGPT): core memory is always in context, plus recall memory and archival memory, and the agent pages memory in and out itself.
- **Who decides what gets written.** Either a background extraction pipeline does it (Supermemory, Zep, Hindsight), or the agent calls memory tools itself (Letta; file-based memory such as CLAUDE.md, or a memory tool writing markdown files).

There is also a convergence: nearly every serious system now does hybrid retrieval (vector, keyword, graph and time) followed by reranking. The designs differ on what gets stored and how it gets updated, not on how it gets searched.

## Benchmarks, and a caveat

LongMemEval (500 questions testing information extraction, multi-session reasoning, temporal reasoning, knowledge updates and abstention) and LoCoMo are the standard tests. Treat the scores with care:

- They are mostly self-reported.
- They swing with the backbone LLM. Hindsight itself moves from 83.6% to 91.4% just by swapping the model.
- A comparison published by Vectorize lists Hindsight at 94.6%, Supermemory at 81.6%, Zep at 63.8% and Mem0 at 49%. But Vectorize makes Hindsight, and Zep reports its own numbers differently.
- Both benchmarks test recall from conversations. They do not test whether an agent gets better at its job over time.

## What to take away

Three points run against intuition:

- Retrieval is mostly a solved problem. Updating is the hard part.
- Forgetting is a feature, not a flaw.
- The backbone model can move the score as much as the memory architecture does.

Each design wins in a different setting:

- **Supermemory:** a consumer chat app that needs fast "who is this user" context.
- **Zep:** enterprise or support agents where "what was true when" matters, such as a customer's plan history or a compliance audit.
- **Hindsight:** long-running agents that have to form and revise judgements, such as a research or trading assistant.

Connections to earlier topics: these systems are databases whose writes are driven by an LLM ([Database Fundamentals](../databases/fundamentals.html); bi-temporal tables come from SQL:2011). A memory update is cache invalidation, and recency decay works like an eviction policy ([State & Caching](../frontend/state-caching.html)). Entity canonicalization, resolving "Alex" and "Alex D." to one key, is the same problem a [hash table](../computer-science/data-structures.html#hash-tables) solves.

## Intermediate & Advanced Topics (forward pointers)

Concepts mentioned along the way that go beyond this page's current depth.

| Concept | Tier | Surfaced under | Why it matters |
|---|---|---|---|
| Embeddings and ANN indexes (HNSW) | Intermediate | Three designs | The vector-search channel in every system above rests on them. |
| BM25 internals | Intermediate | Three designs | The keyword channel in Zep and Hindsight. |
| Knowledge-graph modelling | Intermediate | Three designs | How entities and facts become nodes and edges in Zep and Supermemory. |
| Cross-encoder rerankers | Advanced | Three designs | The reranking step after fusion in Hindsight. |
| Letta / MemGPT self-editing memory, in depth | Advanced | A map of the field | The agent pages its own memory in and out. |
| Procedural memory (learning from experience) | Advanced | Benchmarks | The benchmarks above don't test whether an agent improves at its job over time. |

## Where things stand

This page is needs-review and has not been quizzed yet. The whole-field mental model was taught in one pass: why memory exists, the four-stage pipeline, why plain RAG fails, the three designs, and the map of the field. The session ended on a check-in scenario that has not been answered yet: where Alex's job change (Google to Stripe) lands in Supermemory, Zep and Hindsight. The next step is to answer it and then quiz the update and forgetting mechanics, since those are the hard part.

## Related pages

- [Database Fundamentals](../databases/fundamentals.html) — these systems are databases with LLM-driven writes.
- [State & Caching](../frontend/state-caching.html) — memory update as cache invalidation.
- [Data Structures](../computer-science/data-structures.html#hash-tables) — hash tables and entity canonicalization.
- [Review Schedule](../review-schedule.html) — spaced-repetition status.
