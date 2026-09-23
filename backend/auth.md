---
prose_through: 86
---

## Authentication vs. authorization

**Authentication** is "who are you" (logging in). **Authorization** is "what are you allowed to do now that we know who you are."

## Sessions vs. tokens

**Session-based auth:** after login, the server creates a session record *server-side* and hands the client an opaque ID via a cookie. The browser auto-attaches that cookie to future requests. Source of truth lives on the server — easy to revoke instantly, but requires shared session storage across servers.

**Token-based auth** (e.g. JWT): the server issues a signed, self-contained token; the client stores it and manually attaches it (e.g. `Authorization: Bearer`) on every request. No server-side lookup needed — scales statelessly, but harder to revoke before natural expiry.

**Where the difference bites: revocation.** Picture an API behind a load balancer in front of 50 backend instances, with a policy that a compromised credential must be dead within seconds. Sessions fit: validity is a live server-side lookup, so flipping one record kills the credential everywhere at once. A JWT has no such lookup — a stolen token stays valid until its own expiry (say 3600 seconds) no matter what the policy says, and that window is the real cost of choosing tokens here.

**Why mobile favors tokens:** cookies are fundamentally a *browser* feature — the automatic storing and re-attaching is built into the browser engine, tied to its domain model. A plain native app isn't a browser: it makes raw network calls with no built-in cookie handling, and was never going to inherit that behavior for free. Since it already writes its own explicit networking code for every request, manually attaching a token is simply business as usual for it.

The dividing line is whether browser-engine code is present — not how "close to the hardware" the app is, which is a tempting but wrong way to frame it. The counterexample is a **hybrid app**: a thin native wrapper that loads the website inside an embedded **WebView** (a browser window with no address bar). A WebView *is* a full browser engine — Chromium on Android, WebKit on iOS — so it carries the entire HTTP stack, cookie jar included, and cookie-based session auth works there exactly as in a normal browser tab.

**OAuth** — delegated auth ("Sign in with Google") — a third party vouches for identity so the app never touches the password directly.

## Cookie security model {#cookie-security}

- **Domain scoping** — a cookie is only ever sent to the domain that set it. This is a separate, earlier guarantee than SameSite: a lookalike phishing domain never receives the real site's cookie at all, whatever its SameSite setting.
- **`HttpOnly`** — blocks JavaScript from *reading* the cookie, defending against XSS token theft. Key nuance: the browser still *auto-attaches* an HttpOnly cookie to any request an injected script fires — so XSS can still perform authenticated actions as the victim, it just can't exfiltrate the credential for reuse later.
- **`Secure`** — HTTPS-only transmission.
- **`SameSite`** — restricts cross-site request behavior by checking the *origin that triggered the request*, not just the destination.

### XSS, plainly

A site fails to sanitize user-generated content (e.g. an unescaped comment field), so an attacker's `<script>` gets stored and later served *as if it were the site's own content*. The victim's browser can't tell attacker-injected code apart from the site's legitimate code — it just runs, with full access to that page.

### CSRF, plainly

A form or script on a *different* site silently submits a request to the target site. Without `SameSite`, the browser still attaches the cookie, because domain scoping alone only checks *where the request is going*, not *who initiated it*.

:::callout
**Important nuance:** `SameSite` defends CSRF but does *nothing* for XSS. An XSS-triggered request is same-site from the browser's point of view — the injected script is running on a page the trusted site itself served — so there's no cross-site boundary for SameSite to catch. The real XSS fix is preventing the injection in the first place (sanitization/escaping, Content-Security-Policy), not any cookie flag.
:::

The deeper capability difference: CSRF is a **blind, write-only** forged request — the attacker pre-writes an action and gets no visibility into the result. XSS grants **full code execution** inside the trusted origin — read the page, read non-HttpOnly cookies, read server responses, adapt in real time. CSRF is really just one narrow thing an XSS attacker could also do.

**Stealing the cookie vs. riding it.** Tempting but wrong: "without `SameSite`, an XSS attacker can steal the session cookie and replay it later from their own machine." Take a cookie with `HttpOnly` and `Secure` set but no `SameSite`, and a stored-XSS script running in the victim's page. Theft-and-replay is governed entirely by `HttpOnly`: the script can't read the value, so there's nothing to carry away — `SameSite` plays no part in it. What the missing `SameSite` *does* open up is CSRF, and CSRF never needs the value either: it's the victim's own browser that attaches the cookie to the forged request. Meanwhile, while the script is running, it can still act as the victim, because the browser auto-attaches the `HttpOnly` cookie to every request the script fires.

**Token in localStorage vs. HttpOnly cookie:** localStorage has no read-protection equivalent to HttpOnly, so XSS can steal a token outright — strictly more exposed than a well-configured HttpOnly cookie.

## Where things stand

Needs review. The basics — sessions vs. tokens, OAuth, and the cookie/CSRF/XSS security model — have held up across several reviews, and two things are now clearly solid: the revocation tradeoff (reasoned out unprompted, cost named precisely) and the fact that the browser still auto-attaches an `HttpOnly` cookie to script-fired requests. Two misconceptions came up and were corrected in the most recent review, each worth a light confirm-only check next time rather than a re-teach. First, "why mobile favors tokens" had drifted toward a vague "closer to the hardware" framing; the WebView case settled it as "is a browser engine present?" — the answer was uncertain before the explanation, so confirm it sticks. Second, a missing `SameSite` flag was blamed for letting an XSS attacker steal and replay the cookie; after a fair pushback (missing `SameSite` does enable CSRF), the separation of theft-and-replay (`HttpOnly`) from CSRF (`SameSite`) was re-derived correctly. An earlier gap — treating a lookalike phishing domain as a `SameSite` question instead of domain scoping — was corrected and hasn't recurred. Revisit later for depth: CSP, synchronizer-token CSRF defenses, refresh-token rotation.

## Related pages

- [APIs](apis.html) — the same resource-modeling style applies to auth-related endpoints.
- [Review Schedule](../review-schedule.html) — spaced-repetition status for this topic.
