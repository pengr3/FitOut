---
phase: 260710-lgo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/cloudinary/sign/route.ts
  - tests/listing/cloudinary-sign.test.ts
autonomous: true
requirements: [T-04-SIGMATCH]
must_haves:
  truths:
    - "A paramsToSign body containing any key outside {folder, source, timestamp} is rejected with HTTP 400 and NO signature is returned (signUploadParams is never called)."
    - "A clean paramsToSign of exactly {folder, source, timestamp} whose folder matches the caller's owned listing still signs successfully (200) — the real <CldUploadWidget> upload keeps working."
    - "The existing session (401), ownership/existence (403), rate-limit (429), folder-scope (403), and secret-never-echoed guards are all unchanged."
  artifacts:
    - path: "src/app/api/cloudinary/sign/route.ts"
      provides: "Path-5a allow-list guard: rejects any non-allow-listed paramsToSign key with 400 before signing"
      contains: "ALLOWED_SIGN_KEYS"
    - path: "tests/listing/cloudinary-sign.test.ts"
      provides: "Path-5a (paramsToSign body) coverage: unexpected-key 400, clean-sign 200, folder-scope 403"
      contains: "paramsToSign"
  key_links:
    - from: "src/app/api/cloudinary/sign/route.ts path 5a"
      to: "signUploadParams(paramsToSign)"
      via: "reached ONLY after every paramsToSign key is confirmed in ALLOWED_SIGN_KEYS"
      pattern: "ALLOWED_SIGN_KEYS"
---

<objective>
Close security threat **T-04-SIGMATCH**: the Cloudinary upload-signing endpoint (`POST /api/cloudinary/sign`, path 5a) signs the ENTIRE client-supplied `paramsToSign` object, validating only `folder`. Any authenticated host can inject arbitrary Cloudinary upload keys (`public_id`, `notification_url`, `eager`, `overwrite`, `tags`, `context`, `moderation`, …) and get a valid signature back. This is the path the live `<CldUploadWidget>` production flow actually uses — and it has ZERO test coverage of the param-tampering boundary.

Fix: enforce a fixed key allow-list on `paramsToSign` before signing, so the endpoint can never mint a signature for any param outside `{folder, source, timestamp}` regardless of what the client sends. Add path-5a test coverage proving both the rejection and the legitimate happy path.

Purpose: Restore the declared mitigation ("signed param set == client param set `{folder, source, timestamp}`; no extra params either side") and flip Phase 02 security to `threats_open: 0` so the phase can ship.
Output: allow-list guard in `route.ts` + path-5a tests in `cloudinary-sign.test.ts`; full `cloudinary-sign.test.ts` green; `tsc --noEmit` clean.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-listings-host-onboarding/02-SECURITY.md

<interfaces>
<!-- Contracts the executor needs — extracted from the codebase. No exploration required. -->

The endpoint under fix — src/app/api/cloudinary/sign/route.ts, path 5a (lines 80-90). listingId is
resolved from the body OR the ?listingId= query fallback; paramsToSign comes from the untrusted body:
```ts
// paramsToSign is typed Record<string, string | number | boolean> | undefined
const folder = `fitout/listings/${listingId}`;

// 5a. Live <CldUploadWidget> path.
if (paramsToSign) {
  if (paramsToSign.folder !== folder) {
    return new Response("Forbidden — upload folder out of scope", { status: 403 });
  }
  return Response.json({ signature: signUploadParams(paramsToSign) });   // ← signs verbatim (the gap)
}
```

The signer — src/lib/cloudinary.ts (leave generic; its JSDoc already says "Callers MUST validate/scope
sensitive params BEFORE calling this"):
```ts
export function signUploadParams(params: Record<string, string | number | boolean>): string;
```

What the widget legitimately POSTs (route.ts comment lines 80-84; photo-uploader.tsx sets
options.folder = `fitout/listings/${listingId}` and uses signatureEndpoint
`/api/cloudinary/sign?listingId=<id>`): the signed Upload Widget posts `{ folder, source: "uw", timestamp }`.
So the allow-list is EXACTLY these three keys.

Test harness — tests/listing/cloudinary-sign.test.ts (match this exact style):
- `signInHost(email)` → signs up + signs in a host, stashes the session cookie for the next/headers mock, returns the user id.
- `makeListing(hostId)` → inserts a draft listing owned by hostId, returns its id.
- `signRequest(body)` → builds a POST Request with a JSON body (this is the path-5b helper; it puts listingId in the BODY).
- `signSpy` = the mocked `cloudinary.v2.utils.api_sign_request` (returns the fixed string `"mock-signature"`); call `signSpy.mockClear()` before an assertion; assert `signSpy` NOT called to prove "never signed".
- Global mock (tests/setup.ts + tests/helpers/mocks.ts): `cloudinary` is fully mocked; `api_sign_request` → `"mock-signature"`.
- Each test signs in a FRESH host (unique email → unique rate-limit key), so no cross-test 429.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add path-5a (paramsToSign) test coverage — RED for the tampering case</name>
  <files>tests/listing/cloudinary-sign.test.ts</files>
  <behavior>
    Add a new helper and three path-5a tests inside the existing `describe("cloudinary sign endpoint (LIST-02)")` block. Path 5a is the REAL widget path: listingId travels in the `?listingId=` query string, and the body carries `{ paramsToSign: {...} }` (no top-level listingId).

    - New helper `signParamsRequest(listingId, paramsToSign)`: builds
      `new Request("http://localhost/api/cloudinary/sign?listingId=" + encodeURIComponent(listingId), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paramsToSign }) })`.

    - Test (a) "rejects a paramsToSign body with a key outside the {folder, source, timestamp} allow-list (T-04-SIGMATCH)":
        owner = signInHost("sign.tamper@example.com"); listingId = makeListing(owner);
        signSpy.mockClear();
        body paramsToSign = `{ folder: "fitout/listings/<listingId>", source: "uw", timestamp: 1700000000, public_id: "attacker/evil" }`;
        POST signParamsRequest(...) → expect status 400;
        expect(signSpy).not.toHaveBeenCalled()  // NO signature was minted;
        expect(await res.text()).not.toContain("mock-signature").
        (Try a second forbidden key too, e.g. `notification_url`, to show the allow-list is not public_id-specific — a 2nd assertion or a small loop is fine.)

    - Test (b) "signs a clean paramsToSign of exactly {folder, source, timestamp} for the owned listing (widget happy path)":
        owner = signInHost("sign.widgetok@example.com"); listingId = makeListing(owner);
        signSpy.mockClear();
        body paramsToSign = `{ folder: "fitout/listings/<listingId>", source: "uw", timestamp: 1700000000 }`;
        POST → expect status 200; body.signature === "mock-signature";
        expect(signSpy).toHaveBeenCalledTimes(1);
        assert the SIGNED object keys === ["folder", "source", "timestamp"] (sorted) and its folder === `fitout/listings/<listingId>`.

    - Test (c) "returns 403 when paramsToSign.folder points outside the owned listing's folder (path-5a folder scope holds)":
        owner = signInHost("sign.scope@example.com"); listingId = makeListing(owner); // caller OWNS this listing (ownership gate passes)
        signSpy.mockClear();
        body paramsToSign = `{ folder: "fitout/listings/" + randomUUID(), source: "uw", timestamp: 1700000000 }`; // only allow-listed keys, but wrong folder
        POST signParamsRequest(listingId, ...) → expect status 403;
        expect(signSpy).not.toHaveBeenCalled().
        (This confirms the allow-list check runs BEFORE the folder-scope check but does not swallow the 403: a body of only-allow-listed keys with a mismatched folder must still 403, not 400 or 200.)
  </behavior>
  <action>
    Edit tests/listing/cloudinary-sign.test.ts. Add the `signParamsRequest` helper next to the existing `signRequest` helper, and add the three tests above at the end of the existing describe block. Reuse `signInHost`, `makeListing`, `signSpy`, and `randomUUID` (already imported from node:crypto). Do NOT modify the existing path-5b tests. Do NOT touch the beforeAll/afterAll mock wiring.

    Ordering note for the executor: at this point route.ts is UNPATCHED, so Test (a) is expected to FAIL (RED) — the current code signs the injected `public_id` and returns 200 with a signature. Tests (b) and (c) should pass against current code. This RED is the point: it proves the vulnerability. Task 2 makes it green.
  </action>
  <verify>
    <automated>npx vitest run tests/listing/cloudinary-sign.test.ts</automated>
  </verify>
  <done>Three path-5a tests + the signParamsRequest helper exist. Test (a) FAILS against the current (unpatched) route (RED, proving the tampering gap); tests (b) and (c) pass. The path-5b tests are untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Allow-list paramsToSign keys before signing (route path 5a) — GREEN</name>
  <files>src/app/api/cloudinary/sign/route.ts</files>
  <action>
    Add a module-scope constant near the top of src/app/api/cloudinary/sign/route.ts (after the imports):
    ```ts
    // T-04-SIGMATCH — the ONLY Cloudinary upload params this endpoint will ever sign. The signed
    // <CldUploadWidget> posts exactly { folder, source: "uw", timestamp }; anything else in the body
    // (public_id, notification_url, eager, overwrite, tags, context, moderation, …) must NOT be signed.
    const ALLOWED_SIGN_KEYS = new Set(["folder", "source", "timestamp"]);
    ```

    Then in path 5a (the `if (paramsToSign)` branch, currently lines 85-90), enforce the allow-list BEFORE the existing folder-scope 403 check and BEFORE calling signUploadParams:
    ```ts
    if (paramsToSign) {
      // Reject the request if it carries ANY param outside the fixed allow-list — the endpoint must
      // never mint a signature for an arbitrary Cloudinary upload key (T-04-SIGMATCH). Do NOT sign.
      const extraKey = Object.keys(paramsToSign).find((k) => !ALLOWED_SIGN_KEYS.has(k));
      if (extraKey) {
        return new Response("Bad Request — unexpected upload param", { status: 400 });
      }
      // Folder must still be scoped to the caller's own listing (unchanged).
      if (paramsToSign.folder !== folder) {
        return new Response("Forbidden — upload folder out of scope", { status: 403 });
      }
      return Response.json({ signature: signUploadParams(paramsToSign) });
    }
    ```

    Update the SIGNED-PARAM MATCH bullet in the file's header doc comment (lines 13-15) so it reads that path 5a now allow-lists `{ folder, source, timestamp }` and rejects any other key with 400 before signing (keep it terse — one edited clause, not a rewrite).

    Single source of truth decision (note, do NOT also add an allow-list inside signUploadParams): the ROUTE is the enforcement point. It is the trust boundary that receives the untrusted body, it already owns the folder-scope 403, and it owns the HTTP 400 response semantics. Keeping the allow-list adjacent to the folder-scope check means one place owns "what may be signed for this listing." `signUploadParams` stays a generic signer — its JSDoc already states callers MUST validate/scope before calling — so we avoid two allow-lists that could drift out of sync. Leave src/lib/cloudinary.ts unchanged.

    Do not weaken or reorder the session / listingId-resolution / rate-limit / ownership gates above path 5a, and do not touch path 5b.
  </action>
  <verify>
    <automated>npx vitest run tests/listing/cloudinary-sign.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>Path 5a rejects any paramsToSign key outside {folder, source, timestamp} with HTTP 400 before signing; a clean {folder, source, timestamp} for an owned listing still signs (200); folder-scope 403 still holds. All tests in cloudinary-sign.test.ts pass (Task 1's RED test now green) and `tsc --noEmit` is clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| authenticated client body → sign endpoint | `paramsToSign` is untrusted input that becomes a Cloudinary-signed upload instruction |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-SIGMATCH | Tampering | `POST /api/cloudinary/sign` path 5a (`paramsToSign`) | mitigate | Allow-list `{folder, source, timestamp}` before signing; any other key → HTTP 400, `signUploadParams` never reached. Keeps existing folder-scope 403 + ownership/session/rate-limit gates. Proven by path-5a tests: unexpected key → 400 & unsigned, clean set → 200 signed, mismatched folder → 403. |
</threat_model>

<verification>
- `npx vitest run tests/listing/cloudinary-sign.test.ts` — all tests pass (path-5b unchanged; new path-5a: 400 on unexpected key, 200 on clean set, 403 on folder mismatch).
- `npx tsc --noEmit` — clean.
- Manual grep sanity: `grep -n ALLOWED_SIGN_KEYS src/app/api/cloudinary/sign/route.ts` shows the constant defined AND referenced in path 5a before `signUploadParams`.
- No change to src/lib/cloudinary.ts (single enforcement point at the route, by design).
</verification>

<success_criteria>
- The sign endpoint can never return a signature for a paramsToSign body containing any key outside {folder, source, timestamp} (400 instead, unsigned).
- The legitimate `<CldUploadWidget>` upload ({folder, source, timestamp} for an owned listing) still signs (200) — path 5a and path 5b both intact.
- Session/ownership/rate-limit/folder-scope/secret-never-echoed guards unchanged.
- Full cloudinary-sign.test.ts suite green; `tsc --noEmit` clean.
- Closes T-04-SIGMATCH → Phase 02 security can move to `threats_open: 0`.
</success_criteria>

<output>
After completion, create `.planning/quick/260710-lgo-fix-t-04-sigmatch-allow-list-cloudinary-/260710-lgo-SUMMARY.md` capturing: the allow-list enforcement point (route, single source of truth), the three path-5a tests added, and a note to re-run the security auditor so T-04-SIGMATCH can be flipped to `closed` / `threats_open: 0` in 02-SECURITY.md.
</output>
