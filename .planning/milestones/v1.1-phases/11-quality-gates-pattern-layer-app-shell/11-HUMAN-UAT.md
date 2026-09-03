---
status: partial
phase: 11-quality-gates-pattern-layer-app-shell
source: [11-VERIFICATION.md]
started: 2026-08-17
updated: 2026-08-17
---

## Current Test

[awaiting human testing]

## Tests

### 1. Supply a real, monitored FitOut support address

expected: `src/lib/site.ts`'s `SUPPORT_EMAIL` holds a real inbox someone reads. The footer's third column then renders a third entry by itself, and `tests/design/site-contacts.test.ts` switches from its null branch (currently 23 passed / 3 skipped) to the branch that demands exactly one `mailto:` interpolating the constant. Both branches are already written and were watched failing.

why it needs a human: whether a monitored inbox exists is a fact about the business, not the repository. The only address anywhere in `src/` is Resend's sandbox sender `onboarding@resend.dev`, where replies go nowhere. `11-UI-SPEC.md` § Anti-Patterns bans shipping a fabricated address, and D-26 chose `carry-both` — absent rather than faked — precisely so this stays visible instead of quietly filled.

one-line change: `src/lib/site.ts:70`.

result: [pending]

### 2. Set `NEXT_PUBLIC_APP_URL` to the deployed origin, then test a real unfurl

expected: `resolveMetadataBase()` (`src/app/layout.tsx:52`, `:95-102`) stops falling back to `http://localhost:3000`, and every `og:image` / `og:url` becomes crawler-reachable. Then paste a FitOut link into a real client (Slack, Discord, iMessage, X) and confirm the card renders.

why it needs a human: needs a domain FitOut does not own yet, plus an external crawler. Verified locally today: `/opengraph-image` returns `200 image/png` at exactly 1200×630 — the image pipeline works. What cannot be proven from here is that anything outside this machine can fetch it. SHELL-04 is recorded as built-but-blocked rather than claimed.

result: [pending]

### 3. Have a qualified person review `/terms` and `/privacy`

expected: the two pages carry reviewed legal prose, and six business facts are supplied — legal entity, registered address, governing law and forum, a monitored contact, the data-retention schedule, and the data contact/regulator.

why it needs a human: nobody who wrote these pages is qualified to give legal advice, and both page headers say so plainly. The pages currently assert **nothing** about how FitOut handles data — `/privacy` states verbatim *"Nothing on it describes how FitOut actually handles your data."* That was forced rather than chosen: writing the true facts available in the tree (PayMongo, Postgres, Better Auth, Resend) would have falsified that notice one paragraph below it. Nothing was invented.

result: [pending]

### 4. Decide DS-11's formal status

expected: a decision on whether `REQUIREMENTS.md`'s DS-11 row flips to Complete or stays Pending.

why it needs a human: this is a product call on requirement text, not a coding task. DS-11's second clause is *"every card surface uses one of the three patterns."* Ten of twelve surfaces adopt. The other two were **proven structurally unable**, not skipped:

- `src/components/listing/listing-card.tsx` — its `CardFooter` markup inside a whole-card `<Link>` triggers the HTML adoption-agency algorithm. Fed that exact markup, the parser reports `anchors parsed: 6, outer anchor child count: 0` — the card link is shattered and left empty. A `footer` prop cannot fix it: that needs `Card` outside `Link`, which kills the `group-hover:` pairing the plan had to preserve byte-for-byte.
- `src/components/notifications/notification-item.tsx` — its `href` is nullable **by security design** (`safeHref` refuses `javascript:`, `data:` and protocol-relative URLs and degrades to non-navigable content), and it is a `divide-y` popover row, not a card.

Both are enforced as declared, reasoned exclusions in `tests/design/card-pattern-coverage.test.ts` — a third surface joining them fails by name. The parallel precedent is D-26, which formally amended UI-SPEC AC#8 in four places rather than leaving the discrepancy implicit. DS-11 has had no equivalent amendment. Either amend the requirement text and the UI-SPEC's `Replaces` list to name these two exceptions, or leave DS-11 Pending on purpose.

result: [PASS — RESOLVED 2026-08-31]

**PM ruling at v1.1 milestone close: amend the text, mark DS-11 Complete.** The two refusals are
measured, argued and machine-enforced, which is what D-26 established as sufficient. Recorded in three
places rather than left implicit:

1. `.planning/REQUIREMENTS.md` — DS-11's text now reads "...with two named, measured exceptions" and
   names both files with the reason each cannot adopt; the traceability row reads Complete.
2. `11-UI-SPEC.md` — `notifications/notification-item.tsx` dropped from `RowCard`'s `Replaces` list
   with a CORRECTION note stating the nullable-`href` security design. (`listing/listing-card.tsx` was
   already dropped from `ResultCard`'s list by plan 14-13's own correction on 2026-08-23, so the
   ResultCard half needed no new edit.)
3. This file — this scenario.

`tests/design/card-pattern-coverage.test.ts` is unchanged and remains the enforcement: it already names
both exclusions, and a third surface joining them fails the build.

## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
