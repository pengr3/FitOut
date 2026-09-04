# Finding — the listing-creation phantom 404 on `/host/listings/[id]/edit`

**Phase:** 19 — Host Listing Surfaces & Gates That Actually Run
**Requirement:** HSURF-02
**Written by:** plan 19-05, the reproduction gate (D-09)
**Date of the probes recorded here:** 2026-09-04
**Evidence:** [`evidence/probe-dev.txt`](./evidence/probe-dev.txt), [`evidence/probe-prod.txt`](./evidence/probe-prod.txt)

---

## Why this document exists

This defect class has cost real time **twice** on this machine — phantom `tsc` errors from a
half-written `.next/dev/types/routes.d.ts`, and this phantom 404 — and **neither occasion left
anything behind**, so both were re-diagnosed from scratch. That is the whole rationale the PM gave
weight to in D-11.

This file is the **record**. Plan 19-06 ships the **instrument**. Neither is a fix, because the
evidence does not support one.

> ⚠ **A finding that names a cause is worse than no finding.** This document's job is to record the
> discriminator so the next reader does not start from scratch — not to supply a diagnosis the
> evidence does not support. Where something is inferred rather than measured, it is labelled
> inference, every time, including when that makes the document less satisfying to read.

---

## 1. The verdict

## **VERDICT A — NOT REPRODUCED IN DEV, NOT REPRODUCED IN PROD.**

Of the three outcomes 19-RESEARCH § 1.2 step 7 allows (A: reproduced in neither; B: reproduced in
dev only; C: reproduced under a production build), the measurements landed on **A**.

**Consequence, per D-09:** **no application file changes for HSURF-02.** The idempotent creation
(D-02) and the failure sentence (D-03) are a separate defect and stand on their own merits.

**What verdict A costs:** only verdict **B** — a live, reproducing dev server — could have closed
unproven items (a) and (c). There was no live failure to hand to `/gsd-debug` (D-10), because
nothing failed. So this phase closes exactly one of the three unproven items, and says so plainly
below rather than rounding the other two up.

### 1.1 — The two matrices, all eleven rows each

Every request in both matrices is **ANONYMOUS** — no cookie, no session. That is what makes the set
decisive. `EditListingPage` redirects to `/login` at
`src/app/(host)/host/listings/[id]/edit/page.tsx:30-33`, **before** the `db.select()` at `:43` and
long before the `notFound()` at `:49-51`. An anonymous caller that reaches that module **can only
produce a 307**. A 404 therefore proves the module never ran.

| # | URL | 2026-09-03 (broken) | **DEV** (clean `next dev`) | **PROD** (`next build` + `next start`) |
|---|---|---|---|---|
| 1 | `/host/listings` | `307 → /login` | `307 → /login` | `307 → /login` |
| 2 | `/host/listings/new` | `307 → /login` | `307 → /login` | `307 → /login` |
| 3 | `/host/listings/{draft-uuid}/edit` | **`404`** ← the subject | **`307 → /login`** | **`307 → /login`** |
| 4 | `/host/listings/{draft-uuid}/availability` | **`404`** ← the subject | **`307 → /login`** | **`307 → /login`** |
| 5 | `/host/listings/zzz/edit` | **`404`** | **`307 → /login`** | **`307 → /login`** |
| 6 | `/host/listings/uat_listing_bookable/edit` | **`404`** | **`307 → /login`** | **`307 → /login`** |
| 7 | `/host` | `307 → /login` | `307 → /login` | `307 → /login` |
| 8 | `/bookings/abc` | `307 → /login` | `307 → /login` | `307 → /login` |
| 9 | `/listings/uat_listing_bookable` | `200` | `200` | `200` |
| 10 | `/invite/abc` | `200` | `200` | `200` |
| 11 | `/ops` | `404` | `404` (control held) | `404` (control held) |

`{draft-uuid}` is the literal `e6ca32d0-41c1-4fbf-9cee-79402b962c51` in every pass, kept unchanged so
the rows are comparable. **That row was deleted from the database by plan 19-04** and the measurement
is unaffected: `listing.id` is `text` (`schema.ts:202`), the segment matcher accepts any string, and
the request is anonymous so the module redirects before it reads the database.

**Row 5 is the sharpest discriminator in the set** and it behaved as predicted. `zzz` is not a uuid,
but the module still runs, so an anonymous caller gets `/login`. A `404` on row 5 alongside `307`s on
rows 1/2/7 is the signature of a routing-layer failure scoped to the `[id]` segment. It did not occur.

### 1.2 — The manifest observations that accompany each matrix

| Observation | Clean dev server | Production build |
|---|---|---|
| `grep -c 'listings/\[id\]/edit'` in the running server's manifest | **1** (present) | **1** (present) |
| `grep -c 'listings/\[id\]/availability'` | **1** (present) | **1** (present) |
| manifest entry count | 10 | 46 |
| compiled `edit/page.js` | present, 6496 B, written **during** the probe | n/a (production bundle) |
| compiled `availability/page.js` | present, 6420 B, written **during** the probe | n/a (production bundle) |

The production manifest's `grep -c` of **1** re-confirms the one archived production-manifest
measurement that plan 19-04 recorded as no longer independently verifiable — 19-04 could not
re-verify the file's **mtime** (`Sep 3 15:57`), but its **count** is re-established here.

### 1.3 — Environment variables required to boot the production server

**Only the platform-wallet pair**, supplied inline for one command, as visibly fake self-describing
values that carry no secret:

```
PLATFORM_WALLET_NUMBER=dev-wallet-not-a-real-account
PLATFORM_WALLET_NAME="FitOut Dev Platform"
```

None of the other four module-scope boot guards `ci.yml:626-641` enumerates
(`BETTER_AUTH_SECRET`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `INNGEST_SIGNING_KEY`) had
to be supplied and none fired. **No guard was weakened, edited or bypassed**, and nothing was written
to `.env.local`.

---

## 2. A CONTRADICTING MEASUREMENT THAT MUST NOT BE SMOOTHED AWAY

**This is the most important section of this document for the next reader, and it is the one a
summary would be most tempted to drop.**

19-RESEARCH § 1.0 concluded the failing process was gone and the class therefore no longer
observable. **Plan 19-02 then reproduced it incidentally**, on 2026-09-04, on a *fresh* `next dev`
process booted against the **surviving** `.next` from 2026-09-03 — while doing unrelated work. It
measured:

| URL | Status, as measured by 19-02 |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/host` | **307** (correct for an anonymous caller) |
| `/host/listings` | **404** |
| `/host/earnings` | **404** |
| `/host/payouts` | **404** |
| `/host/listings/new` | **404** |

Three properties of that observation, all recorded at the time:

1. It hit **every `/host/*` subroute**, not only `listings/[id]/edit`. The originally-reported route
   may be one instance of a wider symptom.
2. **`/host` itself served 307 correctly** while its subroutes 404'd.
3. `.next/dev/server/app-paths-manifest.json` at that moment **did contain**
   `"/(host)/host/listings/page"` — so **a missing manifest entry is not a necessary condition** for
   this symptom, which is what 19-RESEARCH § 1.0 had assumed.

**The two results disagree, and both are recorded here with the conditions that produced them:**

| | 19-02's observation | 19-05's probes (this document) |
|---|---|---|
| When | 2026-09-04, incidentally | 2026-09-04, deliberately |
| `.next` state | the **surviving 2026-09-03** `.next` | **freshly cleared and rebuilt** |
| Process | a fresh `next dev` against an old build dir | a fresh `next dev`, then a fresh production build |
| Purpose of the run | unrelated (an HSURF-01 typecheck detour) | this probe protocol |
| `/host/*` subroutes | **404** | **307** |

**Neither result is discarded in favour of the other.** 19-02's was measured under conditions this
plan destroyed by design (D-09's clear) and cannot restage; 19-05's was measured under the protocol
the phase specified. It is also fair to record that 19-02's was **observed incidentally by a plan
whose job was something else**, so it is not a clean, instrumented reproduction — and equally that it
**is a real measurement on a fresh process**, which is more than 19-RESEARCH expected to exist.

**What follows from the disagreement, stated as a question rather than an answer:** the
distinguishing variable between the two runs is the **state of the `.next` directory** the server
booted against — old versus freshly built. That is the discriminator the next reader should start
from. **It is NOT a cause, and section 4 explains why this document refuses to promote it to one.**

---

## 3. Unproven item (a) — that `rm -rf .next` + restart makes it go away

**Disposition:** `OPEN — NOT CLOSEABLE`

**Not closeable. The dev server that exhibited the 404 was already gone when the phase opened**
(measured 2026-09-04: nothing on `:3000`, `curl` returned `000`, connection refused). **A clean
restart serving 307 shows the current tree routes correctly; it is not evidence about the old
process.**

This item is **permanently open**. Nothing this phase can now run will close it, because closing it
requires the failure to be **live**: the 404 observed on a running server, then that *same* server
killed, `.next` cleared, restarted, and the same URL returning 307. The first term of that sequence
no longer exists and cannot be recreated on demand.

⚠ **This document does not state that clearing `.next` fixed anything.** Plan 19-02 recorded a
`rm -rf .next` followed by a restart after which the same four URLs served `200 / 307 / 307 / 307`.
Two different processes, and **more than one thing changed between them**. "Clearing `.next` fixed
it" is precisely the sentence D-11 and 19-RESEARCH Pitfall 3 forbid. What is on the record is the
observation and its two ends — not a mechanism connecting them.

---

## 4. Unproven item (b) — whether it reproduces under a production build

**Disposition:** `CLOSED`

**CLOSED: the defect does not reproduce under a clean production build.**

This is the one item the phase could close, and it closed it. `npm run build` (exit 0) followed by
`npm start` produced a status matrix **byte-for-byte identical to the clean dev server's** across all
eleven URLs. The four subject rows — 3, 4, 5 and 6 — each served `307 → /login`, meaning the page
module ran in every case, which is exactly what the 2026-09-03 `404`s proved had *not* happened.

The production route manifest contains the edit route (`grep -c` → **1**), and the build's own route
table lists both `/host/listings/[id]/edit` and `/host/listings/[id]/availability`.

**Scope of this closure, stated precisely so it is not over-read:** it establishes that the defect
does not reproduce under a production build **on this machine, on this tree, on this date**. It says
nothing about any deployed environment. A related production-scope question raised by plan 19-04
remains **OPEN and unanswered by the PM**, and is recorded in `.planning/WINDOWS.md`.

---

## 5. Unproven item (c) — what removed the manifest entry

**Disposition:** `OPEN — REFRAMED`

**This section is a REFRAMING OF THE QUESTION. It is not an answer, and it must not be read as one.**

### 5.1 — The three mtimes the reframing rests on

All three measured from `.next/dev` before it was cleared, and preserved in
`evidence/dev-artifact-mtimes.txt`:

| Artifact | mtime (2026-09-03) |
|---|---|
| compiled `edit/page.js` | **15:18** |
| `.next/dev` session markers (`package.json`, `routes-manifest.json`, `types/`) | **18:09** |
| `.next/dev/server/app-paths-manifest.json` (the manifest that omits the route) | **19:33** |

So the compiled artifact on disk is **2h51m older** than the session markers, and the manifest that
omits it is **4h15m younger** than the artifact.

### 5.2 — Why the question may be the wrong question

**Stated as inference, explicitly labelled, because both premises are UNPROVEN:**

- **INFERRED (assumption A4, UNPROVEN):** that Next 16's `.next/dev/server/app-paths-manifest.json`
  behaves as an **incremental, on-demand compile ledger of the current session**. This is inferred
  from mtimes and the entry set **on one machine**. It is **not established**. If it is wrong, the
  original "something removed the entry" framing stands unchanged.
- **INFERRED (assumption A5, UNPROVEN):** that the compiled `edit/page.js` is a **leftover from a
  pre-18:09 session** rather than something that session produced. This rests on the session-marker
  mtimes being what they are taken to be. It is **not established**.

If both inferences held, then **"what removed the entry" would be the wrong question — nothing
necessarily removed it, and the 18:09 session may simply never have added it.** That would not
explain the 404 either, since an uncompiled route in `next dev` is normally compiled on demand at
request time. **Which is exactly why this is recorded as a reframing of an open question and not as
an answer.**

**A weakening observation, recorded against the reframing rather than hidden from it:** plan 19-02
measured a 404 on `/host/listings` while that route's entry **was present** in the running manifest.
A present entry did not prevent the symptom. **This weakens the manifest-centred framing of item (c)
generally**, including the reframing above. It is recorded here because a finding that only collects
evidence supporting its own framing is not a finding.

**A second observation, from this plan's own clean-dev probe, recorded with the same care:** all 10
manifest entries on the clean session corresponded to URLs the probe had just requested, and both
subject artifacts carried mtimes inside the probe window. That is **consistent with** A4 — and one
clean session on one machine **does not establish it**.

### 5.3 — The five candidates. NONE is attributed.

**Candidates not discriminated:**

1. **A swallowed compile error** — the route failed to compile and the error never surfaced.
2. **An HMR write race** — a hot-module-reload write interleaved with a manifest write.
3. **A `next build` racing a `next dev`** on the shared `.next` directory.
4. **A bundler (Turbopack) bug.**
5. **Nothing removed the entry at all** — the session may simply never have added it. (The fifth
   possibility, newly on the list, following from § 5.1's mtimes and the inferences in § 5.2.)

> ⚠ **NO CANDIDATE ABOVE IS NAMED AS THE CAUSE, AND NONE IS RANKED.** Discriminating between them
> requires a **live** failure plus `next dev`'s own stdout (for a swallowed compile error) plus the
> artifact mtime before and after the request. That is verdict **B**, and this phase landed on
> verdict **A**. The evidence to choose among these five does not exist, and inventing a preference
> among them would be the confident-wrong-claim this project's house rules forbid.

Note that candidate 3 is the reason this plan's production probe **killed the dev server before
building** — running them concurrently would have manufactured the very confound the phase is trying
not to confuse itself about.

---

## 6. The probe set is ELEVEN URLs, not ten

**`PITFALLS.md § B5` calls this "the ten measured URLs" and then lists eleven. The prose count is
wrong; the list is right.** Both `ROADMAP.md` and `19-CONTEXT.md` inherit the wrong count from it.

Both matrices in this document use **all eleven**. **There is no twelfth URL — stop looking for one.**
This correction is written down because the miscount has already propagated through three documents,
and the next reader would otherwise spend time hunting for a missing row.

---

## 7. The `/ops` regression control

**`/ops` stayed `404` in both matrices — the clean dev server and the production build.** It is in
the probe set as a **regression control, not as a subject**: D-219's cloak makes the ops console
answer a prober with the same status a nonexistent route gives, and this phase must not disturb it.
The control held, so the cloak's status half is intact across everything this phase did.

One out-of-scope observation, recorded rather than buried, and **claimed in neither direction**:
under the production build (where output is stable and the comparison is valid) the `/ops` body is
**not byte-identical** to the root not-found — 25970 bytes against 29644. What differs is *shared
site chrome*, which `/ops` renders **less** of; both bodies carry the identical
`<title>Page not found · FitOut</title>`, and **no ops-identifying string leaks** (`ops-console`,
`Console`, `staff`, `wordmark`, `Dashboard` are all zero in both). It is **pre-existing** — no
phase-19 commit touches `/ops` or not-found rendering — so the scope boundary forbids fixing it here.
Logged to `deferred-items.md` (D2) and the broken-windows ledger for whoever owns D-219.

⚠ The same body comparison is **invalid in `next dev`** and must not be attempted there: `/ops`
fetched twice differs **from itself**, because dev-mode HTML is not stable request-to-request.

---

## 8. For the next reader — start here, not from scratch

**The instrument this phase leaves behind is plan 19-06's routing guard**, `e2e/host-route-reachability.spec.ts`
(D-11). It issues **anonymous** requests to host-facing routes and asserts each resolves to its
module (`307`), so a route that stops resolving says so **in one sentence**, immediately, instead of
being re-diagnosed from scratch a third time.

**Why that guard is worth having even though coverage already existed.** `e2e/axe-sweep.spec.ts:311-315`
already goes red if `/host/listings/new` stops landing on the wizard — and **nobody knew it did**.
Its failure message reads *"this row resolves its path from the running app, and the app produced
none… seed the local database"*: it names a **fixture** problem, not a **route** problem, and it
costs 60 seconds to arrive at the wrong diagnosis. **The value of 19-06's guard is entirely in the
failure sentence, not in the coverage.**

**If you are here because the 404 came back, read this order:**

1. **`evidence/probe-dev.txt` and `evidence/probe-prod.txt`** — the two matrices, and what healthy
   looks like per row.
2. **§ 2 of this document** — the contradiction between 19-02's reproduction and 19-05's clean
   probes, and the one variable that distinguishes the two runs (the state of the `.next` directory
   the server booted against). **That is the discriminator to start from.**
3. **Run the eleven-URL anonymous probe** (19-RESEARCH § 1.1) before touching any source file. A
   `307` on rows 3/4/5/6 means the module ran and the problem is elsewhere.
4. **If it IS reproducing live, you have verdict B — the scarcest thing in this investigation.**
   **Stop and capture before you fix anything:** `next dev`'s stdout, the manifest **before and
   after** the request, and the artifact mtime **before and after** the request. Then hand it to
   `/gsd-debug`. That capture is what closes items (a) and (c), and it is the only thing that can.

> ⚠ **DO NOT "fix" a 404 here by softening the `notFound()` at
> `src/app/(host)/host/listings/[id]/edit/page.tsx:49-51`.** It is a **shipped ownership check**
> (IDOR guard) and D-10 forbids patching it absolutely. The 404 it renders is **byte-identical to the
> root not-found**, and that collision is the exact reason this looked like an application bug the
> first time. **Nothing under `src/app/(host)/host/listings/[id]/` was edited at any step of this
> plan** — verified by `git status --porcelain` on that directory returning no output, as an
> acceptance criterion of two separate tasks.

---

## 9. Summary of dispositions

| Item | Question | Disposition |
|---|---|---|
| **(a)** | Does `rm -rf .next` + restart make it go away? | **`OPEN — NOT CLOSEABLE`** — the process that failed was gone before the phase opened |
| **(b)** | Does it reproduce under a production build? | **`CLOSED`** — it does not, on this machine, on this tree, on this date |
| **(c)** | What removed the manifest entry? | **`OPEN — REFRAMED`** — five candidates, **none attributed**; the question itself may be wrong |

**Verdict: A.** **One item closed, two recorded open, and no cause named anywhere in this document.**

---

*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Plan: 19-05*
*Written: 2026-09-04*
