# Who checks that a FitOut host is a real person?

**For:** the PM. **Written by:** the SWE, plan 18-14. **Date:** 2026-09-01.
**This is a fork you decide, not a report you file.** Three options, one recommendation, and every
claim below carries a label saying how I know it.

| Label | Means |
|---|---|
| **[PROBED — date]** | I ran it against the live thing and this is what came back. |
| **[CITED — source, date]** | I read it on a page I did not write. It could change tomorrow. |
| **[ASSUMED]** | Nobody has checked. If it is wrong, the answer may change. |

---

## The verdict

**Stay manual for now. Do not wire PayMongo Linked Accounts. When volume forces the issue, take
Didit — and budget roughly one plan for it, not a re-architecture.**

Two reasons, in order of weight:

1. **PayMongo would undo the main thing Phase 18 built.** It is not a pricing argument — the pricing
   argument actually favours PayMongo. See the next section; it is the whole decision.
2. **Nothing is under strain yet.** Phase 18 ships a real identity gate with a real operator behind it
   and a real audit trail. What it does not have is a *machine* doing the checking, and at launch supply
   volumes a machine is not obviously cheaper or faster than you approving a queue.

**What I need from you: one answer — PayMongo, a vendor, or stay manual.** Recorded as a D-number so
the next phase inherits it rather than re-asking.

---

## The structural argument — read this before any price

Phase 18's central move (D-225) was to make "is this host a real person?" a **separate question** from
"can this host be paid?".

Before Phase 18 those were the same question, and the answer was embarrassing. The only identity signal
FitOut had was `payoutsEnabled` — a flag set by a PayMongo webhook. But PayMongo's Platforms product is
sales-gated and we have never been granted it, so in production that flag never turns true on its own
merits. **The effective identity check was: the host clicked a link in an email.** That is the sentence
D-225 exists to delete.

The sell-gate now has six terms. The third is `payoutsEnabled`. The fifth and sixth are the new ones —
the listing has been reviewed, and the host has been verified — and they were written to be
**independent** of the third, deliberately.

**Choosing PayMongo Linked Accounts collapses the fifth and sixth back into the third.** PayMongo's
account activation *is* its payouts gate — the same `merchant.activated` webhook, the same
`activation_status` field. Identity would once again mean "PayMongo let this account move money", which
is the coupling we just spent a phase removing, and it reattaches to the one gate that in production
never turns true.

Marginal cost of PayMongo is roughly **₱0**. It does not outweigh this. That is the argument.

---

## The three options

| | **A — PayMongo Linked Accounts** | **B — a standalone KYC vendor** | **C — stay manual** |
|---|---|---|---|
| **Cost** | ≈ ₱0 marginal — part of the platform relationship we already pay for | Didit: 500 free/month, then **$0.33** per check. Sumsub: **$1.35** + **$149/mo** floor | ₱0 in fees; costs *your time*, ~2 min per host |
| **Can we even get in?** | **No.** Sales-gated. Never walked. Re-probed today — see transcript | **Yes** for Didit and Sumsub — sign up, no sales call | Already shipped and running |
| **How deep is the check?** | Government ID + selfie, reviewed by PayMongo's risk engine. BSP-regulated | ID + liveness + face match + watchlist, configurable per module | A human at FitOut looks at whatever the host sends |
| **Where does the data live?** | Philippines (BSP-supervised entity) | US/EU by default; PH residency is an enterprise add-on | Nowhere — see below |
| **What FitOut stores** | Account id + activation status | Pass/fail + a vendor reference | Pass/fail + who decided |
| **Cost to switch to it** | Re-couples identity to payouts — see above | ~one plan | — |

**In every option, FitOut stores exactly four fields: `{ result, vendorRef, checkedAt, provider }`.**
Never a government ID, never a document, never an image. That is enforced by the database itself, not by
a promise: `host_verification` has no column that could hold one, and a test asserts the exact column
list against the live schema, so adding `selfie_url` turns the build red.

---

## Option A — PayMongo Linked Accounts

### The evidence, quoted rather than summarised

This project probed PayMongo's Platforms endpoints in test mode on **2026-07-23**. That transcript is
recorded permanently in the source, and this is it verbatim:

```
[PROBED — 2026-07-23, PayMongo test mode; src/lib/payments/refund-rail.ts:22-30]

  - `GET /v2/wallets?status=activated` → HTTP 200 with ZERO wallets — Platforms / Linked Accounts is
    not enabled on this test account.
  - `GET /v2/transfers/receiving_institutions?provider=instapay` → HTTP 404, raw body
    `{"errors":[{"code":"not_found","detail":"failed to get transfer: resource not found"}]}` — the
    router resolved `receiving_institutions` as a transfer-id lookup, i.e. the Money Movement endpoints
    are ABSENT until PayMongo enables the feature on the account.
```

**I re-ran both calls today, 40 days later, on the same key. The answer has not moved.**

```
[PROBED — 2026-09-01, PayMongo test mode, same key as 2026-07-23]

GET /v2/wallets?status=activated
  -> HTTP 200
  -> {"data":[]}

GET /v2/transfers/receiving_institutions?provider=instapay
  -> HTTP 404
  -> {"errors":[{"code":"not_found","detail":"failed to get transfer: resource not found"}]}
```

That re-probe closes research assumption **A1** ("PayMongo Platforms is *still* sales-gated"), which
was `[ASSUMED]` when this document was commissioned and is now **[PROBED]**.

Read plainly: **HTTP 200 with zero wallets** means the endpoint exists and our account has nothing on
it. **HTTP 404 on receiving institutions** means the money-movement endpoints are not merely empty —
they are absent until PayMongo enables the feature for us. Two months apart, identically.

**And their own documentation for it is gone.**

```
[PROBED — 2026-09-01]
https://docs.paymongo.com/docs/paymongo-platforms       -> HTTP 404
https://developers.paymongo.com/docs/paymongo-platforms -> HTTP 404 (redirects to the same)
```

**This project has never walked PayMongo Platforms.** Not once, not in sandbox. Every statement about
what it would do for us is inference from marketing pages and a help-centre article.

### The six dimensions

- **Cost — ≈ ₱0 marginal.** Not separately priced; it is part of the platform relationship.
  **[ASSUMED]** — there is no published price sheet, because there is no published product page.
- **Reachability — sales-gated.** **[PROBED — 2026-09-01]**, twice now, negative both times. Their
  marketing page links a self-serve dashboard signup **[CITED — paymongo.com/products/fintech-infrastructure/onboard-and-verify,
  2026-09-01]**, so it is *possible* self-serve exists and our test account simply is not on it. Nobody
  has tried, because trying means a sales conversation.
- **KYC depth — good.** "The authorized representative must provide legitimate government-issued ID and
  selfie; accounts are subject to review by PayMongo's risk engine." **[CITED — paymongo.help/en/articles/10123821-what-is-hosted-onboarding,
  2026-09-01]** They are a BSP-regulated e-money issuer, so their bar is a bank's bar.
- **Data residency — Philippines.** PH-domiciled, BSP-supervised. **[CITED — same, MEDIUM confidence]**
- **What FitOut would store — the right thing.** Onboarding is a *hosted redirect*: the host leaves
  FitOut, gives PayMongo their ID and selfie, and comes back. FitOut receives an account id and an
  activation status. **The document never touches us.** That is exactly the storage contract D-206 was
  written to protect, and it is genuinely the strongest thing about this option.
- **Switching cost — low in code, high in architecture.** The code is one provider module like any
  other. The architecture cost is the D-225 re-coupling above, and that is not paid in code.

**Verdict on A: no.** Not because it is bad — the storage story is the best of the three — but because
it buys identity by re-attaching it to payouts, and because after two probes two months apart we still
cannot reach it. We would be choosing a gate we cannot open.

---

## Option B — a standalone KYC vendor

**Nothing here was probed.** Every figure is a published list price read off a vendor's own pricing
page. That is a real weakness in this section and I am not going to dress it up: the tonal model for
this document is a verdict settled by *observed* behaviour, and this half of the fork has none.

| Vendor | Sandbox without a sales call? | Published price | PH depth | Confidence |
|---|---|---|---|---|
| **Didit** | **Yes** — free tier, no card, no minimum, no contract | **500 full checks/month free**, then **$0.33** per check. Modules $0.03–$2.00 (ID $0.15, liveness $0.10, face match $0.05, watchlist $0.20) | "220+ countries" — **PH not named**. Data residency is enterprise-only | **MEDIUM** [CITED — didit.me/pricing, 2026-09-01] |
| **Sumsub** | **Yes** — 14-day trial, 50 free checks | **$1.35**/check + **$149/mo** floor (Basic); $1.85 + $299/mo (Compliance) | No APAC/PH specifics published | **MEDIUM** [CITED — sumsub.com/pricing, 2026-09-01] |
| **Innov8tif / EMAS** | **No** — enterprise/ASEAN sales motion | Not published | **Best PH document coverage found**: PhilSys National ID front *and* back, UMID, SSS, driver's licence, professional ID, voter's ID, passport | **MEDIUM** [CITED — innov8tif.com, 2026-09-01] |
| **Verihubs** | Not found | "No minimum commitment" — **but PH rates differ from published rates; contact required** | PhilSys-aware | **LOW** — vendor blog copy only |
| **Persona** | Their pricing page returns **HTTP 403** to an automated fetch | ~**$1.50**/check, per competitors' comparison pages | Unverified | **LOW** — **[ASSUMED]**, third-party figures |

### The six dimensions

- **Cost.** At launch volumes Didit is free. **500 host verifications a month is more supply than FitOut
  will onboard in a single city for a long time.** Sumsub's $149/month floor is the real difference
  between the two: it is ~₱8,500/month whether you verify one host or a hundred.
- **Reachability — the decisive practical difference from Option A.** Didit and Sumsub can both be in
  our hands this afternoon without talking to anyone. **[CITED — 2026-09-01]** That is worth more than a
  price gap.
- **KYC depth.** Modular: ID scan, liveness, face match, watchlist. Deeper than a human squinting at a
  photo. Innov8tif is the only one that publishes named PhilSys support — which matters, because
  PhilSys is what a Filipino host will actually hand you.
- **Data residency — US/EU by default, and this is fine.** See the regulatory section; it is the single
  most decision-relevant fact in this document and it probably inverts what you expect.
- **What FitOut stores — the same four fields.** The vendor keeps the document; we keep a reference.
  Identical to Option A on the one thing D-206 cared about.
- **Switching cost — roughly one plan.** Quantified below.

**Verdict on B: Didit when the time comes.** Free at our volume, reachable without a sales call, and
the only real risk is that PH-specific pricing turns out to differ — which every vendor page found says
is quote-only, so it is a risk you carry on any of them.

---

## Option C — stay manual, and it is a real option

**Not the status quo this fork is trying to escape. A live candidate that may beat both.**

D-206 shipped an ops-manual provider behind the port. It is not a placeholder — it is a working
provider: an operator decides, the decision is stored as `{ result, vendorRef, checkedAt, provider }`,
an audit row is written naming who decided, and the sell-gate reads the result. The storage contract is
satisfied **in full**, because FitOut stores no document either way.

At launch volumes:

- **A vendor's marginal cost is genuinely zero** (Didit's free tier), so Option B does not *save* money —
  it saves *your minutes*.
- **A vendor's setup cost is one plan.** Option C's setup cost is zero, because it is already running.
- **Manual is slower per host and does not scale**, and that is the whole of its case against.

**The honest framing: this is a decision about your time, not about money.** When approving hosts starts
eating a real part of your week, take Didit. Until then, a vendor buys you nothing you do not already
have — and Success Criterion 7's literal wording ("runs through a third-party vendor") is **deferred**
while the contract it exists to protect (no government ID at FitOut) is **already met**.

---

## The regulatory section — and it inverts an intuition

Three facts, and the third is the one that changes the answer.

**1. PhilSys is the anchor.** BSP Circular No. 1170 (2023) governs electronic KYC and treats PhilSys as
sufficient proof of identity; the ePhilID is recognised as equivalent to the physical card for customer
due diligence, and its QR code can be read remotely. Around 80% of the population is registered.
**[CITED — BSP Circular 1170; ~2026 registration figure via vendor explainers, MEDIUM]**

**2. ⚠ But Circular 1170 does not bind FitOut. [ASSUMED — and this is the one line I want counsel to
read.]** It binds *BSP-supervised institutions* — banks and e-money issuers. That is PayMongo. FitOut is
a marketplace, not a financial institution; our obligation is the **Data Privacy Act of 2012 (RA 10173)**,
not BSP customer due diligence. **Do not import a bank's compliance burden onto a marketplace.**
If this assumption is wrong the bar is materially higher and a PH-licensed vendor becomes closer to
mandatory — which would strengthen Innov8tif and weaken Didit. **One line of counsel review settles it;
the phase does not act on it either way.**

**3. There is no data-residency mandate — so a US/EU vendor is not disqualified.** The DPA places no
restriction on cross-border transfer of personal data given consent and contractual safeguards, and the
National Privacy Commission published model contractual clauses for exactly this in **NPC Advisory No.
2024-01 (30 May 2024)**. **[CITED — privacy.gov.ph, MEDIUM-HIGH]**

Fact 3 is why "PayMongo is Philippine and therefore safer" is not a reason to choose it. **Residency is
not the constraint most people assume it is.**

---

## What switching actually costs — the port's return on investment

Phase 18 built a verification **port** rather than a vendor integration, on your PM-1 instruction
("adapter now, vendor later"). This is the section where that decision is cashed in.

Adopting any Option-B vendor is:

1. **One new provider module** implementing the existing contract,
2. **one environment credential**,
3. **one webhook route**, if the vendor answers asynchronously,
4. and `provider` starting to carry a new value in rows that already have that column.

**No database change.** `{ result, vendorRef, checkedAt, provider }` already anticipates a vendor
reference — `vendorRef` exists today and the manual provider simply leaves it null.
**No sell-gate change.** The gate reads the host's *status*, which the port sets; it does not know or
care which provider set it.

**Roughly one plan.** Not a phase, not a re-architecture. That number is the port's whole justification,
and it is why deferring this decision costs nothing — which is also why "stay manual" is safe rather
than merely convenient.

---

## What this document does not know

Stated plainly, because a decision doc that hides its gaps is worse than no doc.

1. **No sandbox was walked, on either side.** Option A was probed and came back negative; Option B was
   not probed at all. Every Option-B figure is *published*, not *measured*. This directly contradicts
   the standard this project holds itself to elsewhere, and you should discount the Option-B numbers
   accordingly.
2. **PayMongo's Platforms documentation page returns 404** on both hosts **[PROBED — 2026-09-01]**. Its
   current self-serve status is genuinely unknown; the last first-hand evidence is ours and it is
   negative, twice.
3. **PH-specific pricing is unpublished by every vendor found.** The figures above are global list
   prices. Every vendor page that mentions the Philippines says PH rates are quote-only.
4. **Success Criterion 7's literal wording is deferred.** No third-party vendor runs the check today.
   The storage contract it exists to protect is satisfied in full.
5. **Every figure expires.** The vendor research behind this document is marked valid until
   **2026-09-15**. After that, re-read the pricing pages before signing anything.

---

## The decision

**Recommended: Option C now, Option B (Didit) when your time becomes the constraint. Not Option A.**

Please answer with one of:

- **"Stay manual"** — recorded as a D-number; nothing to build; revisit when the approval queue starts
  costing real hours.
- **"Didit"** (or another Option-B vendor) — I open one plan; no schema change, no gate change.
- **"PayMongo"** — I will build it, and I will re-record the D-225 coupling at the site so whoever reads
  it later knows the trade was made deliberately. Expect a sales conversation before any code.

And separately, whenever convenient: **one line of counsel review on assumption 2 above.** It does not
block anything, and it is the only item here that could change the shape of the answer rather than the
timing of it.
