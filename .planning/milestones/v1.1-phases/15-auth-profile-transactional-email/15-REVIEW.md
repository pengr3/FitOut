---
phase: 15-auth-profile-transactional-email
reviewed: 2026-08-24T17:15:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - src/app/(app)/profile/loading.tsx
  - src/app/(app)/profile/page.tsx
  - src/app/(app)/profile/profile-form.tsx
  - src/app/(auth)/forgot-password/page.tsx
  - src/app/(auth)/layout.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/reset-password/page.tsx
  - src/app/(auth)/signup/page.tsx
  - src/components/patterns/panel-card.tsx
  - src/components/patterns/site-chrome.tsx
  - src/components/theme/theme-provider.tsx
  - src/lib/design/live-regions.ts
  - src/lib/design/theme.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/email-shell.ts
  - src/lib/email.ts
  - scripts/send-email-previews.ts
  - e2e/overflow-320.spec.ts
  - e2e/visual/surfaces.spec.ts
  - tests/auth/email-injection.test.ts
  - tests/design/auth-composition.test.tsx
  - tests/design/brand-recipe.test.ts
  - tests/design/card-pattern-coverage.test.ts
  - tests/design/email-shell.test.ts
  - tests/design/email-tokens.test.ts
  - tests/design/live-regions.test.tsx
  - tests/design/loading-coverage.test.ts
  - tests/design/pair-drift.test.ts
  - tests/design/profile-pass.test.tsx
  - tests/design/site-contacts.test.ts
  - tests/helpers/email-fixtures.ts
  - tests/notifications/notify.test.ts
  - tests/ops/alert-digest.test.ts
findings:
  critical: 1
  warning: 7
  info: 7
  total: 15
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-08-24T17:15:00Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

Two halves reviewed: the `renderEmail` choke point plus the nineteen converted senders, and the
`(auth)` / `/profile` design pass.

**The escaping conversion holds.** I drove the phase's own injection probe and the digest suite
(153 passed), ran the full design suite (908 passed, 3 skipped), `npx tsc --noEmit` (clean) and
`npx eslint` (0 errors, 25 pre-existing warnings, none in phase-15 files). I grepped `src/lib/email.ts`
for hand-built markup: `renderOpsAlertDigest` is the only producer left and all five of its columns
carry `escapeHtml`. The specific regression the phase warned about — a sender that started building
markup again, or a dropped per-field escape in the pre-escaped slot — is **not present**.

**What escaping does not do is scheme validation, and the shell does not do it either.** The CTA
`href` is the one sink where "escaped" and "safe" are different claims, and this repository already
knows that: `src/lib/validation/notification.ts:52-56` names `javascript:` / `data:` explicitly as
the reason the *notification* layer refuses them at the write boundary. The email shell has no
equivalent, and I measured it (WR-01). It is not live-exploitable today because two of the three
inbound paths are schema-guarded upstream and the third composes its href server-side — so it is a
WARNING, not a BLOCKER. Read the reachability paragraph before triaging it.

**Two structural gaps in the shell's own "cannot drift" claim.** `EmailContent` permits `tableHtml`
with no `tableText` — measured: the entire body vanishes from `text/plain` and nothing reports it
(WR-02). And `mailto:${SUPPORT_EMAIL}` is the one interpolation in `email-shell.ts` that skips the
choke point, in an attribute context, on a branch with zero live test coverage (WR-03; the three
skipped design cases are that branch).

**One vacuous assertion survived the phase's own sweep.** `tests/ops/alert-digest.test.ts:431`
cannot fail for the defect its comment names. Measured (WR-04).

**Three declared baseline justifications describe surfaces that do not exist** — a "confirm" field
and a "terms sentence" on signup, and a password "reveal control" that this tree has never had (WR-07).

The auth composition itself is sound: exactly one `<main>` (in the layout), `titleAs="h1"` on all four
pages, no session read in any `(auth)` ancestor, the callback-URL guard intact, no wordmark
duplication. I found nothing wrong with the heading structure or the leaked-auth-state question.

**Honesty about coverage.** I did not run Playwright (needs a live app + seeded DB; the visual half
needs Linux), so `e2e/overflow-320.spec.ts` and `e2e/visual/surfaces.spec.ts` were read, not executed.
I did not open an inbox. I did not review `src/lib/auth.ts` (out of scope) — see the note at the end
about `redirectTo`, which I could not discharge from the files I was given.

---

## Critical Issues

### CR-01: A provider rejection is reported as a successful send — no retry, no `needs_attention` row

**File:** `src/lib/email.ts:54-55`, with the guarantee it breaks stated at `src/lib/email.ts:109-115`

**Issue:**

```ts
const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
if (error) console.error("resend error", error);
```

`send` resolves identically whether Resend accepted the message or refused it. `sendForType`
(`src/inngest/functions/notify.ts:80-113`) awaits a sender and then returns `{ sent: true }`
unconditionally, and `notify.ts:292` wraps that in `step.run("send-email", ...)`. So a 4xx/5xx from
the provider — invalid recipient, suppressed address, rate limit, quota — produces:

- a resolved Inngest step, therefore **no retry**;
- `{ sent: true }`, therefore **no `needs_attention` audit row** (D-90);
- one `console.error` line and nothing else.

This is exactly the failure mode `src/lib/email.ts:109-115` says the D-83 architecture removed:
*"Inngest owns retry, backoff and per-run observability, and a permanently-failed send writes a
`needs_attention` audit row (D-90) instead of vanishing."* It vanishes. Concrete scenario: a booker
pays for a court, `payment.paid` fires, `sendBookingConfirmed` is rejected by Resend, the booker
never receives a confirmation for money they have spent, and no operator ever learns.

The phase's own preview harness records this fact as TRAP B
(`scripts/send-email-previews.ts:80-87`): *"a harness that counted resolved promises would print
'23 sent' over a completely empty inbox."* The harness works around it for itself; production has no
such workaround.

**Not introduced by this phase.** `send` predates Phase 15; what Phase 15 did was re-sign it to take
a fourth argument. It is filed Critical rather than Warning because the behaviour is live on the
money path, the file under review asserts the opposite guarantee in its own header, and this is the
commit that touched the function. If D-78 (no send-trigger movement) is read as forbidding the fix
here, then the honest action is a roadmap item, not a silent carry-forward.

**Fix:**

```ts
async function send(to: string, subject: string, html: string, text: string) {
  // ... unchanged dev-fallback block ...
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) {
    // THROW rather than log: the only caller is an Inngest step, and a rejected provider response is
    // exactly the retryable failure D-83 built that step for. onFailure then writes the D-90 row.
    console.error("resend error", error);
    throw new Error(`resend rejected the message: ${error.name ?? "error"} ${error.message ?? ""}`);
  }
}
```

`sendGuestRsvpEmail` already `await`s `send` inside a `step.run`, so it inherits the same retry.
The one caller that must NOT inherit it is any surviving fire-and-forget site — there are none in
`src/` (verified by grep for `void send`), so the change is contained.

---

## Warnings

### WR-01: The CTA href is escaped but never scheme-validated — `javascript:` and `data:` survive the "one choke point"

**File:** `src/lib/email-shell.ts:193` (and the claim at `src/lib/email-shell.ts:22-28`, `96-101`)

**Issue:** Measured, not inferred. Rendering through the real module:

```
<a href="javascript:alert(document.domain)" style="display:inline-block;padding:12px 24px;...
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" style="...
```

and the plain-text twin carries `Reset password: javascript:alert(document.domain)` verbatim.

`escapeHtml` handles attribute **breakout** correctly — the attribute is double-quoted and both `"`
and `'` are encoded, so a value cannot escape the quotes. It does nothing about the **scheme**, which
is a different class of defect and one this repository has already written down:
`src/lib/validation/notification.ts:52-56` says *"`escapeHtml` in email.ts stops attribute BREAKOUT;
it does not stop a `javascript:` or `data:` scheme, which survives escaping intact"* — and refuses
the scheme at the notification write boundary for that reason.

**Reachability today (why this is WARNING and not BLOCKER):**

| Path into `cta.href` | Upstream guard |
|---|---|
| notify-family (14 senders) | `notificationPayloadSchema`'s `href` refinement — must start `/`, `http://` or `https://`. Guarded. |
| `sendGuestRsvpEmail` | `src/inngest/functions/guest-email.ts:83` does `event.data as GuestRsvpEmail` — a **bare cast, no runtime validation**. The value is server-composed (`inviteUrl(group.accessToken)`), so not attacker-controlled today. |
| `sendVerificationEmail` / `sendResetPassword` | Better Auth composes the URL. |

So there is no live exploit I can demonstrate. What there is: a module that documents itself as the
single place safety is decided, one caller that reaches it through an unvalidated cast, and a sink
whose safety depends entirely on callers the module cannot see. The injection probe cannot catch a
regression here either — `tests/auth/email-injection.test.ts:315` **appends** to URL parameters
rather than replacing them, by design, so no scheme is ever driven through the sink.

**Fix:** validate at the choke point, where the module already claims the guarantee lives.

```ts
/** Only a same-origin path or an http(s) URL may become a link. Mirrors the refinement in
 *  src/lib/validation/notification.ts — escaping stops breakout, it does not stop a scheme. */
function safeHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  throw new Error(`email-shell: refusing a CTA href with a non-http(s) scheme: ${trimmed.slice(0, 40)}`);
}
// ...
`<a href="${escapeHtml(safeHref(content.cta.href))}" ...`
```

Then add one case to `tests/design/email-shell.test.ts` asserting `renderEmail` throws for
`javascript:alert(1)` and for a `data:` URL.

---

### WR-02: `tableHtml` without `tableText` silently empties the plain-text part

**File:** `src/lib/email-shell.ts:126-136` (type), `222` (HTML insert), `235` (text insert)

**Issue:** Measured:

```
B: html has the row? -> true
B: text has the row? -> false
B: text = "Digest\n\nintro\n\nFitOut\nBook gyms, courts and studios by the hour."
```

The docblock at `email-shell.ts:130-131` states the rule — *"A message using this slot must also pass
`tableText`, or its plain-text twin silently loses the content"* — but the type declares two
independent optionals and there is no runtime guard and no test that forbids the combination. The
module's headline claim (`email-shell.ts:15-20`, `139-141`: *"both derived from the same value, so
neither can drift"*) is false for exactly the one field where drift is invisible: a `text/plain`
reader of the ops digest would receive an intro paragraph and a footer, with the entire alert table
gone, and every existing gate would stay green.

`tests/design/email-shell.test.ts` asserts that the digest *does* carry both. Nothing asserts that
carrying one without the other is impossible.

**Fix:** make it unrepresentable.

```ts
export type EmailContent = {
  preheader?: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
} & ({ tableHtml: string; tableText: string } | { tableHtml?: never; tableText?: never });
```

If the union is too disruptive at the call sites, the cheap version is a guard in `renderEmail`:

```ts
if ((content.tableHtml === undefined) !== (content.tableText === undefined)) {
  throw new Error("email-shell: tableHtml and tableText travel together or not at all");
}
```

plus a case in `email-shell.test.ts` that expects the throw.

---

### WR-03: `mailto:${SUPPORT_EMAIL}` is the one interpolation that skips the choke point, and its branch has no live coverage

**File:** `src/lib/email-shell.ts:162-166`

**Issue:**

```ts
`<a href="` +
`mailto:${SUPPORT_EMAIL}` +          // RAW — not escaped
`" style="color:${quietInk}">${escapeHtml(SUPPORT_EMAIL)}</a>.</div>`,
```

The visible text is escaped; the **attribute** is not. `SUPPORT_EMAIL` is typed `string | null`
(`src/lib/site.ts:70`), not a literal, so nothing constrains its future value. A local part
containing `"` — legal in a quoted-string address, and trivially reachable by a typo or a paste —
breaks out of the `href` attribute and injects arbitrary attributes into an anchor in every one of
the nineteen emails at once. This is the only sink in the file that the header's own inventory
("FIVE sinks are escaped here so that no composition site can forget one", `email-shell.ts:22-28`)
does not name.

It is currently unreachable because `SUPPORT_EMAIL === null`, and that is also why nothing catches
it: I measured the design suite's three skipped cases and they are precisely this branch —

```
skipped | site-contacts.test.ts | D-26 (SUPPORT_EMAIL is set) — the footer must actually render it is a string containing `@`
skipped | site-contacts.test.ts | D-26 (SUPPORT_EMAIL is set) — the footer must actually render it renders EXACTLY ONE `mailto:` usage
skipped | site-contacts.test.ts | D-26 (SUPPORT_EMAIL is set) — the footer must actually render it interpolates the CONSTANT rather than a retyped address
```

The day D-161 flips, this branch ships to production having never rendered in a test.

**Fix:** one call, plus a test that does not depend on the constant.

```ts
`mailto:${escapeHtml(SUPPORT_EMAIL)}` +
```

and, in `tests/design/email-shell.test.ts`, exercise the slot with an injected value rather than
waiting for the constant — e.g. extract the support fragment into an exported
`renderSupportSlot(email: string | null)` and assert directly that
`renderSupportSlot('a"onmouseover="x@e.test')` contains no raw `"` inside the `href`.

---

### WR-04: `expect(html).not.toContain("<code>")` cannot fail for the defect its comment names

**File:** `tests/ops/alert-digest.test.ts:431` (comment at `425-430`)

**Issue:** Measured. Feeding `renderEmail` a paragraph containing `<code>npm run ops:alerts</code>`:

```
A: html contains literal <code>? -> false
A: html contains &lt;code&gt;?    -> true
```

Paragraphs are escaped at the choke point, so re-adding the `<code>` wrappers to
`renderOpsAlertDigest`'s runbook paragraph produces `&lt;code&gt;` — visible tag text in the
operator's inbox, which is exactly the regression the comment says this line guards
(*"never a visible `<code>` tag"*). The assertion stays **green**. The only way this line can go red
is a `<code>` arriving through `tableHtml`, which is not the failure mode it is written against.

This is the same class of defect the phase itself found and fixed in
`tests/notifications/notify.test.ts` (the `copy()` helper, added because entity-encoded apostrophes
made `expect(email.html).not.toContain("You're getting")` unfailable). One instance was missed.

**Fix:**

```ts
// The escaped form is what a re-added wrapper actually produces; the raw form is what a
// tableHtml leak would produce. Both are forbidden, and the first is the one that can regress.
expect(html, "a <code> wrapper is back in a paragraph — it reaches the operator as visible tag text")
  .not.toContain("&lt;code&gt;");
expect(html, "raw markup entered through the pre-escaped table slot").not.toContain("<code>");
expect(text).not.toContain("<code>");
```

---

### WR-05: `sendRequestDeclined` renders `href="/"` in an email when `BETTER_AUTH_URL` is unset — and the EMAIL-03 harness guarantees it is unset

**File:** `src/lib/email.ts:117-120` and `src/lib/email.ts:213`; `scripts/send-email-previews.ts:226`

**Issue:** `const APP_URL = process.env.BETTER_AUTH_URL ?? ""` and the CTA is
``cta: { label: "Find another space", href: `${APP_URL}/` }``. The comment at `email.ts:117-119`
claims the fallback means *"a missing env never yields a broken link"*. In an email that is false:
there is no document base URL, so a root-relative href resolves against nothing, or against the
webmail client's own origin (`https://mail.google.com/`).

Measured from this phase's own harness, run in preview mode:

```
<a href="/"
...
Find another space: /
```

The plain-text half of that (`Find another space: /`) is **new in this phase** — the text projection
now renders the broken link as literal, uncopyable text.

The compounding half is in the harness: `scripts/send-email-previews.ts:226` allow-lists exactly
`["RESEND_API_KEY", "EMAIL_FROM"]` out of `.env.local`, and `tsx` loads no dotenv of its own. So the
EMAIL-03 inbox walk — the artifact this whole script exists to produce — delivers message 6 and 7
of 23 with a dead CTA, and the operator grading "is the CTA tappable" is grading an artefact of the
harness, not of the product.

**Fix (two parts):**

1. Fail loudly rather than degrade silently, in `src/lib/email.ts`:

```ts
// An email has no document base, so a root-relative href is a dead link, not a graceful fallback.
const APP_URL = process.env.BETTER_AUTH_URL ?? "";
// ...
cta: APP_URL ? { label: "Find another space", href: `${APP_URL}/` } : undefined,
```
   (a message with no CTA is honest; a CTA pointing at `/` is not.)

2. Add `BETTER_AUTH_URL` to the harness's allow-list at `scripts/send-email-previews.ts:226` and
   refuse to run `--send` without it, so the walk photographs the real link.

---

### WR-06: A thrown avatar upload leaves the control permanently disabled with no error shown

**File:** `src/app/(app)/profile/profile-form.tsx:78-90`

**Issue:**

```ts
setAvatarBusy(true);
const fd = new FormData();
fd.set("avatar", file);
const result = await uploadAvatarAction(fd);
setAvatarBusy(false);          // ← never runs if the await rejects
```

`uploadAvatarAction` catches its own failures and always returns `{ ok: false, error }`
(`src/app/actions/avatar.ts:78-79`), so the `!result.ok` branch covers the *expected* failures.
What it does not cover is the Server Action RPC itself failing — a dropped connection, a 500 from
the route, a serialization error. Next re-throws those at the call site. The rejection is unhandled,
`setAvatarBusy(false)` never runs, and the button stays `disabled` reading "Uploading…" for the rest
of the page's life, with no error message anywhere. The only recovery is a reload.

`onSubmit` (`:66-76`) has the same shape but is protected by react-hook-form, which resets
`isSubmitting` in its own `finally`. This handler has no such backstop.

**Fix:**

```ts
async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setAvatarError(null);
  setAvatarBusy(true);
  try {
    const fd = new FormData();
    fd.set("avatar", file);
    const result = await uploadAvatarAction(fd);
    if (!result.ok) {
      setAvatarError(result.error);
      return;
    }
    setAvatarUrl(result.avatarUrl);
    router.refresh();
  } catch {
    // The action swallows its own failures; this is the transport dying under it.
    setAvatarError("Could not upload your photo. Please try again.");
  } finally {
    setAvatarBusy(false);
    e.target.value = "";   // see IN-06
  }
}
```

---

### WR-07: Three declared baseline justifications describe fields and controls that do not exist

**File:** `src/lib/design/visual-baselines.ts:1005`, `:1937`, `:1986`

**Issue:** The `why` / `hookWhy` strings are this file's review artifact — they are what a reader uses
to decide a row is worth its picture. Three of them are wrong about the surface they declare, checked
against the pages:

| Line | Claim | Measured reality |
|---|---|---|
| 1005 | signup carries *"name, email, password, **confirm**, the **terms sentence** and the brand-filled submit"* | `src/app/(auth)/signup/page.tsx` registers exactly `intent`, `firstName`, `email`, `password`. No confirm field. `grep -in "terms\|privacy\|confirm"` on that file returns **nothing**. |
| 1937 | signup is the tallest *"— **four fields**, the **terms sentence** and the submit"* | Three inputs plus a two-button radio group; no terms sentence. |
| 1986 | *"the password field carries a **reveal control** inside its own box, which is the one control in this group whose hit area competes with its input at 320px"* | `src/components/ui/input.tsx` is a bare `<input type={type} …>` — there is no reveal control anywhere in this tree. |

The rows themselves may well be the right rows; the recorded reason for them is not a description of
the pages. In a file whose whole mechanism is "a human reads the `why` and agrees", a `why` written
without looking at the surface is the failure mode the mechanism exists to prevent. It will also
mislead whoever mints these baselines and tries to explain a diff.

**Fix:** rewrite the three strings from the page, e.g. for `:1937`:

```
"the floor on the TALLEST of the four auth documents — a two-option intent radio group plus three "
"fields (first name, email, password) and the brand-filled submit — so it is the one where the "
"card's vertical rhythm and the label/control spacing have the least room to be wrong in."
```

and drop the reveal-control sentence at `:1986` entirely, replacing it with the real reason the
320px row is worth having (the `max-w-sm` column against `px-4` at the floor).

---

## Info

### IN-01: The preview harness matches the provider by substring, not hostname

**File:** `scripts/send-email-previews.ts:264`

`if (!url.includes(RESEND_API_HOST))` treats any URL containing the literal `api.resend.com` — for
example `https://example.com/?cb=api.resend.com` — as a provider request. In preview mode that means
such a request is *captured and swallowed* rather than blocked with the intended loud error; in live
mode it is mis-recorded as the message's own transport. No live consequence today (nothing in the
sender graph calls anything else), but the guard is weaker than its comment claims.

**Fix:** `new URL(url).hostname === RESEND_API_HOST`.

### IN-02: The harness records only the last transport call per sender

**File:** `scripts/send-email-previews.ts:242`, `279-285`

`captured` is a single slot, reset per dispatch. A sender that made two transport calls would have
only the second written to disk and reported; the first would disappear from `index.md` with no
warning. No current sender does this — but the harness's stated job is to prove what actually
reached the inbox, and a silent loss is the one thing it is built not to do.

**Fix:** accumulate into an array and write/report every element.

### IN-03: The `/profile` overflow driver has a return type it can never produce, and leaves an account per run

**File:** `e2e/overflow-320.spec.ts:227-241`

`signUpAndReachProfile` is typed `Promise<string | null>` and returns the literal `"/profile"` on the
only path that reaches its end — the `null` half of the contract (which the table uses to mean
"unreachable, skip with a reason") is dead here. It also creates a real account per theme per run
(`e2e.overflow.<ts>.<rand>@example.com`), so the e2e database accumulates orphan users indefinitely.

**Fix:** narrow the return type to `Promise<string>`, and add a cleanup or a documented note that
these rows are expected residue.

### IN-04: Subject lines interpolate host-controlled strings with no guard and no assertion

**File:** `src/lib/email.ts:141`, `165`, `189`, `215`, `241`, and every other `send(to, \`…${spaceTitle}\`, …)`

Every subject template interpolates `spaceTitle` (host-authored) raw. Subjects are not HTML, so
`escapeHtml` is correctly absent — but nothing bounds the length and nothing rejects CR/LF, and
`tests/auth/email-injection.test.ts` deliberately asserts nothing about `subject`
(it only reads `captured[0].to`). **Unverified:** I did not confirm how Resend encodes the JSON
`subject` field into a MIME header, so I cannot claim a header-injection sink exists — only that
nothing in this repository proves one does not.

**Fix:** add one case to the injection probe asserting the captured `subject` contains no `\r` or
`\n` after driving the payload through each sender's title parameter.

### IN-05: `forgot-password`'s submit has no failure path

**File:** `src/app/(auth)/forgot-password/page.tsx:62-69`

`await authClient.requestPasswordReset(...)` is unguarded. Better Auth's client returns
`{ data, error }` rather than throwing for HTTP failures, so this only bites on a transport throw —
but when it does, `setSubmitted(true)` never runs and the visitor is left staring at a re-enabled
button with no message at all. The anti-enumeration property is not affected (the failure is
symmetric across accounts), but the screen has no error state.

**Fix:** wrap in `try { … } finally { setSubmitted(true); }` — the uniform message is correct in both
outcomes, which is the whole point of T-03-02.

### IN-06: The avatar file input is never reset, so re-selecting the same file is a no-op

**File:** `src/app/(app)/profile/profile-form.tsx:78-90`, `130-138`

After a failed upload the input still holds the same `File`, so `change` does not fire when the user
picks that file again — the retry appears to do nothing. Covered by the `finally` in WR-06's fix
(`e.target.value = ""`).

### IN-07: `loadFromEnvLocal` overrides an env var deliberately set to the empty string

**File:** `scripts/send-email-previews.ts:217`

`if (!keys.includes(key) || process.env[key]) continue;` uses truthiness, so an exported
`RESEND_API_KEY=""` (a common "explicitly disable this" idiom) is treated as unset and silently
replaced by whatever `.env.local` holds. The comment above the function says it does not override
"what the shell already exported" — for the empty string, it does.

**Fix:** `process.env[key] !== undefined`.

---

## Not raised (checked and found clean, or deliberately out of scope)

Recorded so the next reader knows these were looked at rather than missed:

- **All nineteen senders.** `grep` for hand-built markup in `src/lib/email.ts` returns only
  `renderOpsAlertDigest`; its five columns all carry `escapeHtml` (`:679-682`). The reverted
  `action`-column mutation is genuinely reverted.
- **The plain-text twin.** `html` and `text` are separate strings in separate JSON fields; nothing in
  the text path can reach the HTML part. The dev fallback (`email.ts:51`) logs `html` only, so the
  WR-02 guard is unchanged. The raw href in the text part is correct.
- **`escapeHtml` in attribute context.** The `href` attribute is double-quoted and both `"` and `'`
  are encoded — breakout is not possible. Only the *scheme* is unguarded (WR-01).
- **The preview harness's safety contract.** Measured: destination is required with no default
  (`:187-192`), preview is the default, and a full preview run composed and captured 23/23 messages
  with nothing leaving the process. The `.env.local` reader is allow-listed to two keys and cannot be
  tricked into reading others (`:217`); no address is hardcoded anywhere in the file.
- **`tests/helpers/email-fixtures.ts`.** The sender union is compiler-derived, `SENDER_COUNT` is
  asserted at runtime, `stringPathsIn` has a positive control, and `withValueAt` is verified
  copy-on-write. The digest's `action` / `actorId` columns *are* reached by the walker (`Date` is
  correctly non-traversable).
- **Auth composition.** One `<main>` in the layout and none in any page; `titleAs="h1"` on all four
  pages, asserted by AST; no `(auth)` ancestor reads the session (corroborated by the ƒ→○ manifest
  flip recorded in `loading-coverage.test.ts`); `safeCallbackPath` still guards both `router.push`
  and the social `callbackURL`.
- **The `Continue with Google` button** (`login/page.tsx:230-234`, `signup/page.tsx:234-238`) renders
  at the default `h-8` (32px), not `size="touch"`. 15-UI-SPEC:811 scopes the 44px floor to *primary*
  CTAs and 32px clears WCAG 2.5.8's 24px minimum, so this is a deliberate scope boundary rather than
  a gate failure. Noted only so it is not re-discovered as one.
- **`(app)/profile/loading.tsx` drawing one skeleton**, the two stale comments in `(auth)/error.tsx`,
  the de-quoted prose tokens, the absent `PublicHeader`, and the `BRAND_CLASS` grep count of 2 — all
  pre-accepted deviations, per the brief.

**Could not discharge from the files in scope:** `sendResetPassword`'s `url` is built by Better Auth
from a client-supplied `redirectTo`. Whether that value is constrained (`trustedOrigins`) decides
whether a reset link can be made to carry a victim's token to an attacker-controlled `callbackURL`.
`src/lib/auth.ts` was not in scope and I did not read it. Flagging as a **verify-separately** item,
not as a finding — I have no evidence either way.

**DISCHARGED by the orchestrator, 2026-08-24 — not exploitable.** Read `src/lib/auth.ts:52-63`:

```
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],
```

Two independent reasons the token cannot reach an attacker domain:

1. **The link's origin is config, not input.** Better Auth builds the reset URL from `baseURL`, which is `BETTER_AUTH_URL` — a server env var. No client value contributes to the origin the token is minted against.
2. **`trustedOrigins` is a single origin.** A client-supplied `redirectTo` / `callbackURL` pointing anywhere else fails Better Auth's origin validation, and `redirectTo` is consumed only *after* the token has been redeemed on the trusted origin — so it never travels with the token.

**Residual, out of scope for this phase and NOT a finding:** `BETTER_AUTH_URL` falls back to `http://localhost:3000` when unset, and unlike `BETTER_AUTH_SECRET` (which has a WR-03 production boot-guard at `auth.ts:34-48`) there is no guard on it. Unset in production, both `baseURL` and `trustedOrigins` become localhost — reset links would be **unusable rather than leaky**, and OAuth would break loudly. That fails visibly, not silently-insecurely, so it is a hardening opportunity for a later phase, not a token-leak vector.

---

_Reviewed: 2026-08-24T17:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
