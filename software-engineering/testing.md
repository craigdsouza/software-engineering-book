---
prose_through: 88
---

## Why test at all

Testing is an insurance policy on code quality. The failures it guards against can be enormous: a trading-software bug cost Knight Capital about $460M, and software errors in the Therac-25 radiation machine delivered overdoses to patients. Most of this page follows [Software Testing Course – Playwright, E2E, and AI Agents](https://www.youtube.com/watch?v=jydYq7oAtD8&t=31s).

## The testing pyramid

The pyramid balances three things that pull against each other — speed, cost and confidence — across three layers:

- **Unit tests** (the wide base): highly isolated and fast (milliseconds each). They test pure functions or single components, with mocks or stubs standing in for everything around them.
- **Integration tests** (the middle): medium speed and cost. They test the boundary where two or more modules or systems talk to each other, e.g. a backend API writing to its database.
- **End-to-end (E2E) tests** (the peak): the slowest and the most expensive to write and maintain. They drive a complete real user workflow in an actual browser, e.g. with Playwright.

```
Unit test:
[Input: $10] ---> ( calc_tax() ) ---> [Output: $1.50]

Integration test:
( Checkout Service ) <===> ( PostgreSQL Database )

E2E test:
[ Playwright Browser ] ---> ( Frontend UI ) ---> ( Backend API ) ---> ( Database )
```

A worked example: 1,000 tests for an e-commerce app, shaped like the pyramid.

| Layer | Count | Example | Total runtime |
|---|---|---|---|
| Unit | 800 | tax calculation logic | ~2 seconds |
| Integration | 150 | checkout service persisting orders to PostgreSQL | ~15 seconds |
| E2E | 50 | Playwright driving login, cart and checkout in the UI | ~5–10 minutes |

**Pick the lowest layer that can see the bug.** A rule like "5 or more items in the cart gets 10% off" is pure business logic, so it belongs in a unit test. Testing it end to end instead drags in the network, the UI and the database as extra ways to fail — and when that test goes red, you can't tell whether the discount math broke or something else did.

**What unit tests can't see is the boundary between modules.** Suppose the backend renames a JSON field from `items` to `cart_items`. The frontend's unit tests still pass, because their mock data uses the old name; the backend's unit tests still pass, because the endpoint does return valid JSON. In production the cart page renders blank. Only an integration test — one that runs the two sides against each other — catches it, precisely because mocks hide breaking changes to the data shape.

**Tempting but wrong: the testing ice-cream cone.** Flip the pyramid — lean on E2E tests and skip unit tests because they "only use dummy data" — and it collapses under its own weight. 500 E2E tests that take 3 hours mean developers stop running the suite locally. And a failing E2E test reports a symptom somewhere across the whole system (often a generic UI timeout) rather than the code that caused it. Playwright's logs and step traces do narrow things down to *which step of the user journey* failed, but finding the root cause in the code still means investigating the full stack.

## Flaky third-party dependencies

Say a Playwright checkout test runs on every pull request and makes a real HTTP call to a payment gateway such as Stripe. In CI it fails about 15% of the time, because the gateway rate-limits the CI server or responds too slowly.

Tempting but wrong: keep the real call and add retries, logging and monitoring to track the rate-limiting. The build stays both flaky and slow — logging tells you *why* it failed, it doesn't stop it failing.

The standard fix is **API mocking**: intercept the outgoing request (Playwright can intercept network traffic) and return a canned response, such as a 200 OK. The test stays, the flakiness goes. The price is **schema drift**: if the gateway changes its API contract or its error responses in production, the mock keeps returning the old shape and the test won't notice.

## The UI testing ladder

The pyramid is about scope across the whole stack; the ladder organises frontend quality by how granular the check is:

- **Level 1 — element appearance:** visuals, styling, layout. Tested with visual snapshot tools (e.g. Percy, Chromatic).
- **Level 2 — element behaviour:** a component's interactivity and state changes, in isolation (e.g. React Testing Library on JSDOM).
- **Level 3 — user journeys:** multi-step workflows; this rung is where the ladder overlaps with E2E testing.

**The rendering blind spot.** Functional tests check that an element is present in the DOM, not what actually appears on screen. An element hidden behind others with `z-index: -1`, or pushed off-screen by a `flex-wrap` bug, still passes a DOM assertion. Visual regression snapshots (e.g. Playwright's `toHaveScreenshot()`) close that gap.

## Other ways to slice testing

- **Functional vs. non-functional.** Functional tests (the pyramid and the ladder) check *what* the system does. Non-functional tests check *how well* it does it under constraints: load and performance, security (e.g. OWASP vulnerability scanning), accessibility (WCAG compliance), and resilience through chaos engineering (e.g. Chaos Monkey).
- **When: shift-left vs. shift-right.** Shift-left catches problems before release, as early as possible — linters, static typing, TDD, automated tests on every pull request. Shift-right tests the live production system — canary releases, feature flags, synthetic monitoring, A/B tests.
- **How much you can see: white, gray and black box.** White-box tests have full view of the code (unit tests). Black-box tests see none of it and check only inputs against outputs (E2E browser tests). Gray-box tests sit in between, e.g. testing an external HTTP API while knowing the database schema behind it.

These connect back to [APIs](../backend/apis.html): unit-testing business logic in isolation and contract-testing the API keep the slow E2E suite small and focused on the frontend wiring.

## Where things stand

Needs review — a first pass, taught and quizzed on the same day from a video course. Solid: which pyramid layer a check belongs in (the discount rule as a unit test) and why integration tests exist (catching the renamed JSON field that mocked unit tests miss). One misconception came up: for a flaky third-party call in CI, the answer reached for retries and logging rather than mocking the network response, and missed the schema-drift trade-off that mocking brings — worth retesting with a fresh scenario at the next review. A good pushback during teaching was that E2E failures aren't locationless: traces pinpoint the failing step of the journey, even if the root cause still needs digging. The UI testing ladder, the non-functional side, shift-left/right and white/gray/black-box were covered at overview depth only and haven't been quizzed.

## Related pages

- [APIs](../backend/apis.html) — contract and unit tests on the API keep the E2E suite small.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
