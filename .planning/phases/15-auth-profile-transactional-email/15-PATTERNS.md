# Phase 15: Auth, Profile & Transactional Email - Pattern Map

**Mapped:** 2026-08-24
**Files analyzed:** 27 (10 new · 17 modified)
**Analogs found:** 25 / 27 (2 have no analog — see § No Analog Found)

> **Read this with `15-UI-SPEC.md` (upstream truth) and `15-RESEARCH.md` (measured tree state).**
> This file answers only one question: *for each file this phase creates or edits, which shipped file
> is the closest thing to it, and what exactly should be copied from it.* Where a pattern excerpt below
> disagrees with RESEARCH.md, this file says so and shows the measurement.

⚠ **Two corrections to RESEARCH.md, both measured 2026-08-24 against `dev` HEAD:**

| RESEARCH said | Measured truth | Consequence for the planner |
|---|---|---|
| *"`renderOpsAlertDigest` … the PII assertion reads this body DIRECTLY"* (§ Pitfall 4, § Pitfall 10) | **Zero test files import `renderOpsAlertDigest`.** A repo-wide grep finds exactly two references, both in `src/lib/email.ts` (declaration at :638, call at :687). `tests/ops/alert-digest.test.ts` asserts the PII sentinel through `mockResend.sent()` (:191-201), not through the renderer. | The renderer is still the right **shape** analog (pure, exported, no `resend` in its body). But *the precedent test does not exist* — the EMAIL-02 design gate is **creating** the "assert on a pure exported renderer" pattern in this repo, not copying an existing test. Budget for that, and consider adding the direct-read assertion for the digest at the same time (a one-line import in `tests/ops/`, which the UI-SPEC's "extend" row already anticipates). |
| `CARD_SURFACES` count | `EXPECTED_SURFACES = 16` (`card-pattern-coverage.test.ts:431`), **not** 12 as that file's older prose says. `ALLOWED_RAW_CARD` is a `Record<string,string>` (:445) whose four auth rows are at :447/:449/:451/:453. | The UI-SPEC's "+5 declared adopters" moves the alias **16 → 21**, and the number lives in a named constant on its own line, not in a type alias. Different edit shape from `BaselineCountIsSixtySix`. |

---

## File Classification

### New files

| New file | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/email-shell.ts` | service / pure renderer | transform (1 input → 2 projections) | `src/lib/email.ts:617-672` (`OpsDigestRow` + `renderOpsAlertDigest`) | exact (shape); **no test precedent** |
| `src/lib/design/theme.ts` | config (pure constants) | static | `src/lib/site.ts` (whole file) | exact |
| `tests/design/email-shell.test.ts` | test (pure node, build-blocking) | transform assertions | `tests/design/token-drift.test.ts` | exact |
| `tests/design/email-tokens.test.ts` | test (pure node, build-blocking) | transform assertions | `tests/design/token-drift.test.ts:126-157` (guard-the-guard block) | exact |
| `tests/design/auth-composition.test.tsx` | test (jsdom + AST scan) | source-scan + render | `tests/design/cancel-page-shell.test.tsx` | exact |
| `tests/design/profile-pass.test.tsx` | test (jsdom + AST scan) | source-scan + render | `tests/design/cancel-page-shell.test.tsx` | exact |
| `tests/auth/email-injection.test.ts` | test (mocked transport, Docker) | request-response capture | `tests/auth/email-escaping.test.ts` + `tests/ops/alert-digest.test.ts:113-118` | exact |
| `tests/helpers/email-fixtures.ts` *(name illustrative — the 19 argument lists)* | fixture / utility module | static data | `tests/helpers/mocks.ts` | role-match |
| `scripts/send-email-previews.ts` | script (CLI harness) | batch dispatch | `scripts/ops-alerts.ts` | exact |
| `.planning/phases/15-…/15-UAT-EMAIL.md` | doc artifact (manual UAT) | human record | `.planning/phases/14-host-tooling/14-UAT-LOG.md` | exact |

### Modified files

| Modified file | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/email.ts` | service (transport + 19 senders) | request-response, fire-and-forget | itself — `sendBookingConfirmed:105-123` is the shape all 16 mechanical adopters share | exact (self-analog) |
| `src/app/(auth)/layout.tsx` | layout (route-group shell) | render-only | itself (`:30-45`) + `site-chrome.tsx:182-190` for the wordmark | exact |
| `src/app/(auth)/login/page.tsx` | page (client form) | request-response | itself (`:108-204`) + `bookings/[id]/group/page.tsx:159-186` for the raw-`<Card>` → `PanelCard` swap | exact |
| `src/app/(auth)/signup/page.tsx` | page (client form) | request-response | same as login | exact |
| `src/app/(auth)/forgot-password/page.tsx` | page (client form) | request-response | same as login | exact |
| `src/app/(auth)/reset-password/page.tsx` | page (client form) | request-response | same as login | exact |
| `src/app/(app)/profile/page.tsx` | page (RSC) | request-response (session read) | `src/app/(app)/bookings/[id]/group/page.tsx:212-222` | exact |
| `src/app/(app)/profile/loading.tsx` | loading plate | render-only | `src/app/(host)/host/earnings/loading.tsx` (tail) | exact |
| `src/app/(app)/profile/profile-form.tsx` | client component (form) | request-response (server action) | `src/components/booking/reserve-view.tsx` (the `"use client"` `PanelCard` adopter) | exact |
| `src/components/patterns/panel-card.tsx` | pattern component | render-only | itself (`:59-78`, the `titleAs` docblock) | exact (self-analog) |
| `src/components/patterns/site-chrome.tsx` | pattern component | render-only (export-only edit) | `src/lib/design/measurements.ts:376-402` (the "promoted out of its call sites" idiom) | role-match |
| `src/components/theme/theme-provider.tsx` | provider (client) | config re-export | `src/lib/site.ts` header (one owner, N readers) | role-match |
| `src/lib/design/visual-baselines.ts` | typed inventory | static data | itself — `"auth-login"` surface `:303-312`, rows `:1109-1123`, alias `:1923-1925` | exact (self-analog) |
| `src/lib/design/live-regions.ts` | typed inventory | static data | itself — `LIVE_REGION_FILES:340-367`, `LiveRegionRow:498-525`, alias `:1408-1410` | exact (self-analog) |
| `tests/design/card-pattern-coverage.test.ts` | test inventory | static data | itself — `CARD_SURFACES:205`, `EXPECTED_SURFACES:431`, `ALLOWED_RAW_CARD:445-453` | exact (self-analog) |
| `tests/design/brand-recipe.test.ts` | test inventory | static data | itself — `ADOPTION_TREES:133`, `EXPECTED_SURVIVING_ACCENT_LINES:143` | exact (self-analog) |
| `tests/design/live-regions.test.tsx` | test | source scan | itself | exact (self-analog) |
| `tests/design/site-contacts.test.ts` | test inventory | source scan | itself — `EXCLUDED_ADDRESSES:214-224`, the `EMAIL_MODULE` pin `:620` | exact (self-analog) |
| `tests/ops/alert-digest.test.ts` | test | extend | itself — the haystack idiom `:113-118` | exact (self-analog) |
| `e2e/overflow-320.spec.ts` | e2e test | extend `ROUTES` | itself — `RouteRow:185-211`, `ROUTES:221` | exact (self-analog) |

---

## Pattern Assignments

### `src/lib/email-shell.ts` (service / pure renderer, transform) — NEW

**Analog:** `src/lib/email.ts` lines 617-672 (`OpsDigestRow` + `renderOpsAlertDigest`) — the only pure,
exported, string-building renderer in the repo.

**Why this analog:** identical role (build HTML as a string, return it, no I/O), identical constraints
(escaping is per-field, no React, no DOM), and it lives in the module the new file is being carved out
of. Its docblock is also the argument for exporting the new one.

**Pure-renderer signature pattern** (`email.ts:630-641`):

```typescript
/**
 * PURE renderer, exported on purpose: the PII assertion reads this body DIRECTLY rather than only through
 * the transport, so the guarantee is pinned at the point the string is built, not merely at the point it is
 * handed to Resend. Aging rows carry a plain-text `— AGING` marker; never colour alone.
 * ...
 */
export function renderOpsAlertDigest(
  rows: OpsDigestRow[],
  opts: { truncated: boolean; limit: number },
): string {
```

→ Copy the **shape** (`export function render…(content): { html; text }`), and copy the docblock's
*reason* sentence. ⚠ Do **not** copy the claim as written — no test reads it directly today (see the
correction table). If the plan writes `tests/design/email-shell.test.ts` against the new renderer, that
sentence becomes true for the first time, and the digest's own docblock should be corrected in the same
commit or left alone deliberately.

**String-concatenation / escaping pattern** (`email.ts:642-671`):

```typescript
  const body = rows
    .map((r) => {
      const id = escapeHtml(r.id);
      const action = escapeHtml(r.action); // free-text column — WR-01.
      ...
      return (
        `<tr><td>${id}</td><td>${action}</td><td>${actor}</td>` +
        `<td>${created}</td><td>${escapeHtml(age)}</td></tr>`
      );
    })
    .join("");
  ...
  return (
    `<p><strong>FitOut ops — unresolved money alerts</strong></p>` +
    `<p>${rows.length} unresolved <code>needs_attention</code> audit row(s), newest first. ` +
    ...
  );
```

→ The house idiom is **backtick template literals joined with `+`, one logical block per line**, never a
templating library and never an array `.join("")` of the whole document. Keep it.

**`escapeHtml` — copy the function verbatim, do not re-author** (`email.ts:22-36`):

```typescript
/**
 * HTML-escape a string before it is interpolated into email markup (WR-01). ...
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

→ If the shell module needs it, **export it from one owner and import it** — the same "one owner, two
readers" rule EMAIL-02 applies to the theme name. Two copies of an escaper is exactly the drift DS-12
was created to close. The ROADMAP names this function untouchable; moving it must not weaken
`tests/auth/email-escaping.test.ts`.

**Colour read pattern** — source: `src/lib/design/tokens.generated.ts:43-68`:

```typescript
export const THEME_TOKENS: Record<"court" | "grove", Record<string, TokenValue>> = {
  court: {
    "--border": { oklch: "oklch(0.922 0 0)", hex: "#e5e5e5" },
    "--brand": { oklch: "oklch(0.58 0.208 25)", hex: "#da2d34" },
    "--brand-foreground": { oklch: "oklch(0.985 0 0)", hex: "#fafafa" },
    "--card": { oklch: "oklch(1 0 0)", hex: "#ffffff" },
    "--foreground": { oklch: "oklch(0.145 0 0)", hex: "#0a0a0a" },
    "--muted": { oklch: "oklch(0.97 0 0)", hex: "#f5f5f5" },
    "--muted-foreground": { oklch: "oklch(0.53 0 0)", hex: "#6c6c6c" },
```

→ The seven keys EMAIL-02 names are all present and all `.hex`-bearing. Read them **inside** the render
function (RESEARCH § Pattern 3), never at module scope. `tsconfig` has no `noUncheckedIndexedAccess`, so
a mistyped key compiles to `undefined` and renders the literal string — the hex-set gate is the only
thing that catches it.

**Docblock rule inherited from this file:** `email.ts`'s comments name constraints in prose and cite
decision IDs (`WR-01`, `D-92`, `D-83`). Follow that. ⚠ **Never quote a hex or a Tailwind class in a
comment inside the shell** (15-UI-SPEC's opening warning; `tests/design/site-contacts.test.ts` scans all
of `src/`). Name tokens descriptively — "the quiet-ground token", "the accent fill".

---

### `src/lib/design/theme.ts` (config, static) — NEW

**Analog:** `src/lib/site.ts` — the repo's model for a pure, isomorphic constants module with no
directive and no `server-only` guard.

**Module-header pattern** (`site.ts:1-12`):

```typescript
// The app's own facts about itself: the one sentence it uses to describe what it is, and the one
// contact address it does not have yet.
//
// The idiom is `src/lib/payments/config.ts:1-3`'s, restated because it is the whole point of the
// file: *the exported NAME is imported everywhere, never a hardcoded literal*. Two spellings of one
// fact is the drift this module exists to prevent...
//
// Pure/isomorphic: no "use client"/"use server" directive and NO `server-only` guard. Both exports
// are public strings that a Server Component footer, a metadata export and (in principle) a client
// component may all read.
```

→ Copy that header's *structure* — what the module owns, why it is pure, who reads it — for the theme
module. It is the single sentence that makes the EMAIL-02 relocation legible.

**Constants to move** — source `src/components/theme/theme-provider.tsx:32-45`, verbatim:

```typescript
/** The complete set of theme names. Anything not in here must never reach the DOM attribute. */
export const THEMES = ["court", "grove"] as const;

export type ThemeName = (typeof THEMES)[number];

/** D-06: the app always renders court. */
export const DEFAULT_THEME: ThemeName = "court";

/**
 * next-themes' OWN default storage key. Exported rather than duplicated as a literal in
 * e2e/helpers/theme.ts, because a Playwright helper seeding a key the provider does not read is a
 * silent no-op — the smoke test would pass while asserting nothing (D-08).
 */
export const THEME_STORAGE_KEY = "theme";
```

→ Move all four **with their docblocks**, and leave a `export { … } from "@/lib/design/theme"` re-export
in `theme-provider.tsx` so its 8 importers compile unchanged (RESEARCH § Pitfall 3, A3).

---

### `src/lib/email.ts` (service, request-response fire-and-forget) — MODIFIED

**Analog:** itself. `sendBookingConfirmed` (`:100-123`) is the shape **all sixteen** mechanical adopters
(rows 3-18) share, byte for byte in structure.

**The adopter shape that must survive the conversion** (`email.ts:105-123`):

```typescript
export const sendBookingConfirmed = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  reference: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const ref = escapeHtml(reference);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Your FitOut booking is confirmed — ${spaceTitle}`,
    `<p><strong>Booking confirmed</strong></p>` +
      `<p>You're booked at ${space} on ${when}. Booking reference ${ref}.</p>` +
      `<p><a href="${url}">View your booking</a></p>`,
  );
};
```

→ **What moves:** the third argument becomes `renderEmail({ heading, paragraphs, cta })`; the per-field
`escapeHtml` calls move to the choke point. **What may not move:** the signature, the parameter names,
the subject template literal (it interpolates the **raw** `spaceTitle`, not the escaped `space` — keep
that), the `to`, and the arrow-const export form. Every one of the sixteen is this diff, mechanically.

**The transport that gains one parameter** (`email.ts:38-56`) — the WR-02 guard block must be
AST-unchanged (AC#17):

```typescript
async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // WR-02 — the dev fallback logs the FULL email body, which includes the single-use
    // reset/verification link and its live token. That is acceptable locally but a credential
    // leak in production logs. Gate it strictly on a non-production environment: if RESEND_API_KEY
    // is ever missing in prod, fail loudly WITHOUT writing the token-bearing link to the logs.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "RESEND_API_KEY missing in production — email NOT sent (link withheld from logs).",
      );
      return;
    }
    // Dev/test only: log the link instead of delivering so the flow can be followed locally.
    console.log(`[email:dev] to=${to} ${subject}\n${html}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("resend error", error);
}
```

→ The only legal edits: the parameter list gains `text: string`, and the `resend.emails.send({...})`
object gains `text`. The `if (!resend)` block's statements stay byte-identical.

**The sender fallback that must stay singular** (`email.ts:18-20`):

```typescript
const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
const FROM = process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>";
```

→ D-160's falsifiable claim ("exactly one occurrence in `src/`") is already enforced by
`site-contacts.test.ts:620`, which pins the key `"src/lib/email.ts — onboarding@resend.dev"` **by file
and literal, not by line**. Reshaping the module is therefore safe as long as the address stays in this
file and stays singular.

**The one import with an asserted-unmoved status** (`email.ts:14-16`):

```typescript
// D-92 — a COPY CONSTANT, not a trigger. See `sendRefundIssued`'s header for why importing it here is
// inside this phase's boundary and what it is asserted not to have moved.
import { ALL_RAILS_REFUND_WINDOW } from "@/lib/booking/refund-window";
```

→ `sendRefundIssued` (`:357-375`) interpolates it **unescaped, deliberately** (`:353-356` explains why).
Under the shell it becomes part of a `paragraphs` entry — and since the renderer escapes paragraphs,
verify the constant contains no HTML-significant character before assuming the rendering is identical.

**Rows 1-2 — the two outliers** (`email.ts:58-66`):

```typescript
export const sendVerificationEmail = (to: string, url: string) => {
  const safe = escapeHtml(url); // WR-01 — never interpolate the raw url into HTML.
  return send(to, "Verify your FitOut email", `Verify: <a href="${safe}">${safe}</a>`);
};
```

→ These are the phase's only email copy change (15-UI-SPEC § The 19 adopters, rows 1-2). The **href is
byte-identical**; only the visible label changes. ⚠ The raw URL must still appear in the plain-text
part, and — per RESEARCH § Pitfall 1 — **no absolute `http(s)` URL may appear anywhere in the HTML
before this href**, or `tests/helpers/mocks.ts`'s `extractLink` returns the wrong one and three auth
tests fail with a bogus "invalid token".

**`renderOpsAlertDigest`'s two contracts** (`email.ts:598-628`) — preserve verbatim: the `OpsDigestRow`
type has **no `meta` field** and must not gain one; the per-field `escapeHtml` calls stay (its output
enters the shell through the **pre-escaped** `tableHtml` slot, which the renderer does not escape).

---

### `src/app/(auth)/layout.tsx` (layout, render-only) — MODIFIED

**Analog:** itself (`:30-45`) for the box, `src/components/patterns/site-chrome.tsx:182-190` for the
wordmark.

**Current composition** (`(auth)/layout.tsx:30-45`) — the diff is small and surgical:

```tsx
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <div className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      {/* SHELL-02. ... */}
      <SiteFooter />
    </div>
  );
}
```

→ Per 15-UI-SPEC § The layout: `<PublicHeader />` is deleted, the centering `<div>` becomes `<main>`,
the column gains `space-y-6` and the wordmark link. Everything else — `bg-muted`, `px-4 py-12`,
`max-w-sm`, `SiteFooter` — is kept byte-identical.

**Wordmark pattern to copy** (`site-chrome.tsx:180-190`):

```tsx
{/* What genuinely must not drift is the TYPE, and that is shared: both branches read
    `BRAND_CLASS`, so the wordmark cannot be styled differently depending on whether it links. */}
{brandHref === null ? (
  <span data-testid="site-brand" className={BRAND_CLASS}>
    {brand}
  </span>
) : (
  <Link data-testid="site-brand" href={brandHref} className={BRAND_CLASS}>
    {brand}
  </Link>
)}
```

→ The auth wordmark is the `Link` branch. ⚠ **Do not copy `data-testid="site-brand"`** onto the auth
layout — that id belongs to the chrome and 15-UI-SPEC pins `SELECTOR_IDS` at **+0**.

**The layout's own header carries the removal's precedent** (`(auth)/layout.tsx:16-25`) — plan 11-10
already removed a centred wordmark from this exact file and wrote *"Phase 15 may decide otherwise with
the whole surface in front of it."* Cite that block when re-adding it; do not delete the note.

**The security caveat that must survive** (`(auth)/layout.tsx:5-7`):

```
// NOTE: this layout is purely presentational. The real auth gate is per-page
// `auth.api.getSession()` and the optimistic redirect in src/middleware.ts — NOT
// this layout (RESEARCH Anti-Patterns: middleware/layout are not the security boundary).
```

→ Keep verbatim. It is GATE-NOREG #4's written half.

---

### `src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx` (page, request-response) — MODIFIED

**Analog:** `src/app/(app)/bookings/[id]/group/page.tsx:159-186` for the raw-container → `PanelCard`
swap; `src/components/patterns/panel-card.tsx:48-103` for the props.

**What is being replaced** (`login/page.tsx:108-114`):

```tsx
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to your FitOut account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
```

**What it becomes** — `PanelCard`'s public props (`panel-card.tsx:48-103`):

```typescript
export type PanelCardProps = {
  title?: string;
  titleAs?: "h2" | "h3";     // ← widens to "h1" | "h2" | "h3" this phase
  description?: string;
  footer?: ReactNode;
  sticky?: boolean;
  tone?: "default" | "muted";
  children?: ReactNode;
};
```

Rendering (`panel-card.tsx:192-200`) — note it **already carries `space-y-4` and its own padding**:

```tsx
<CardContent className="space-y-4 p-4 sm:p-6">
  {title || description ? (
    <div className="space-y-1">
      {title ? <Title className="text-heading">{title}</Title> : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  ) : null}
  {children}
</CardContent>
```

→ **Do not add padding or `space-y-4` at the call site.** `cancel-page-shell.test.tsx:222-227`'s failure
message states the rule: *"add no padding at the call site: PanelCard's own CardContent already carries
it, and this tree's Card puts block padding on Card itself, so a child that asks again pays it twice."*

**The `titleAs` union widening** — copy the argument already written at `panel-card.tsx:60-77`:

```typescript
  /**
   * WHICH HEADING ELEMENT the title renders as. Always a heading; never a `<p>`.
   *
   * ⚠ THIS PROP IS `EmptyState`'s, ADOPTED RATHER THAN INVENTED (WR-03) ...
   * THE LEVEL IS THE SURFACE'S DECISION, for `EmptyState`'s reason word for word: a panel that is the
   * only content under the page `<h1>` wants `h2`, and one inside an already-headed section wants
   * `h3`. Nothing here can know which it is, so nothing here decides — the default stays `h2` so
   * every shipped call site keeps the element it already rendered.
   */
```

→ Extend the union to `"h1" | "h2" | "h3"`, keep the default `"h2"`, and append the Phase-15 sentence to
that same docblock (the auth card **is** the document, so its title is the `<h1>`).

**Copy that must not move** — `login/page.tsx:130` renders `placeholder="you@example.com"`, and
`tests/design/site-contacts.test.ts:220-224` declares three such rows by `file — literal`:

```typescript
  "src/app/(auth)/forgot-password/page.tsx — you@example.com":
    "…the `placeholder` on the email INPUT.",
  "src/app/(auth)/login/page.tsx — you@example.com": "Same email-input placeholder, login form.",
  "src/app/(auth)/signup/page.tsx — you@example.com": "Same email-input placeholder, signup form.",
```

→ Keep all three byte-identical. A stale declaration is asserted red at `:611`.

**Live-region demotion** — `login/page.tsx:50-61`:

```tsx
function ResetNotice() {
  const params = useSearchParams();
  if (params.get("reset") !== "1") return null;
  return (
    <p
      role="status"
      className="rounded-md bg-muted px-3 py-2 text-sm text-foreground"
    >
      Password updated — please sign in.
    </p>
  );
}
```

→ Drop `role="status"` only. Class list and sentence stay byte-identical (the D-14/D-15 comment above it
at `:44-49` explains the neutral tint and must be preserved).

**Submit button** (`login/page.tsx:172-178`) gains `variant="brand" size="touch"`; the in-flight label
pattern (`{isSubmitting ? "Logging in…" : "Log in"}`) is unchanged. The `text-xs` on the
"Forgot password?" link (`:148`) moves to `text-sm`; the `"or"` divider's `text-xs` (`:182`) stays.

---

### `src/app/(app)/profile/page.tsx` (page RSC, request-response) — MODIFIED

**Analog:** `src/app/(app)/bookings/[id]/group/page.tsx:212-222` — the same
`BOOKING_SHELL` + `PageHeader`-with-lede composition.

```tsx
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
...
  return (
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <div className="space-y-2">
          {/* The lede is composed as one string because `PageHeader` measures it at `max-w-prose` and owns
              its type role; the two interpolations are the same values the paragraph interpolated before. */}
          <PageHeader
            title="Your group"
            lede={`Invite people, and see who's coming to ${title} on ${whenLabel}.`}
          />
```

**What it replaces** (`profile/page.tsx:36-44`):

```tsx
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        {memberSince && (
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {memberSince}
          </p>
        )}
      </header>
```

→ `BOOKING_SHELL` (`measurements.ts:402` = `"mx-auto w-full max-w-2xl px-4 py-8 sm:py-12"`) replaces the
literal; `PageHeader title="Your profile"` with `lede={memberSince ? \`Member since ${memberSince}\` :
undefined}` replaces the `<header>`. The conditional stays a conditional — an absent `createdAt` renders
no lede, which is `PageHeader`'s own `lede?` contract (`page-header.tsx:27`).

**The constant's docblock is the argument to cite** (`measurements.ts:385-395`):

```
 * WHY A CONSTANT WHEN THE OLD ARRANGEMENT ALREADY "WORKED". ... That is an INSTRUCTION,
 * and an instruction is not a mechanism ... A constant makes
 * "every booking surface is the same box" true by construction rather than by diligence
```

⚠ **`BOOKING_SHELL` is a container, not a landmark** (`measurements.ts:397-400`): `(app)/layout.tsx`
owns the one `<main>` per document (D-88.1). Do not wrap it in a `<main>`.

---

### `src/app/(app)/profile/loading.tsx` (loading plate, render-only) — MODIFIED

**Analog:** `src/app/(host)/host/earnings/loading.tsx` (tail) — the exact
shell-constant + `PageHeader` + skeleton shape, with the header comment that names the property.

```tsx
import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function HostEarningsLoading() {
  return (
    // The container is the DECLARED host-list shell, and the `mt-8` data-region offset is
    // `(host)/host/earnings/page.tsx`'s own. Until now this plate agreed with its page about the
    // container only because the same string was typed in both files; the two read one constant now,
    // so the fallback cannot draw a different box than the page it stands in for.
    <div className={HOST_LIST_SHELL}>
      <PageHeader title="Earnings" />

      <div className="mt-8">
        <RowListSkeleton label="Loading your earnings" />
      </div>
    </div>
  );
}
```

→ Substitute `BOOKING_SHELL`, `title="Your profile"`, **no lede** (data-derived, honestly absent), and
**two** `PanelSkeleton`s. Copy the comment's *shape* — "the two read one constant now, so the fallback
cannot draw a different box than the page it stands in for."

**The existing plate's argument to preserve** (`profile/loading.tsx:1-11`) — the "no skeleton for the
`Member since` line" reasoning survives the pass; only the heading and the panel count change:

```
// THE HEADING IS RENDERED — "Your profile" is fixed — through the page's own classes rather than
// `PageHeader`, because it is `text-2xl` here and the pattern's contract is `text-xl`. The muted
// "Member since {date}" line under it is data-derived AND conditional ... so it is not faked
```

→ The first clause becomes false this phase (the page adopts `PageHeader`); rewrite it, keep the second.
`tests/design/loading-coverage.test.ts` must pass with **zero edits** (29/21/8 — no route is added).

---

### `src/app/(app)/profile/profile-form.tsx` (client component, request-response) — MODIFIED

**Analog:** `src/components/booking/reserve-view.tsx` — the repo's one `"use client"` `PanelCard`
adopter (`"use client"` at :1, `import { PanelCard }` at :23), which is what `profile-form.tsx` becomes.

**What is being replaced** (`profile-form.tsx:85-95`):

```tsx
    <div className="space-y-10">
      {/* ---- Public profile ---- */}
      <section aria-labelledby="public-heading" className="space-y-5">
        <div>
          <h2 id="public-heading" className="text-lg font-medium">
            Public profile
          </h2>
          <p className="text-sm text-muted-foreground">
            What other people on FitOut can see.
          </p>
        </div>
```

→ Becomes `<PanelCard title="Public profile" titleAs="h2" description="What other people on FitOut can
see.">`. The identical swap applies to the private section (`:196-201`). The `aria-labelledby`/`id` pair
is retired with the `<section>` — `PanelCard` renders the heading itself.

**Untouchable inside this file** — the save-state machine and the three live regions. The two that gain
declared rows keep their markup, one gains a name:

```tsx
{/* :249 */}  <p role="alert" className="text-sm text-destructive">
{/* :260 */}  <p role="status" className="text-sm text-muted-foreground">   ← gains aria-label="Save state"
{/* :127 */}  <p role="alert" className="text-xs text-destructive">          ← avatar upload refusal
```

**The avatar block** (`profile-form.tsx:97-131`) — composition unchanged, restyled in place. The hidden
file input + `aria-label="Upload avatar"` + `Upload photo` outline button + `JPG or PNG, up to 5 MB.
Optional.` hint are all byte-identical. ⚠ **Add no second control** — removal is Phase 16 CROP-03.

---

### `src/lib/design/visual-baselines.ts` (typed inventory, static) — MODIFIED

**Analog:** itself. This is an **edit-two-rows-plus-add-eight** operation, not add-only (RESEARCH
§ Pitfall 5).

**The surface row that must be EDITED, not added** (`visual-baselines.ts:303-312`):

```typescript
  "auth-login": {
    kind: "document",
    url: "/login",
    hook: '[data-testid="site-header"]',
    hookWhy:
      "`(auth)/layout.tsx` renders `PublicHeader` + `SiteFooter`; the header is the composition this " +
      "baseline exists to pin. It also fails loudly if the anonymous session read ever starts " +
      "reaching the database, which would take this surface out of the DB-free scope silently.",
    blocked: null,
  },
```

→ `hook` becomes `'[data-testid="panel-card"]'`; **both sentences of `hookWhy` become false** and must be
rewritten. The second names a real property (the DB-free scope check) — the new hook must either
preserve that claim or the row must stop making it.

**The baseline rows that must be EDITED** (`visual-baselines.ts:1109-1123`):

```typescript
  // ─── (auth) login — 2 ───────────────────────────────────────────────────────────────────────────
  {
    surface: "auth-login",
    width: 320,
    height: 720,
    theme: "court",
    why: "the `(auth)` shell at the floor: `PublicHeader` + the form card + `SiteFooter`.",
  },
  {
    surface: "auth-login",
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop: the header's auth slot resolved to the anonymous cluster, which is the state every visitor first sees.",
  },
```

→ Both `why` strings name the header and become false. Rewrite; the row *count* for `auth-login` stays 2.

**The four new surface ids** — append to `SURFACE_IDS` (`:151-216`) with a phase-banner comment, matching
the existing block style:

```typescript
  // ─── 14-16 — the five host surfaces, in 14-UI-SPEC § Visual Baselines' table order ───────────────
  //
  // ⚠ ALL NINE ARE BLOCKED, AND NOT ONE OF THEM WAS GENERATED. `playwright.config.ts:39` constructs
  // the `visual` project ONLY on Linux, so on the machine this phase ran on the command does not
  // exist ... the honest summary of this addition is *an inventory somebody can work from*, not
  // coverage.
```

→ Copy that honesty convention verbatim in spirit for the Phase-15 block. Phase 15 adds
`auth-signup`, `auth-forgot`, `auth-reset`, `profile` (4, not 5 — `auth-login` already exists).

**The count alias to move** (`visual-baselines.ts:1923-1925`):

```typescript
export type BaselineCountIsSixtySix = Assert<
  (typeof VISUAL_BASELINES)["length"] extends 66 ? true : false
>;
```

→ Rename to `BaselineCountIsSeventyFour` and move `66 → 74` (66 + 4 surfaces × 2 widths). The alias's
docblock (`:1911-1921`) already records the "OBSERVED RED, FORCED" procedure — follow it and append this
phase's verbatim `tsc` output. The gate's stated weakness is that the error names only the alias's line:

```
 *   src/lib/design/visual-baselines.ts(1917,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
```

**⚠ `auth-login` is one of only four `THEME_SWAP_SURFACES`** (`:2025-2038`, pinned by count at
`:1964-1966` **and by members** in `e2e/visual/theme-swap.spec.ts`). The plan must state deliberately
that it **stays** in the four (RESEARCH § Open Question 1) — removing it would need a
`THEME_SWAP_EXCLUSIONS` row, and `ThemeSwapExclusionCountIsOne` (`:1928-1930`) pins that list at 1.

---

### `src/lib/design/live-regions.ts` (typed inventory, static) — MODIFIED

**Analog:** itself.

**The file union to extend 21 → 26** (`live-regions.ts:340-367`) — note the grouping-comment convention
and the forward-slash rule (`:334-338`):

```typescript
export const LIVE_REGION_FILES = [
  // ─── availability ───────────────────────────────────────────────────────────────────────────────
  "src/components/availability/availability-calendar.tsx",
  ...
  // ─── the host tooling (plan 14-14's discharge — see THE RENAME in the header) ────────────────────
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
  ...
] as const;
```

→ Add a `// ─── the auth surfaces + profile (plan 15-NN) ───` block with the five files. Route groups and
dynamic segments are ordinary characters here (`:337-338` says so explicitly).

**The row shape every new entry must fill** (`live-regions.ts:497-525`):

```typescript
export type LiveRegionRow = {
  readonly file: LiveRegionFile;
  readonly kind: LiveRegionKind;      // "status" | "alert" | "timer" | "loading" | "threshold"
  readonly at: number;                // 1-based ordinal among SAME-KIND regions in the SAME file
  readonly announces: string;         // WHAT a screen reader hears, and WHEN — a sentence, not a noun
  readonly why: string;               // WHICH of the seven rules, and why this shape
};
```

**A filled row to copy the register from** (`live-regions.ts:598-613`):

```typescript
  "calendar-day-loading": {
    file: "src/components/availability/availability-calendar.tsx",
    kind: "loading",
    at: 1,
    announces:
      '"Loading times for Friday, Aug 21" — once, at the moment the day panel swaps to its skeleton ' +
      "after a day is picked. It says nothing again; the arriving slots are not a live update, they " +
      "replace the region entirely.",
    why:
      "RULE 4 + RULE 5, and it is the correction this plan exists for. ...",
  },
```

→ `announces` quotes the literal text and names the moment; `why` cites numbered rules. A row whose `why`
is "so it announces" is rejected by the type's own docblock (`:517-524`).

**The count alias** (`live-regions.ts:1408-1410`):

```typescript
export type DeclaredFileCountIsTwentyOne = Assert<
  (typeof LIVE_REGION_FILES)["length"] extends 21 ? true : false
>;
```

→ Rename to `…IsTwentySix`, move to 26, and re-measure the header's stated count in the same commit
(the plan-14-14 procedure the alias's docblock at `:1401-1406` records). `LIVE_REGION_EXCLUSIONS`
(`:459`) stays `[]`.

---

### `tests/design/{email-shell,email-tokens}.test.ts` (test, pure node) — NEW

**Analog:** `tests/design/token-drift.test.ts` — the DB-free, `setupFiles`-free design test that reads
the generated token module.

**Imports pattern** (`token-drift.test.ts:52-57`):

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import { readThemeTokens } from "./helpers/compile-css";
```

→ Plain node + vitest. **No `@testing-library`, no `resend`, no `tests/setup.ts` helpers** — the design
config loads no `setupFiles`, so `mockResend` does not exist there (RESEARCH § Pitfall 4).

**Guard-the-guard block — copy this discipline** (`token-drift.test.ts:126-141`):

```typescript
describe("guard-the-guard: an empty render cannot match an empty file", () => {
  it("renders a module with real content", () => {
    expect(rendered.length).toBeGreaterThan(500);
    expect(rendered).toContain("export const THEME_TOKENS");
  });

  it("renders at least 20 token keys for every theme", () => {
    ...
      expect(keys.length, `theme "${theme}" rendered ${keys.length} token keys`).toBeGreaterThanOrEqual(20);
  });
```

→ The EMAIL-01 structural gate is mostly **absences** ("zero flex, zero grid, zero `<img>`, zero
`class=`, zero `<style>`"), and an empty render satisfies every one of them. Assert a length floor and a
positive marker **first**, exactly as above.

**Header convention** (`token-drift.test.ts:28-40`): every design test states what it does NOT cover and
what to do when it goes red, in the failure message itself. Copy that.

**Test-name convention:** `describe("D-18 — the committed token module is the generator's output, byte
for byte", …)` — decision ID, then the property in plain English.

---

### `tests/design/{auth-composition,profile-pass}.test.tsx` (test, jsdom + AST) — NEW

**Analog:** `tests/design/cancel-page-shell.test.tsx` — the same job on the same kind of surface: prove a
page composes the pattern layer (AST), prove the pattern renders the hook (DOM), prove the hook is
declared (union).

**The four-link chain, stated in the analog's own header** (`cancel-page-shell.test.tsx:42-47`):

```
// A source scan alone proves only the first link — that the page composes
// a pattern. It cannot see what that pattern renders. So case (4) RENDERS the patterns and reads the
// attribute off the DOM, and case (5) pins both ids against `SELECTOR_IDS`, the closed contract that
// declares them. Page → pattern (AST) → attribute (DOM) → contract (union).
```

**Environment + imports** (`cancel-page-shell.test.tsx:1, 61-69`):

```typescript
// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { render, screen } from "@testing-library/react";

import { PanelCard } from "@/components/patterns/panel-card";
import { SELECTOR_ATTRIBUTE, SELECTOR_IDS } from "@/lib/design/selector-contract";
```

**The AST scanner signature — `(path, text)`, never `(path)`** (`:94-102`):

```typescript
/**
 * `(path, text)` rather than `(path)` on purpose (`leak.test.ts:208-212`'s rule ...): case (6) feeds
 * this the fixture below, which is never written to disk, so the code path the real assertions run is
 * the same one the fixture proves.
 *
 * Aliased imports are resolved through `propertyName ?? name`, so `import { Card as Box }` is still a
 * raw container and renaming the import cannot launder it.
 */
function scanSurface(path: string, text: string): Scan {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
```

**Guard-the-guard, asserted FIRST** (`:207-217`):

```typescript
  it("(1) parsed the real surface rather than an empty one", () => {
    expect(
      surfaceText.length,
      `${SURFACE} read as empty. Two assertions below are absences and an empty file passes both.`,
    ).toBeGreaterThan(2000);
    expect(
      scan.jsxElements,
      "the scan resolved 0 JSX elements on a page that renders dozens. An absence asserted over a " +
        "tree the walker never entered is not an assertion.",
    ).toBeGreaterThan(20);
  });
```

**The positive-control fixture** (`:180-195`) — a violating module string, never written to disk, proving
the scan catches every class of defect it claims to:

```typescript
const VIOLATING_FIXTURE = [
  'import { Card as Box, CardContent } from "@/components/ui/card";',
  'import { PanelCard } from "@/components/patterns/panel-card";',
  ...
].join("\n");
```

**The disarmed-tripwire idiom** (`:153-157`) — required when a test's own source contains the token it
scans for:

```typescript
      // The politeness attribute, spelled through a join so this file's own source cannot be read as
      // a violation by a future whole-tree text scan for it — the same disarmed-tripwire discipline
      // 13-03 Deviation 3 recorded.
      const POLITENESS_ATTR = ["aria", "live"].join("-");
```

**Why AST and not grep** (`:30-36`): *"The page's own header EXPLAINS the adoption ... so a text scan
would report the comment describing the fix as the defect."* The auth pages and `profile-form.tsx` will
carry exactly such comments. Use the AST.

---

### `tests/auth/email-injection.test.ts` (test, mocked transport) — NEW

**Analog:** `tests/auth/email-escaping.test.ts` (whole file) + `tests/ops/alert-digest.test.ts:113-118`.

**Capture pattern** (`email-escaping.test.ts:8-25`):

```typescript
import { describe, it, expect } from "vitest";
import { sendResetPassword, sendVerificationEmail } from "@/lib/email";
import { mockResend } from "../helpers/mocks";

describe("email HTML escaping (WR-01)", () => {
  it("escapes a quote/markup-bearing url in the reset email so it cannot break the href", async () => {
    const evil = 'https://fitout.app/reset?token=abc"><script>alert(1)</script>';
    await sendResetPassword("victim@example.com", evil);

    const html = mockResend.last()?.html ?? "";
    expect(html).not.toContain('"><script>');
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;script&gt;");
  });
```

→ This file must pass with **zero edits** (WR-01, named by the ROADMAP). The new probe is the same shape
widened to all 19 senders.

**The whole-body haystack idiom to copy** (`tests/ops/alert-digest.test.ts:113-118`) — the one place the
repo already concatenates all three fields, which is exactly what AC#16 needs:

```typescript
  return mockResend
    .sent()
    .map((e) => `${e.subject} ${e.html ?? ""} ${e.text ?? ""}`)
```

→ ⚠ The AC#16 probe must inspect **the whole HTML document, preheader div included** (RESEARCH
§ Pitfall 2 — the derived preheader is a fifth, unnamed escape site).

**The mock already stores `text`** (`tests/helpers/mocks.ts:22-27`) — no helper edit needed for the
html/text parity assertion.

**⚠ `tests/helpers/mocks.ts:37` `extractLink`** returns the **first** `https?://` match in
`html + " " + text`. Three shipped auth tests feed it to `new URL(...)`. Do not emit an absolute URL
before the CTA href (§ Pitfall 1); prefer the construction rule over hardening the helper.

**Mutation-verification header convention** — copy from `tests/ops/alert-digest.test.ts:25-60`: each
mutation applied to `src/`, the RED recorded **verbatim**, the mutation reverted, `git diff --exit-code
src/` clean. This is the house anti-vacuity standard and the phase's new gates should carry it.

---

### `scripts/send-email-previews.ts` (script / CLI harness, batch) — NEW

**Analog:** `scripts/ops-alerts.ts` — a `tsx`-run operator CLI that imports `@/`-aliased app modules.

**The alias-import permission, already probed and written down** (`ops-alerts.ts:13-18`):

```
// IT MAY, HOWEVER, IMPORT `@/lib/ops/alerts`, AND THAT WAS PROBED FIRST-HAND (2026-08-10): `npx tsx` on a
// file importing `@/lib/db/schema` resolved the alias cleanly, with and without `--tsconfig`. tsx 4.22.4
// auto-discovers tsconfig.json (`paths: { "@/*": ["./src/*"] }`) from cwd, which is the repo root under
// `npm run`. seed.ts:5's "NO `@/` imports" comment describes ITS OWN standalone design choice, not a tsx
// limitation. Do not "fix" these imports back to relative paths.
```

→ The preview harness may `import { sendBookingConfirmed, … } from "@/lib/email"` directly. **No DB
client is needed** — unlike `ops-alerts.ts`, this script touches no database, so skip its standalone
`postgres` connection block entirely.

**`package.json` wiring convention** (`package.json:14-20`):

```json
    "db:seed": "tsx scripts/seed.ts",
    "ops:alerts": "tsx scripts/ops-alerts.ts list",
    "ops:alerts:resolve": "tsx scripts/ops-alerts.ts resolve",
```

→ Add one `"email:previews": "tsx scripts/send-email-previews.ts"` line in the same alphabetical block.

**⚠ The D-83 boundary the script must respect:** `email.ts:87-93` forbids reinstating `void sendXxx(...)`
as a dispatcher. A script outside `src/app` is a **harness**, not a call site — 15-UI-SPEC sanctions this
shape explicitly. Say so in the script's own header, citing D-83, the way `ops-alerts.ts` does.

**⚠ `RESEND_API_KEY` is already live in `.env.local`** (RESEARCH § Pitfall 7) — this script **sends real
mail** on first run, to the account-owner inbox only (D-160).

---

### `.planning/phases/15-…/15-UAT-EMAIL.md` (doc artifact) — NEW

**Analog:** `.planning/phases/14-host-tooling/14-UAT-LOG.md`.

**The discharge rule — copy the framing verbatim** (`14-UAT-LOG.md:3-5`):

```
> Live operator walkthroughs. **Only what a human actually observed is recorded here.**
> A walk is discharged when the operator states the outcome, never when the automated half is green —
> the automated half is precisely the part that could not answer these questions.
```

**Header block shape** (`14-UAT-LOG.md:7-16`): Operator · Environment · Evidence-prepared line ·
**screenshots live outside the repo**, in the session scratchpad, with the absolute path quoted — *"they
are evidence, not artifacts."*

**Verdict table shape** (`14-UAT-LOG.md:33-38`): one row per walk, columns *Walk | Requirement | PM
verdict | What changes*.

→ For EMAIL-03: one row per send × client (Gmail web / Gmail Android / Apple Mail), columns *renders
correctly / preheader shows / CTA tappable / plain-text part present*, plus a **fourth column reading
`BLOCKED — client access (D-163)`** for Outlook desktop. Follow the Phase-14 nine-baselines convention:
an honest gap, never dressed as coverage.

---

## Shared Patterns

### 1. Escaping at one choke point
**Source:** `src/lib/email.ts:22-36` (`escapeHtml`)
**Apply to:** `src/lib/email-shell.ts`, every one of the 19 senders, `renderOpsAlertDigest`

One owner, imported — never a second escaper, never a regex, never a "this string is safe" convention.
`tests/auth/email-escaping.test.ts` must pass with **zero edits**. The `tableHtml` slot is the single
pre-escaped exception and its producer keeps its own per-field calls.

### 2. Colour enters only through the generated module
**Source:** `src/lib/design/tokens.generated.ts:43-68`
**Apply to:** `src/lib/email-shell.ts`, `tests/design/email-tokens.test.ts`

```typescript
// tokens.generated.ts:14-18 — the asymmetry that makes this legal
// THIS FILE SITS OUTSIDE THE DESIGN GATE'S SCANNED TREE ON PURPOSE. src/app/** and
// src/components/** are scanned for raw colour values; src/lib/design/** is not. That asymmetry
// is the whole design: the hex literals below are legal precisely because they are generated,
// checked against the stylesheet on every test run, and unreachable by hand-editing without a
// red test.
```

⚠ `#ffffff` for the preheader's hiding recipe is **`--card`**, read from `THEME_TOKENS` — a hand-typed
literal produces an eighth value and fails AC#18.

### 3. One owner, N readers (the anti-drift constant)
**Source:** `src/lib/site.ts:1-12` (header) · `src/lib/design/measurements.ts:376-402` (`BOOKING_SHELL`)
**Apply to:** `src/lib/design/theme.ts` (`DEFAULT_THEME`), `BRAND_CLASS`, `BOOKING_SHELL` on `/profile`,
`SITE_TAGLINE` + `SUPPORT_EMAIL` in the email footer

*"the exported NAME is imported everywhere, never a hardcoded literal"* (`site.ts:6-7`). The promotion
mechanism is: move the declaration to the pure owner, **re-export from the old home** so existing
importers compile unchanged, then convert new readers.

### 4. The guarded slot with no else-branch
**Source:** `src/lib/site.ts:29-32` + `:45-56`
**Apply to:** the email footer's support line (D-161)

```
// SO THE FOOTER RENDERS NO SUPPORT ENTRY AT ALL while this is `null`. Not a greyed link, not a
// `disabled` control, not a tooltip, not "coming soon", not a link to a placeholder address. Nothing
// about support appears in the DOM. `src/components/patterns/site-footer.tsx` implements that with a
// single guard and NO else-branch, and says so in its own header.
```

→ `SUPPORT_EMAIL !== null` guard, no else. `tests/design/site-contacts.test.ts` is **extended** (a row in
its null-branch guarded-site inventory with a >40-char reason, per `:607-608`), never weakened.

### 5. A pinned count moves as work, not as a chore
**Source:** `visual-baselines.ts:1911-1925` · `live-regions.ts:1401-1410` ·
`card-pattern-coverage.test.ts:431` · `brand-recipe.test.ts:143`
**Apply to:** all six inventory moves this phase makes

The procedure, stated in those docblocks: **observe the red first** (forced if necessary), record the
`tsc`/vitest output **verbatim** in the alias's own docblock, then move the number **in the same commit**
as the rows that justify it. Never move a number ahead of its rows.

| Inventory | Constant | Old → New | Where |
|---|---|---|---|
| Visual baselines | `BaselineCountIsSixtySix` | 66 → **74** (rename alias) | `visual-baselines.ts:1923` |
| Surface ids | *(no alias)* | 37 → **41** (+4; `auth-login` already present) | `visual-baselines.ts:151-216` |
| Theme-swap surfaces | `ThemeContractSurfaceCountIsFour` | **unchanged at 4** — state deliberately | `visual-baselines.ts:1964` |
| Live-region files | `DeclaredFileCountIsTwentyOne` | 21 → **26** (rename alias) | `live-regions.ts:1408` |
| Card surfaces | `EXPECTED_SURFACES` | **16 → 21** (a plain const, not a type alias) | `card-pattern-coverage.test.ts:431` |
| Raw-card allow-list | `ALLOWED_RAW_CARD` | 9 → **5** (delete 4 auth rows in their conversion commits) | `card-pattern-coverage.test.ts:445-453` |
| Brand adoption total | *(scan total)* | 24 → **28**; scoped 19 and `EXPECTED_SURVIVING_ACCENT_LINES` byte-identical | `brand-recipe.test.ts:133-143` |

### 6. Guard-the-guard before any absence assertion
**Source:** `cancel-page-shell.test.tsx:202-217` · `token-drift.test.ts:126-141`
**Apply to:** every new test in this phase

Both new design tests assert mostly absences ("zero flex", "zero raw `<Card>`", "no eighth hex"). Assert a
content floor and a positive marker **first**, or an empty parse passes everything.

### 7. The positive-control fixture
**Source:** `cancel-page-shell.test.tsx:174-195` + case (6) at `:281-294`
**Apply to:** `auth-composition`, `profile-pass`, `email-shell`, `email-injection`

*"a scan whose list of things-to-catch was never shown catching one of them is a scan that reports a
clean file forever."* Feed each scanner a deliberately violating input in the same file.

### 8. Descriptive naming in comments — never a quoted class or hex
**Source:** `panel-card.tsx:184-187`
**Apply to:** every file this phase touches, **including the email shell**

```
        // The wrong offset is named DESCRIPTIVELY above rather than quoted as a class, following
        // `booking-row.tsx:112`'s precedent ("Named descriptively rather than quoted, because the
        // DS-03 gate counts that string"): the rule is now falsifiable as a source scan, and a scan
        // for the wrong offset must not be tripped by the comment explaining why it is wrong.
```

15-UI-SPEC opens with this warning and records that **three plans have been burned** by it.

### 9. Fire-and-forget triggers are untouchable
**Source:** `src/lib/email.ts:6-8` and `:87-93`
**Apply to:** every send call site — `auth.ts`, `notify.ts`, `guest-email.ts`, `ops-alert-digest.ts`

```
// Call sites in auth.ts fire-and-forget (`void send...`) to avoid a timing side-channel
// and to keep auth responses fast (RESEARCH Pitfall 4 — do NOT await these from auth.ts).
...
//    Do NOT reinstate `void sendXxx(...)` — that is the anti-pattern D-83 exists to remove.
```

SC#3's proof is `tests/booking/notify-emission.test.ts` passing with its trigger-graph assertions
**unmodified**. Zero consumer modules need an edit.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `tests/helpers/email-fixtures.ts` *(the 19 sender argument lists)* | fixture module | static data | `tests/helpers/` contains only *behavioural* helpers (`mocks.ts`, `db.ts`, `seed.ts`, `auth.ts`, `dates.ts`) — no pure argument-fixture module exists. `tests/helpers/mocks.ts` is the closest for **module shape** (exported const + typed record), but nothing in the repo declares a "one row per exported function, with call arguments" table. **Use RESEARCH § Open Question 2's recommendation:** build it once and let both the injection probe and `scripts/send-email-previews.ts` read it. `visual-baselines.ts`'s `as const satisfies Record<…>` totality idiom (`:222-227`) is the best structural precedent for making a missing sender a compile error. |
| The email shell's 600px table markup itself | markup / renderer body | transform | **No table-based email markup exists anywhere in this repo.** All 19 shipped bodies are three `<p>` tags; `renderOpsAlertDigest` has the only `<table>` (`email.ts:667-670`) and it is a data table with `border="1" cellpadding="4"`, not a layout shell. The skeleton must come from **15-UI-SPEC § The 600px skeleton** (which is prescriptive down to the pixel constants), not from a codebase analog. Copy the *construction discipline* from `renderOpsAlertDigest` (template literals joined with `+`, per-field escaping) and the *geometry* from the spec. |

---

## Metadata

**Analog search scope:** `src/lib/**`, `src/lib/design/**`, `src/components/patterns/**`,
`src/components/theme/**`, `src/app/(auth)/**`, `src/app/(app)/profile/**`,
`src/app/(app)/bookings/[id]/**`, `src/app/(host)/host/**/loading.tsx`, `tests/design/**`,
`tests/auth/**`, `tests/ops/**`, `tests/helpers/**`, `scripts/**`, `e2e/overflow-320.spec.ts`,
`.planning/phases/14-host-tooling/**`

**Files read in full:** 14 · **Files read by targeted range:** 6 · **Files probed by grep only:** 9

**Verified against:** `dev` HEAD `5c636b7`, 2026-08-24. Every line number quoted was read, not inferred.

**Pattern extraction date:** 2026-08-24
