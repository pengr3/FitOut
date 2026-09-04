# Which law actually requires FitOut to check its hosts?

**For:** the PM, and the counsel the PM takes this to. **Written by:** the SWE, 2026-09-01.
**Status:** desk research against published statute and regulator sources. **I am not a lawyer and
this is not legal advice.** Its purpose is to turn one vague question — *"does BSP bind us?"* — into
five sharp ones a lawyer can answer quickly, and to surface a finding that is bigger than the
question that started it.

Labels carry through from `18-KYC-VENDOR-COMPARISON.md`:

| Label | Means |
|---|---|
| **[CITED — source, date]** | Read on a page I did not write. |
| **[ASSUMED]** | Nobody has checked. |

---

## The headline

**PM-H asked whether BSP Circular 1170 binds FitOut. It does not — that half of the assumption is
CORRECT. But the conclusion attached to it — "so FitOut's only obligation is the Data Privacy Act" —
is WRONG.**

**Republic Act No. 11967, the Internet Transactions Act of 2023, imposes a direct merchant-identity
duty on online platforms, and it has been fully enforced since 20 June 2025.**
**[CITED — lawphil.net RA 11967; DTI E-Commerce Bureau; 2026-09-01]**

If FitOut is covered — and the safe working assumption is that it is — then host verification is not
a product decision FitOut made for trust reasons. **It is a statutory obligation FitOut has been
carrying since June 2025**, and Phase 18 is late compliance rather than a feature.

⚠ **That timing is the uncomfortable part and it should not be softened: full enforcement began
20 June 2025. Today is 1 September 2026 — roughly fourteen months.** FitOut has been live in
production across that window. This is the item that deserves counsel's time first, ahead of the
vendor question that prompted the research.

---

## 1. BSP Circular 1170 — the assumption holds

Circular 1170 (30 March 2023) amends **Sections 921 and 921Q of the Manual of Regulations for Banks
and for Non-Bank Financial Institutions**, and binds **BSP-supervised financial institutions** —
universal, commercial, thrift, rural, cooperative and digital banks, non-bank financial institutions,
and **e-money issuers**. **[CITED — bsp.gov.ph Circular 1170; multiple practitioner summaries;
2026-09-01]**

**PayMongo is one of those (a BSP-regulated EMI). FitOut is not.** FitOut does not inherit a bank's
customer-due-diligence programme, does not owe BSP a risk-based CDD policy, and does not file
suspicious transaction reports.

Nor is FitOut a **covered person** under the AMLA. The covered-person list runs to BSP/SEC/IC-supervised
financial institutions plus named DNFBPs — casinos, real-estate developers and brokers, offshore gaming
operators, dealers in precious metals and stones. **An online services marketplace appears nowhere on
it.** **[CITED — amlc.gov.ph; practitioner summaries; 2026-09-01]** ⚠ Stated as an absence from a list
rather than as an express exclusion — worth one line of confirmation, but the reading is
straightforward.

**Consequence for the vendor fork: the risk PM-H was hedging against does not materialise.** The
comparison doc said *"if this assumption is wrong the bar is materially higher and a PH-licensed vendor
becomes closer to mandatory — which would strengthen Innov8tif and weaken Didit."* The assumption is
**not** wrong. **Nothing here weakens Didit on residency or licensing grounds.**

---

## 2. The Internet Transactions Act is the regime that does bind us

### Section 21 — Obligations of E-marketplaces, quoted rather than summarised

> **(b)** Require, as far as practicable, all online merchants, whether foreign or Filipino, to submit
> the following, **prior to listing** with their platforms:
> **(1)** Name of the online merchant accompanied by **at least one (1) valid government
> identification** for individuals or business registration documents for juridical entities;
> **(2)** Geographic address where the online merchant is located;
> **(3)** Contact details of the online merchant which **must include a mobile or landline number and
> a valid e-mail address**; and
> **(4)** In instances when the services offered … is connected with the exercise of a regulated
> profession, the details of membership in any professional body …
>
> **(c)** **Maintain a list of all online merchants** registered under their platform, containing the
> information provided in Section 21(b). **The list shall be updated and verified regularly.**
>
> … In performing their obligations under this section, e-marketplace and other digital platforms are
> required to observe **ordinary diligence**. Failure to do so will subject them to penalties under
> Section 29 of this Act.

**[CITED — lawphil.net, RA 11967 § 21, 2026-09-01]**

Also in § 21, and each one lands on FitOut:

- **(d)** Data-privacy duty under RA 10173 plus minimum information-security standards. *"Digital
  platforms and e-marketplaces shall be covered by the provisions of Republic Act No. 10173."*
- **(f)** *"Provide an effective and responsive redress mechanism for online consumers **and online
  merchants** to report a user or information posted on the platform"* — this is backlog **999.4**
  (booker-side reporting) and backlog **999.6** (host appeals), and both are apparently **required**,
  not optional roadmap candidates.
- **Subpoena response** — specific merchant information on a competent authority's subpoena where a
  complainant cannot identify the perpetrator.
- **§§ 26–27** — **subsidiary liability** where the platform fails ordinary diligence; **solidary
  liability** for failing to remove goods or services that are prohibited, unsafe or dangerous.
- **§ 29** — administrative fines. Practitioner sources put the range at **₱5,000 to ₱1,000,000**,
  alongside DTI takedown orders (up to 30 days) and blacklisting. **[CITED — cruzmarcelo.com,
  2026-09-01]**

### Is FitOut an "e-marketplace"?

§ 4(e), verbatim from lawphil: *"digital platforms whose business is to connect online consumers with
online merchants, facilitate the shipment of goods or provide logistics services and post-purchase
support within such platforms, **and otherwise retains oversight over the consummation of the
transaction**."*

⚠ **Renderings of this definition differ across sources**, some including payment processing and an
`or` before "otherwise retains oversight". That ambiguity is genuine and it is counsel's to resolve.

**But the label may not matter.** § 21's closing paragraph binds *"e-marketplace **and other digital
platforms**"*, and § 4(d) defines digital platforms broadly — practitioner summaries name **travel
platforms** as an example, which is the closest published analogue to FitOut. **[CITED — 2026-09-01]**

On the substance rather than the label, FitOut connects consumers with merchants, concludes the sale,
**processes payment through the platform**, and — via hold-until-session payout — **literally retains
oversight over the consummation of the transaction**. That last clause describes FitOut's payout model
almost word for word.

**Working assumption: covered.** Counsel to confirm.

### ⚠ The C2C carve-out is the sharpest question for FitOut specifically

§ 3: *"Provided, That online media content, and **consumer-to-consumer (C2C) transactions shall not be
covered** under the Act."*

The IRR reportedly defines C2C as transactions between end-users **for personal, family or household
purposes and not in the ordinary course of business**, with a reported **ten-item** threshold and
indicia of business activity (a business name with an LGU permit, BIR-registered receipts, a logo,
continuous income-generating activity). **[CITED — practitioner summaries of the IRR, 2026-09-01 —
MEDIUM confidence; I did not read the IRR text itself]**

**FitOut's supply straddles this line by design.** A commercial pickleball court or a yoga studio is
plainly B2C. **A private individual renting out their home gym a few hours a week may be C2C — and
therefore outside the Act entirely.** That distinction decides whether verification is legally
mandatory for *every* host or only for the commercial ones, and it is a product-shaping answer, not a
footnote.

---

## 3. Cross-border to a US/EU vendor is fine — confirmed

The Data Privacy Act imposes **no data-residency mandate**. The NPC published **Advisory No. 2024-01
(30 May 2024)** on model contractual clauses for cross-border transfers; **their use is expressly
voluntary**, the NPC does not review agreements for conformity, and the advisory aligns with the ASEAN
MCCs and EU SCCs. **[CITED — privacy.gov.ph, NPC Advisory No. 2024-01; 2026-09-01]**

**"PayMongo is Philippine and therefore safer" remains not a reason to choose it.** The comparison
doc's fact 3 survives this research intact.

---

## 4. What this does to the decisions already taken

| Decision | Effect |
|---|---|
| **PM-F — Didit** | ⚠ **STRENGTHENED, not weakened.** BSP does not bind us, so no PH-licensed vendor is mandated. And the ITA's § 21(b)(1) government-ID requirement is precisely what Didit performs — while keeping the document off FitOut's own infrastructure, which § 21(d)'s DPA duty makes an **asset**. |
| **PM-C — gate at listing creation** | ⚠ **Now has statutory backing.** § 21(b) says *"prior to listing"* — in the Act's own words. The PM chose that gate on product grounds; the ITA appears to require it. |
| **PM-D — the submission path** | ⚠ **Upgraded from product gap to compliance gap.** No `host_verification` row is ever created, so today FitOut collects **nothing** § 21(b) asks for, from anyone. |
| **Phone required at verification submission** *(my earlier SWE assumption)* | ⚠ **No longer an assumption — § 21(b)(3) requires a mobile or landline number AND a valid email.** FitOut's `user.phone` is optional, self-entered and unverified. This is now a requirement with a statute behind it. |
| **PM-A/PM-B — ops staff surface** | Unaffected. |
| **PM-E — host contact reveal in /ops** | ⚠ Interacts with § 21(b)'s **publication** clause — see below. |
| **The storage contract (no documents at FitOut)** | ⚠ **Genuinely open.** See counsel question 3. |

### Two new obligations nobody has costed

1. **DTI E-Commerce Bureau registration for FitOut itself.** Platforms must submit corporate/trade
   name, business address and contact details to the Bureau and **publish them prominently on the
   site**, supported by government ID or business registration; a BIR Certificate of Registration is
   reportedly part of it. **[CITED — cruzmarcelo.com and practitioner summaries, 2026-09-01 — MEDIUM]**
   This is a **company** obligation, not an engineering one, and nothing in the codebase touches it.
2. **The § 21(b) publication clause, and a surprising discharge route.** Everything in § 21(b) *except*
   the ID and the contact details must be *"published or posted on the e-marketplace … for
   transparency, **unless** the e-marketplace or digital platform established means to facilitate
   communication between online merchants and online consumers."* FitOut has **no messaging**, so
   the publication route may currently be the only one open. ⚠ **That makes host↔booker messaging — so
   far filed as a "future feature" in the ops-contact todo — a potential compliance discharge
   mechanism rather than a nicety.** Worth putting to counsel before it is scheduled on product
   grounds alone.

---

## 5. The five questions for counsel

Ordered by how much they change what gets built.

1. **Timing.** The ITA has been fully enforced since **20 June 2025**. If FitOut is covered, what is
   the exposure for the ~14 months already elapsed, and what is the fastest path to good standing?
   *(Ask this one first.)*
2. **Coverage.** Is FitOut an "e-marketplace" under § 4(e), or a "digital platform" — and does the
   distinction change any obligation, given § 21's closing paragraph binds both to ordinary diligence?
3. **The C2C carve-out.** Does it exempt an individual renting out a home gym? Is the line drawn
   per-host, per-transaction, or by volume — and does FitOut have to apply it, or may it verify
   everyone regardless?
4. **The storage contract.** Does § 21(b)(1)'s *"require … to submit … at least one (1) valid
   government identification"* permit that ID to be collected and held by a **KYC processor acting for
   FitOut** (Didit), with FitOut retaining only a pass/fail and a vendor reference — or must FitOut
   itself hold the document? **This one decides whether Phase 18's storage contract survives contact
   with the statute**, and it is the single most load-bearing engineering question in this brief.
5. **The redress mechanism.** Does § 21(f) require FitOut to ship a consumer *and merchant* reporting
   channel now — i.e. are backlog **999.4** and **999.6** obligations rather than roadmap candidates?

---

## What this brief does not know

1. **I did not read the IRR itself.** Every C2C figure — the ten-item threshold, the business-activity
   indicia — comes from practitioner summaries, not the regulation. That is exactly the weakness the
   vendor comparison flagged in its own Option-B section, and it applies here too.
2. **The § 4(e) definition renders differently across sources**, including a load-bearing `and`/`or`.
   Only the official text settles it.
3. **The DTI Bureau registration requirement is MEDIUM-confidence** and comes from law-firm client
   alerts rather than a DTI issuance I read directly.
4. **Whether FitOut is currently registered with the DTI Bureau or the BIR is unknown to me** — that is
   a company fact, not a repository fact.
5. **I am not a lawyer.** Everything above is desk research to make a legal conversation short and
   specific. None of it is a compliance opinion, and none of it should be acted on as one.

---

## Sources

- [RA 11967, Internet Transactions Act of 2023 — full text](https://lawphil.net/statutes/repacts/ra2023/ra_11967_2023.html)
- [BSP Circular No. 1170](https://www.bsp.gov.ph/Regulations/Published%20Issuances/Images/Circular_1170.pdf)
- [BSP amends customer due diligence and e-KYC regulations (Lexology)](https://www.lexology.com/library/detail.aspx?g=2885f42e-b3ca-434e-8d92-229ff17fe443)
- [AMLC — Anti-Money Laundering laws](http://www.amlc.gov.ph/laws/money-laundering/13-laws)
- [Covered persons under the AMLA](https://www.alburolaw.com/on-covered-institutions-under-anti-money-laundering-act/)
- [ITA now fully enforced — what online businesses must do (Cruz Marcelo)](https://cruzmarcelo.com/philippines-internet-transactions-act-now-fully-enforced-what-online-businesses-must-do-to-comply/)
- [Implementing rules of the ITA issued (Baker McKenzie)](https://insightplus.bakermckenzie.com/bm/investigations-compliance-ethics/philippines-implementing-rules-of-the-internet-transactions-act-issued)
- [NPC Advisory No. 2024-01 — model contractual clauses for cross-border transfers](https://privacy.gov.ph/wp-content/uploads/2024/06/Published-NPC-Advisory-No.-2024-01-Contractual-Clauses-for-Cross-Border-Transfers_30May24.pdf)
- [DTI E-Commerce Bureau — Internet Transactions Act of 2023](https://ecommerce.dti.gov.ph/internet-transactions-act-of-2023/)
