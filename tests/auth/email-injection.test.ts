// ONE ADVERSARIAL PAYLOAD, EVERY STRING PARAMETER, ALL NINETEEN SENDERS (15-UI-SPEC AC#16).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE ADDS THAT `email-escaping.test.ts` DOES NOT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/auth/email-escaping.test.ts` is the WR-01 regression and it stays exactly as it is: three
// cases over TWO sends, pinning the specific historical bug (a client-influenceable reset url breaking
// out of an `href`). It is a sample. Since 15-03 every sender hands `renderEmail` RAW strings and the
// shell escapes them at ONE choke point, which turns "does this sender escape?" from nineteen separate
// questions into one — but only for the sinks the shell actually covers, and only for as long as no
// sender starts building markup again. A sample of two cannot see either failure.
//
// So this file drives one payload through EVERY string of EVERY exported sender, using the shared
// argument lists in `tests/helpers/email-fixtures.ts`. The coverage is not a list somebody keeps: the
// sender union is DERIVED from the email module (a twentieth sender without a fixture fails `tsc`), and
// the string set is WALKED out of each argument list (a new parameter is probed the moment it is added).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE PREHEADER IS THE POINT — IT IS THE ESCAPE SITE NOBODY LOOKS AT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 15-UI-SPEC's escaping sentence names four sinks: the heading, the paragraphs, the CTA label and the
// CTA href. The shell has a FIFTH — the preheader div, derived from `content.preheader ?? heading` and
// injected into markup at the very top of the document, above everything a reviewer reads. A probe
// that only inspected the body would pass over exactly the sink nobody looks at.
//
// ⚠ AND THE PER-SENDER PREHEADER ASSERTION IS A FORWARD GUARD, NOT A LIVE ONE — stated so the next
// reader under-trusts it correctly. All nineteen senders pass a LITERAL heading and no `preheader`, so
// no caller-supplied string reaches the preheader today and the per-sender assertion is true for a
// structural reason rather than because escaping happened. What makes the preheader claim REAL is the
// direct-render block at the bottom, which puts the payload in the heading and in an explicit
// `preheader` override and asserts over the leading region. That block is what the mutation walk
// reddens. The per-sender assertions are the regression that fires the day a sender interpolates a
// space title into a heading.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS DELIBERATELY NOT ASSERTED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE PAYLOAD APPEARS RAW IN THE `text` PART, AND THAT IS CORRECT. `text/plain` takes raw strings
//     by design (15-01); escaping it would be the defect. An assertion forbidding the payload there
//     would pin a bug. This file asserts the OPPOSITE — the twin carries the injected string verbatim —
//     which doubles as the proof that the value was rendered at all rather than dropped.
//   • THE RECIPIENT. `to` is a string parameter and it IS substituted, but it goes to the transport
//     rather than into a body, so no escaped form can be expected in the HTML. The probe asserts the
//     captured `to` equals the payload instead — otherwise a sender that silently ignored its first
//     argument would pass the absence assertion for the wrong reason.
//   • COPY VARIANTS. `answer` (`"yes" | "no"`) and `kind` are strings that SELECT a sentence rather
//     than being interpolated into one. The payload is driven through them (an unexpected value must
//     not crash a send) but no escaped form is expected, because nothing was ever interpolated.
//   • DELIVERY. Nothing here proves an inbox renders anything. `tests/design/email-shell.test.ts`
//     grades the shell's structure; EMAIL-03's inbox walk is plan 15-05's.
//
// ---------------------------------------------------------------------------------------------------
// MUTATION VERIFICATION (anti-vacuity house standard). Each mutation was applied to `src/`, this file
// was re-run, the RED was recorded VERBATIM below, and the mutation was reverted —
// `git diff --exit-code src/` clean afterwards.
//
// GREEN, before any mutation: **141 passed (141)**.
// `npx vitest run tests/auth/email-injection.test.ts`
//
// M1 — THE PREHEADER LOSES ITS ESCAPE. `escapeHtml(content.preheader ?? content.heading)` in
//      `src/lib/email-shell.ts` reduced to `(content.preheader ?? content.heading)` — the fifth escape
//      site, the one 15-UI-SPEC's escaping sentence does not name. **3 failed | 138 passed (141):**
//
//        FAIL … > the derived preheader — the escape site 15-UI-SPEC's sentence does not name
//             > a payload in the HEADING is escaped on its way into the preheader div
//        AssertionError: the raw payload reached the hidden preview line: expected
//        '<!DOCTYPE html><html lang="en"><head>…' not to contain
//        '<script>alert('x15')</script>" onmo…'
//          Received: …mso-hide:all;color:#ffffff"><script>alert('x15')</script>" onmouseover="y" & 'z
//          &zwnj;&nbsp;… — the payload sitting RAW inside the hidden div, with the escaped form
//          visible in the <title> three tags earlier, which is what makes the diff readable.
//
//        FAIL … > a payload in an explicit PREHEADER override is escaped the same way
//        AssertionError: expected '<!DOCTYPE html><html lang="en"><head>…' not to contain
//        '<script>alert('x15')</script>" onmo…'   → the override path is a SECOND route into the
//        same sink, and it fails independently of the derived one.
//
//        FAIL … > guard-the-guard — the probe has teeth
//             > the preheader region really is the preheader, and it starts past the 300th character
//        AssertionError: the escaped payload is outside the derived region: expected 1437 to be less
//        than 845
//
//      THE THIRD FAILURE IS THE ONE WORTH READING. It is the guard-the-guard, and it went red for a
//      reason the other two did not: with the preheader unescaped, the FIRST escaped occurrence in the
//      document moves out of the preview line entirely and lands 1437 characters in, in the body. A
//      probe that only asserted "the payload is absent" would have been satisfied by a region that had
//      quietly stopped being the preheader. Reverted; `git diff --exit-code src/` clean → 141 passed.
//
// M2 — THE DIGEST'S FREE-TEXT COLUMN LOSES ITS ESCAPE. `${escapeHtml(r.action)}` in
//      `renderOpsAlertDigest` (`src/lib/email.ts:680`) reduced to `${r.action}` — the PRE-ESCAPED
//      `tableHtml` slot, which the renderer deliberately does not escape, so the per-field call is the
//      only thing standing between ~20 `recordAudit` call sites and an operator's inbox (T-15-03).
//      **2 failed | 139 passed (141):**
//
//        FAIL … > sendOpsAlertDigest — the payload never appears raw in any rendered HTML
//             > ops alert digest — two rows, one aging, truncated: payload at "1.0.action"
//        AssertionError: sendOpsAlertDigest rendered "1.0.action" into the HTML unescaped. Since 15-03
//        a sender hands renderEmail RAW strings and the shell escapes every sink — a raw payload here
//        means either a sender started building markup again or a sink lost its escape call.: expected
//        '<!DOCTYPE html><html lang="en"><head>…' not to contain
//        '<script>alert('x15')</script>" onmo…'
//          Received: …<tr><td>audit_fixture_1</td><td><script>alert('x15')</script>" onmouseover="y" &
//          'z</td><td>system</td>… — a live <script> element inside the digest table, in the one send
//          that goes to a human who acts on it.
//
//        FAIL … > payload at "1.1.action"  → the SECOND row fails independently, so the probe is
//        walking the rows rather than sampling the first one.
//
//      This mutation is recorded here rather than only in the plan summary because it is the mutation
//      that was found UNCOMMITTED in the working tree when this plan resumed after its first executor
//      died mid-walk. It was re-applied deliberately, watched red, and reverted; `git diff
//      --exit-code src/` clean → 141 passed.
// ---------------------------------------------------------------------------------------------------

import { describe, it, expect } from "vitest";

import * as email from "@/lib/email";
import { escapeHtml, renderEmail } from "@/lib/email-shell";
import { mockResend } from "../helpers/mocks";
import {
  SENDER_COUNT,
  SENDER_FIXTURES,
  SENDER_NAMES,
  readAt,
  stringPathsIn,
  withValueAt,
} from "../helpers/email-fixtures";

/**
 * ONE payload carrying all five HTML-significant characters, a script element, and an
 * attribute-breaking quote sequence. The five are asserted present below rather than eyeballed — a
 * payload missing one of them makes every assertion in this file weaker in a way nothing would report.
 */
const PAYLOAD = `<script>alert('x15')</script>" onmouseover="y" & 'z`;

/** The same string as the shell renders it. Computed with the repository's ONE escaper, never retyped. */
const ESCAPED = escapeHtml(PAYLOAD);

/** A rendered FitOut email document is ~1.8k characters. Well under that, well over an empty string. */
const HTML_FLOOR = 800;

/**
 * The leading region of the document: everything up to and including the close of the FIRST `<div>`,
 * which is the hidden preheader.
 *
 * DERIVED RATHER THAN A FIXED CHARACTER COUNT, and the reason is measured in the guard-the-guard block
 * below: the preheader's TEXT does not begin until well past the 300th character (the doctype, the two
 * meta elements, the title, the body's background declaration and the preheader div's own eleven inline
 * declarations all come first). A fixed 300-character slice would therefore be an absence assertion
 * over a window the payload could never have reached — green forever, for the wrong reason.
 */
function preheaderRegion(html: string): string {
  const close = html.indexOf("</div>");
  return close === -1 ? html : html.slice(0, close + "</div>".length);
}

/** Where the hidden preheader div opens. Its inline `display:none` is unique in the document. */
const PREHEADER_OPEN = '<div style="display:none';

/**
 * The preheader div's INNER text, on its own.
 *
 * A measured surprise worth writing down: the leading region above also contains the `<title>`, which
 * carries the escaped heading (15-01's deliberate choice — the renderer is never handed a subject). So
 * "the heading is absent from the leading region" is a claim that can never be true, and a case meaning
 * to prove the preheader OVERRIDE was honoured has to read the div rather than the slice. Both readings
 * are kept: the slice is the broad absence scan the escaping requirement asks for, the div is the
 * precise one.
 */
function preheaderText(html: string): string {
  const open = html.indexOf(PREHEADER_OPEN);
  if (open === -1) return "";
  const start = html.indexOf(">", open) + 1;
  const end = html.indexOf("</div>", start);
  return end === -1 ? "" : html.slice(start, end);
}

/** Call one sender by name with an arbitrary argument list. */
async function callSender(name: (typeof SENDER_NAMES)[number], args: readonly unknown[]): Promise<void> {
  const fn = email[name] as (...a: unknown[]) => unknown;
  await fn(...args);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// GUARD-THE-GUARD FIRST. Every absence below is worthless if the payload is toothless, if the fixture
// set has quietly shrunk, or if the "preheader region" is a slice of something else.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("guard-the-guard — the probe has teeth", () => {
  it("the payload carries all five HTML-significant characters, plus a tag and an attribute break", () => {
    for (const character of ["&", "<", ">", '"', "'"]) {
      expect(PAYLOAD, `the payload is missing ${JSON.stringify(character)}`).toContain(character);
    }
    expect(PAYLOAD).toContain("<script>");
    expect(PAYLOAD).toContain('" onmouseover="');
    // If these were equal, every "raw absent / escaped present" pair below would be self-satisfying.
    expect(ESCAPED).not.toBe(PAYLOAD);
    expect(ESCAPED).toContain("&lt;script&gt;");
    expect(ESCAPED).toContain("&quot;");
    expect(ESCAPED).toContain("&#39;");
    expect(ESCAPED).toContain("&amp;");
  });

  it(`covers all ${SENDER_COUNT} exported senders, and the record is total by construction`, () => {
    // The union is derived from the email module, so a missing entry is a COMPILE error rather than a
    // silently unprobed sender. This runtime count catches the other direction: a sender DELETED from
    // the module and from this record, which would compile cleanly and shrink the probe in silence.
    expect(SENDER_NAMES).toHaveLength(SENDER_COUNT);
    expect(new Set(SENDER_NAMES).size).toBe(SENDER_COUNT);
    for (const name of SENDER_NAMES) {
      expect(typeof email[name], `${name} is exported by the fixture set but not by @/lib/email`).toBe(
        "function",
      );
    }
  });

  it("every fixture declares at least one call, and every declared path resolves to a string", () => {
    for (const name of SENDER_NAMES) {
      const fixture = SENDER_FIXTURES[name];
      expect(fixture.calls.length, `${name} declares no call`).toBeGreaterThan(0);
      expect(fixture.why.length, `${name}'s fixture has no reason`).toBeGreaterThan(40);
      for (const call of fixture.calls) {
        const paths = stringPathsIn(call.args);
        expect(paths.length, `${name} / ${call.label} has no string parameter at all`).toBeGreaterThan(0);
        // A declaration naming a path the walker does not produce is a stale declaration: it would
        // silently change how that string is probed (or fail to), which is the drift this catches.
        for (const declared of [call.recipient, ...call.urls, ...call.variants]) {
          expect(
            paths,
            `${name} / ${call.label} declares "${declared}", which is not a string in its argument list`,
          ).toContain(declared);
        }
        expect(typeof readAt(call.args, call.recipient)).toBe("string");
      }
    }
  });

  it("the path walker finds nested strings and steps over non-plain objects", () => {
    // The positive control for `stringPathsIn`. Without it, a walker that returned [] would make every
    // per-path assertion below vanish — zero tests generated, and a green suite reporting nothing.
    const found = stringPathsIn([
      "top",
      { nested: "deep", when: new Date("2026-08-01T02:30:00.000Z"), n: 7 },
      [{ id: "row" }],
    ]);
    expect(found).toEqual(["0", "1.nested", "2.0.id"]);
    // …and the copy-on-write setter does not touch the shared fixture it was handed.
    const original = ["a", { b: "c" }] as const;
    const changed = withValueAt(original, "1.b", "z");
    expect(changed[1]).toEqual({ b: "z" });
    expect(original[1]).toEqual({ b: "c" });
  });

  it("the preheader region really is the preheader, and it starts past the 300th character", () => {
    const { html } = renderEmail({ heading: PAYLOAD, paragraphs: ["body"] });
    const region = preheaderRegion(html);
    // The slice's own signature — `mso-hide:all` appears nowhere else in the document.
    expect(region, "the slice is not the preheader div").toContain("mso-hide:all");
    expect(region.length, "the slice swallowed the whole document").toBeLessThan(html.length);
    expect(preheaderText(html), "the preheader div rendered empty").not.toBe("");

    // THE MEASUREMENT that justifies deriving the slice instead of taking the plan's literal 300
    // characters. Searched FROM the div's opening tag, because the first occurrence of the escaped
    // payload in the document is at index 133 — inside the `<title>`, which carries the heading too.
    // The preheader's own copy begins past 400, so a fixed 300-character window would be an absence
    // assertion over a region the preheader payload can never reach: green forever, for no reason.
    const inPreheader = html.indexOf(ESCAPED, html.indexOf(PREHEADER_OPEN));
    expect(inPreheader, "the escaped payload is not in the preheader at all").toBeGreaterThan(0);
    expect(inPreheader, "the preheader text now starts inside the first 300 characters").toBeGreaterThan(
      300,
    );
    expect(inPreheader, "the escaped payload is outside the derived region").toBeLessThan(region.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROBE. One `it` per (sender, call, string parameter).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

for (const name of SENDER_NAMES) {
  const fixture = SENDER_FIXTURES[name];

  describe(`${name} — the payload never appears raw in any rendered HTML`, () => {
    fixture.calls.forEach((call) => {
      it(`${call.label}: renders cleanly with no payload at all (positive control)`, async () => {
        await callSender(name, call.args);

        const captured = mockResend.sent();
        expect(captured, "the sender captured nothing — every assertion below would be vacuous").toHaveLength(
          1,
        );
        const html = captured[0].html ?? "";
        expect(html).toContain("<!DOCTYPE html>");
        expect(html.length, "the rendered document is too short to be one").toBeGreaterThan(HTML_FLOOR);
        expect(html).not.toContain(PAYLOAD);
        expect(captured[0].text ?? "", "the plain-text twin is missing or empty").not.toBe("");
      });

      for (const path of stringPathsIn(call.args)) {
        // Widened deliberately: `as const` narrows an EMPTY declaration to `readonly []`, whose
        // `.includes` parameter is `never`. The widening is the reader's, never the fixture's — the
        // literal types are what make the fixture module's own error messages worth reading.
        const isUrl = (call.urls as readonly string[]).includes(path);
        const isRecipient = path === (call.recipient as string);
        const isVariant = (call.variants as readonly string[]).includes(path);

        it(`${call.label}: payload at "${path}"${isUrl ? " (appended, stays URL-shaped)" : ""}`, async () => {
          const original = readAt(call.args, path);
          expect(typeof original, `"${path}" is not a string`).toBe("string");
          // A URL parameter keeps its shape and takes the payload as a SUFFIX, so the call stays the
          // kind of call a caller makes. Everything else is substituted wholesale.
          const injected = isUrl ? `${original as string}${PAYLOAD}` : PAYLOAD;

          await callSender(name, withValueAt(call.args, path, injected));

          const captured = mockResend.sent();
          expect(captured, "the sender captured nothing").toHaveLength(1);
          const html = captured[0].html ?? "";
          const text = captured[0].text ?? "";

          // POSITIVE CONTROL — the probe cannot pass by rendering nothing.
          expect(html.length, "the rendered document is too short to be one").toBeGreaterThan(HTML_FLOOR);

          // (1) NOWHERE RAW, anywhere in the document.
          expect(
            html,
            `${name} rendered "${path}" into the HTML unescaped. Since 15-03 a sender hands ` +
              `renderEmail RAW strings and the shell escapes every sink — a raw payload here means ` +
              `either a sender started building markup again or a sink lost its escape call.`,
          ).not.toContain(PAYLOAD);
          expect(html, "a script element survived into the document").not.toContain("<script>");
          expect(html, "an attribute break survived into the document").not.toContain('" onmouseover="');

          // (2) NOWHERE RAW IN THE PREHEADER either — the fifth sink, and the one nobody reads.
          expect(
            preheaderRegion(html),
            `${name} rendered "${path}" into the hidden preheader unescaped`,
          ).not.toContain(PAYLOAD);

          if (isRecipient) {
            // The recipient is not rendered, so its absence above proves nothing on its own. This is
            // what proves the substitution actually happened.
            expect(captured[0].to, "the sender ignored its recipient argument").toBe(injected);
          } else if (!isVariant) {
            // (3) IT WAS RENDERED, JUST SAFELY. Without this the probe passes on a sender that dropped
            // the parameter entirely.
            expect(
              html,
              `${name} did not render "${path}" at all — the absence assertion above is therefore ` +
                `satisfied for the wrong reason`,
            ).toContain(ESCAPED);
            // …and the plain-text twin carries it RAW, which is correct and is asserted rather than
            // merely tolerated: an escaped `text/plain` part would be the defect.
            expect(text, `the plain-text twin lost "${path}"`).toContain(injected);
          }
        });
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIFTH SINK, READ DIRECTLY. This is the block the preheader mutation reddens — see M1 above.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the derived preheader — the escape site 15-UI-SPEC's sentence does not name", () => {
  it("a payload in the HEADING is escaped on its way into the preheader div", () => {
    const { html, text } = renderEmail({ heading: PAYLOAD, paragraphs: ["A body sentence."] });
    const region = preheaderRegion(html);

    expect(region, "the slice is not the preheader div").toContain("mso-hide:all");
    expect(region, "the raw payload reached the hidden preview line").not.toContain(PAYLOAD);
    expect(region, "the preheader rendered nothing at all").toContain(ESCAPED);
    // …and read at the div itself, not merely somewhere in the leading slice.
    expect(preheaderText(html)).not.toContain(PAYLOAD);
    expect(preheaderText(html)).toContain(ESCAPED);
    // The twin takes the raw heading, as it should.
    expect(text).toContain(PAYLOAD);
  });

  it("a payload in an explicit PREHEADER override is escaped the same way", () => {
    const { html } = renderEmail({
      heading: "A perfectly ordinary heading",
      preheader: PAYLOAD,
      paragraphs: ["A body sentence."],
    });
    const preview = preheaderText(html);

    expect(preheaderRegion(html)).not.toContain(PAYLOAD);
    expect(preview).not.toContain(PAYLOAD);
    expect(preview).toContain(ESCAPED);
    // The OVERRIDE, not the heading — otherwise this case would pass on a renderer that ignored it.
    // Read at the div rather than the slice: the `<title>` carries the heading and always will.
    expect(preview).not.toContain("A perfectly ordinary heading");
    expect(html, "the title still carries the heading — 15-01's deliberate choice").toContain(
      "<title>A perfectly ordinary heading</title>",
    );
  });
});
