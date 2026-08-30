// The DEV-ONLY, PROCESS-LEVEL PayMongo interception seam (item 3, `[17-D18]`, plan 17.1-06, D-08/D-09).
//
// WHY THIS EXISTS. `[17-D18]` records the only assertion in the e2e suite that LEAVES THE MACHINE:
// visiting `/host/payouts/refresh` makes the Next server issue a real, credentialed POST to
// api.paymongo.com on every case, on whatever secret key the local `.env` holds. Plan 17.1-05's census
// (`17.1-EVIDENCE.md` § P3) measured the true size of that: per full run,
// `e2e/overflow-320.spec.ts` = 8 requests across 3 URLs on 2 endpoints, `e2e/axe-sweep.spec.ts` = 2
// requests on 1 endpoint — 10 in total, against the 2 the finding records. This file takes the network
// out of those runs WITHOUT taking the measurement out: the substituted response is the shape the app
// already handles, so the audit row, the rate-limit accounting and the rendered document are unchanged.
//
// ⚠ WHY IT IS A SERVER SEAM AND NOT `page.route` — MEASURED, AND THE FINDING'S OWN PRESCRIPTION WAS
// WRONG. `[17-D18]` prescribes *"`page.route` on the PayMongo origin"*. That cannot work: `page.route`
// intercepts requests the BROWSER makes, and every hop here is server-side (`refresh/page.tsx` →
// `refreshOnboardingLink` → `paymongoFetch` → Node's global `fetch`). A `page.route` repair would
// report green and measure nothing. This is the second time this phase family has caught that error
// class — `[17-D26]` prescribed `page.clock` against an RSC-computed value, was refuted by measurement,
// and was replaced by a server seam. That seam, `src/lib/dev/today-override.ts`, is this file's model.
//
// ⚠ AND UNSETTING THE KEY IS NOT A SUBSTITUTE. `authHeader()` in `src/lib/paymongo.ts` falls back to
// `""` and still sends `Basic <base64 of ":">`. Clearing the credential removes the credential, not the
// network. Only an interception removes the network.
//
// ── THE THREAT, AND THE TWO GUARDS (T-17.1-26 / T-17.1-29, ASVS V1/V14) ───────────────────────────
//
// `register()` runs on EVERY boot of this app, including production, before anything else — a root boot
// hook can reach anything the process can. On a money-handling marketplace that makes an ungated seam
// here an Elevation-of-Privilege / Tampering defect, not a testing convenience. Both guards below are
// load-bearing, and so is the shape of the import that follows them:
//
//   1. THE PRODUCTION GUARD IS FIRST AND IT IS A BUILD-TIME CONSTANT. `process.env.NODE_ENV` is inlined
//      by the bundler, so in a production build everything below it is dead code — PRUNED, not merely
//      skipped at runtime. It is deliberately NOT an operator-settable variable: an env var can be
//      flipped on a live deploy, a build-time constant cannot. Same reasoning and same spelling as
//      `src/lib/dev/today-override.ts` and `next.config.ts`, whose own words are the standard this file
//      is held to — *"a security relaxation should be impossible to carry across the dev/prod line by
//      accident, not merely harmless"*.
//   2. THE RUNTIME GUARD. `src/middleware.ts` exists, so Next invokes `register()` for a NON-nodejs
//      runtime as well, where the mock dispatcher cannot load at all. `NEXT_RUNTIME` is set by the
//      FRAMEWORK per invocation — it is not an operator knob and it cannot widen guard 1; it only
//      narrows. It is the sole reason the env-read assertion in `tests/security/paymongo-seam.test.ts`
//      admits two names instead of one.
//   3. THE MOCK DISPATCHER IS REACHED ONLY THROUGH A DYNAMIC `await import(...)`, AFTER BOTH GUARDS.
//      Never a top-level static import. Two reasons: a static import puts the specifier in the
//      production server bundle unconditionally, and it would defeat the pruning that makes guard 1 a
//      BUILD-TIME property rather than a runtime one. ⚠ Note what this argument does NOT rest on:
//      `[17-D29]` measured that `undici` survives `npm ci --omit=dev` on this repo (a production
//      `better-auth` dependency declares `vitest` as an optional peer, satisfied from the root copy, so
//      neither vitest, jsdom nor undici carries a dev flag). "It is not in the production tree" is
//      FALSE here. THE GUARD IS THE PROTECTION; THE DEPENDENCY SCOPE NEVER WAS.
//
// ── THE INTERCEPTION IS ORIGIN-LEVEL AND A CATCH-ALL, ON PURPOSE ──────────────────────────────────
//
// One persisted interceptor matching EVERY path and EVERY method on the origin, rather than one per
// known endpoint. § P3 is why: the census found a THIRD endpoint nobody had named — `[17-D27]`,
// `GET /v1/checkout_sessions/{id}`, 6x per `overflow-320` run, reached from an entirely different route
// than the two `linked_accounts*` paths the finding and the research both discuss. A path-scoped mock
// written from the two known paths would have left that one live. A catch-all covers the endpoint added
// next YEAR on the day it is added, not on the day somebody notices. `.persist()` because the same
// path is hit repeatedly within a run and a consumed interceptor would silently fall through.
//
// The reply is D-10's GATED-ERROR SHAPE and nothing else: 404, `content-type: application/json`, body
// `{ errors: [{ detail }] }`. `paymongoFetch` reads `errors[0].detail` and throws; the `catch` in
// `src/app/actions/paymongo-connect.ts` writes its `action: "startPayoutOnboarding"` /
// `outcome: "error"` / `meta.reason: "paymongo_error"` audit row; the route renders the fallback whose
// `h1` is `Let's pick up where you left off` — the exact tell both spec rows assert. Measured under the
// census: all four rows green, so the shape is proved rather than assumed.
//
// ── THE NET-CONNECT POLICY WAS MEASURED, NOT GUESSED (T-17.1-30) ──────────────────────────────────
//
// A blanket block of all outbound traffic is the obvious choice and § P3 REFUTES IT. The census logged
// the full server-side outbound host set across both spec files: FOUR hosts —
// `api.paymongo.com` (8 + 2), `api.resend.com` (12 + 2), `registry.npmjs.org` (1) and
// `telemetry.nextjs.org` (4 at boot). Two of those are application code and two are Next's own
// machinery, and the two Next-owned ones are INTERMITTENT — a second boot of the same instrument on the
// same box produced NEITHER — so an allow-list assembled from one boot is incomplete by construction.
// Decisively, `api.resend.com` is reached by a SHIPPED code path (`src/lib/email.ts` → `send()`), and
// blanket-blocking it would change the behaviour of the very runs the audit uses to measure the
// product, which is the exact objection `[17-D18]` itself raises against dropping the row.
//
// CHOSEN, THEREFORE: a deny-of-one. `enableNetConnect` with a predicate that admits every host EXCEPT
// api.paymongo.com. It fails CLOSED for PayMongo and OPEN for everything else, and it is stable
// boot-to-boot in a way no allow-list of an intermittent set can be. It is also the standing
// "zero outbound requests" assertion: should the catch-all interceptor ever stop matching, the request
// does not quietly leave the machine — it throws, loudly, naming the origin.
//
// (`api.resend.com` is its own finding, `[17-D28]`: 14 real POSTs per run pass through this seam
// untouched, on a live key. That is deliberately OUT of this seam's scope — silencing it is a separate
// decision on a separate finding, taken on purpose or not at all.)
//
// ── A NOTE ON WHAT THIS DOES *NOT* WIDEN ──────────────────────────────────────────────────────────
//
// It returns a 404 to ONE origin and nothing else. It cannot select a listing, cannot reach a price,
// cannot authorise a hold, cannot move money and cannot make a non-public listing render. It reads no
// request, no header and no body, and it reads no environment variable beyond the two guards above.
// It does not touch `src/lib/paymongo.ts` — seam A, making that module's base-URL constant settable,
// was REJECTED and stays rejected: a settable target on the one module that holds the secret key is a
// credential-exfiltration primitive, because the `Authorization` header follows the target
// (T-17.1-27). It does not touch the rate-limited audited action (seam B's site). It is not
// route-scoped (seam C), which is why `[17-D27]`'s other route is covered too.
//
// ── OPERATIONAL NOTES, BOTH MEASURED ON THIS BOX ──────────────────────────────────────────────────
//
//   · WHERE IT IS TESTED: `tests/security/paymongo-seam.test.ts`, collected by `vitest.config.ts` and
//     therefore run by `npm test` and CI's `gate-db` job — NOT by `npm run test:design` and NOT inside
//     `npm run build`. A green build does not cover this file. Do not read one as if it did.
//   · ⚠ EDITING OR DELETING THIS FILE WEDGES THE DEV SERVER UNTIL `.next/` IS CLEARED. Turbopack keeps
//     `.next/dev/server/instrumentation.js` and its chunk after the source moves, and the stale chunk
//     hard-fails the next boot with `MODULE_UNPARSABLE`. Playwright reports that only as *"webServer
//     was not able to start"*, and under `reuseExistingServer` a wedged server is adopted silently.
//     `rm -rf .next` first; terminate any server already on :3000 before you do.
//   · THE COST, STATED RATHER THAN HIDDEN: this is unconditional outside production, so LOCAL work
//     against real PayMongo (the manual onboarding UAT) cannot be done while this file is present.
//     That is the price of having no operator-settable escape hatch, and the escape hatch is exactly
//     what guard 1 exists to refuse. To do live PayMongo work locally, move this file aside, clear
//     `.next/`, and put it back — a deliberate, visible, git-tracked act, not a flag.
//   · This hook is loaded BY CONVENTION in Next 16 (measured on 16.2.7: both the repo root and `src/`
//     are loaded). There is deliberately NO `instrumentation` key in `next.config.ts` — a config entry
//     would be a second place the seam can be turned on.

/** The one origin this seam substitutes. Every other host passes through untouched. */
const INTERCEPTED_ORIGIN = "https://api.paymongo.com";

/** The same origin as a bare host, which is the value `enableNetConnect`'s predicate receives. */
const INTERCEPTED_HOST = "api.paymongo.com";

/**
 * The `detail` string the app surfaces in `paymongoFetch`'s thrown message. It names this file and this
 * plan so a developer who meets it in a log knows immediately that no request left the machine.
 */
const GATED_DETAIL =
  "intercepted by instrumentation.ts, the dev-only PayMongo seam (plan 17.1-06, 17-D18) — " +
  "no request left this machine";

/**
 * Next's server boot hook. Runs on EVERY boot; the guards are what make that safe.
 *
 * Outside production, on the nodejs runtime, it installs a global mock dispatcher that answers every
 * request to the PayMongo origin with the gated-error shape and lets every other host through. In
 * production it returns before it has done anything at all, and the bundler prunes the rest.
 */
export async function register(): Promise<void> {
  // GUARD 1 — must stay the first statement in this function. See the header.
  if (process.env.NODE_ENV === "production") return;

  // GUARD 2 — framework-set, narrows only. The mock dispatcher cannot load off the nodejs runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // DYNAMIC, and after both guards. See guard 3 in the header — this is not a tidy-able detail.
  const { MockAgent, setGlobalDispatcher } = await import("undici");

  const agent = new MockAgent();

  // Catch-all: every path, every method, persisted. See "THE INTERCEPTION" in the header.
  agent
    .get(INTERCEPTED_ORIGIN)
    .intercept({ path: () => true, method: () => true })
    .reply(
      404,
      { errors: [{ detail: GATED_DETAIL }] },
      { headers: { "content-type": "application/json" } },
    )
    .persist();

  // Deny-of-one, chosen from the measured host set. See "THE NET-CONNECT POLICY" in the header.
  agent.enableNetConnect((host) => host !== INTERCEPTED_HOST);

  setGlobalDispatcher(agent);
}
