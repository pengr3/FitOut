// EMAIL-01 — THE EMAIL SHELL'S STRUCTURE, ITS PLAIN-TEXT TWIN, AND ITS ESCAPING, MADE FALSIFIABLE.
//
// `npm run build` is `lint && test:design && next build`, so a gate that lives in `tests/design/**`
// blocks the build. That is the only reason this file is here rather than beside the other email
// tests: every claim 15-UI-SPEC makes about the shell should be a command that exits non-zero when
// the claim stops being true, and `npm test` is not run by `next build`.
//
// WHY IT ASSERTS ON A STRING AND NOT ON A CAPTURED SEND.
//
// `vitest.design.config.ts` declares NO `globalSetup` and NO `setupFiles`, by contract — those two
// keys are exactly what makes `vitest.config.ts` require Docker, and the design gate must stay
// DB-free because it runs inside a build on a machine that may have neither Postgres nor Docker. The
// global `vi.mock("resend")` therefore does not exist in this config, and neither does
// `tests/helpers/mocks.ts`'s capture array. A gate written against that helper's captured-send
// accessor could not run here at all. So this file imports the PURE exported `renderEmail` and
// grades the string it returns. That is why plan 15-01 built the renderer as a plain function over a
// plain value.
//
// DO NOT ADD AN IMPORT OF the DOM testing-library packages, of the mail transport, of the shared
// mock helper, or of the main config's setup module — nor of anything else under `tests/helpers/`
// that touches a database or a mock. `./helpers/strip-comments` is the one helper imported below and
// it is a pure character scanner with no imports of its own. Anything heavier turns this gate into a
// build FAILURE rather than a gate, which is the worst of both outcomes: the build breaks and the
// property stops being checked.
//
// The four names above are DESCRIBED rather than spelled, deliberately. This tree's source-scan
// gates are greps, and this plan's own acceptance criterion is one of them — 15-RESEARCH § Pitfall 9
// and `src/lib/design/theme.ts`'s header both record the same lesson: naming a banned token in prose
// is what turns a clean module into a red gate. Anyone who needs the exact identifiers can read the
// import block twelve lines below, which is the authoritative answer anyway.
//
// ── WHAT THIS FILE ASSERTS ────────────────────────────────────────────────────────────────────────
//
//   1. Structure — one preheader, one 600px column, one font stack, zero of eight banned constructs,
//      and `role="presentation"` on every layout table the SHELL emits (the count contributed by a
//      caller's `tableHtml` is subtracted, because that markup arrives pre-built from its producer).
//   2. First-URL — with a CTA, the first absolute link in the document IS the CTA href; with no CTA,
//      there is no absolute link at all.
//   3. Parity — every paragraph and the heading appear raw in `text` and escaped in `html`, and the
//      text part carries a `{label}: {raw href}` line.
//   4. Escaping — a quote-and-markup payload appears nowhere raw in the whole document, the leading
//      preheader region explicitly included (T-15-02), while it DOES appear raw in `text`.
//   5. Typography — the set of `font-size:` values is exactly the five the spec declares.
//   6. The support slot — no `mailto:` renders while `SUPPORT_EMAIL` is null, AND the guard that
//      produces that absence exists in source exactly once with no else-branch (D-26).
//
// ── WHAT THIS FILE DOES NOT COVER — real blind spots, listed so the next reader under-trusts it ────
//
//   • THAT ANY EMAIL ACTUALLY RENDERS THROUGH THE SHELL. This grades `renderEmail`'s output on
//     fixtures written here. After plan 15-01 the renderer has ZERO callers; the nineteen adopters
//     are 15-03/15-04's work. A shell that is perfect and unused passes every assertion below.
//   • THAT IT LOOKS RIGHT IN A CLIENT. Outlook's word-rendering engine, Gmail's clipping threshold
//     and the CTA's real tap height are rendering facts. 15-UI-SPEC § Measurements M4 owns the
//     Gmail-web CTA height; nothing here opens a mail client.
//   • THE ENTITY/RAW ASYMMETRY IN AN href. A CTA href containing `&` is escaped to `&amp;` in the
//     HTML, so `tests/helpers/mocks.ts`'s `extractLink` — a raw regex over the source, not a parser —
//     recovers the entity-encoded form. `new URL(...)` still reads the FIRST query parameter
//     correctly, which is what the shipped auth tests read, but an adopter that puts the token
//     SECOND in the query string is walking into a trap this gate does not spring. Put the token
//     first.
//   • WHETHER THE CONTENT IS RIGHT. Subject lines, tone, and which send says what are 15-03/15-04's.
//
// ── WHEN THIS FILE GOES RED ───────────────────────────────────────────────────────────────────────
//
// Fix `src/lib/email-shell.ts`. Do NOT relax an assertion here to match new output: every one of
// them encodes a property that something downstream depends on silently — a reset test three layers
// away, a mail client's clipping threshold, an injection sink in the one element nobody reads. If a
// send genuinely needs a sixth font size or a second accent, that is a spec change, and the spec is
// `15-UI-SPEC.md § The Email Shell`, not this file.
//
// ── MUTATION VERIFICATION (anti-vacuity house standard) ───────────────────────────────────────────
//
// Each mutation below was applied to `src/lib/email-shell.ts`, this file was re-run, the RED was
// recorded VERBATIM, and the mutation was reverted — `git diff --exit-code src/` clean afterwards.
// Walked 2026-08-24. Every assertion BLOCK in this file appears in at least one RED below; a block
// that never reddened would be a block nobody has evidence for.
//
// M1 — drop the escape on the derived preheader: `escapeHtml(content.preheader ?? content.heading)`
//      → `(content.preheader ?? content.heading)`.
//      `npx vitest run tests/design/email-shell.test.ts --config vitest.design.config.ts` → VERBATIM:
//        × emits no payload raw anywhere in the whole document 8ms
//        × emits the payload nowhere raw in the PREHEADER region specifically 1ms
//        AssertionError: the heading sink's quote-and-markup payload reached the rendered HTML
//          unescaped. …: expected true to be false // Object.is equality
//        AssertionError: the derived preheader carried caller markup RAW. 15-RESEARCH § Pitfall 2:
//          this is the escape site the spec's own sentence does not name. …: expected true to be false
//              Tests  2 failed | 25 passed (27)
//      i.e. the ESCAPING block is live, and the preheader-region slice reddens independently of the
//      whole-document scan — which is the point of asserting the region separately (T-15-02).
//
// M2 — reintroduce the XHTML namespace attribute: `<html lang="en">` →
//      `<html lang="en" xmlns="http://www.w3.org/1999/xhtml">`. → VERBATIM:
//        × carries none of the eight banned constructs 8ms
//        × makes the CTA href the FIRST absolute URL in the document 1ms
//        × emits no absolute URL at all when there is no CTA 2ms
//        AssertionError: … expected [ 'xmlns ×1' ] to deeply equal []
//        AssertionError: an absolute URL appears in the rendered HTML before the CTA href. … expected
//          38 to be 1843 // Object.is equality
//        AssertionError: the one-action shape rendered more than one absolute URL. … expected 2 to be 1
//              Tests  3 failed | 24 passed (27)
//      i.e. ONE attribute of boilerplate moves the first absolute URL from index 1843 to index 38 —
//      `extractLink` would hand a W3C specification address to three auth tests as the reset link.
//      This is the whole reason the first-URL block exists, measured rather than argued.
//
// M3 — a second font stack: `font-family:Arial,sans-serif;` added to the `<h1>` style. → VERBATIM:
//        × declares the font stack exactly once 7ms
//        AssertionError: the rendered HTML declares font-family 2 times. It belongs on the column
//          cell and nowhere else — see the shell's own header.: expected 2 to be 1
//              Tests  1 failed | 26 passed (27)
//
// M4 — escape the plain-text twin too: `[content.heading, ...content.paragraphs]` →
//      `[content.heading, ...content.paragraphs].map(escapeHtml)`. → VERBATIM:
//        × carries every paragraph raw in text and escaped in html 9ms
//        × does NOT escape the plain-text twin — escaping text/plain would be the defect 2ms
//        AssertionError: the one-action shape: a paragraph is missing from the plain-text twin. …:
//          expected 'Verify your email\n\nTap the button b…' to contain 'The link expires in 60
//          minutes — don\…'
//        AssertionError: the heading was escaped in the plain-text twin. HTML entities in text/plain
//          are not safety, they are mojibake …: expected '&quot;&gt;&lt;script&gt;alert(&#39;he…'
//          to contain '"><script>alert(\'heading\')&</script>'
//              Tests  2 failed | 25 passed (27)
//      ⚠ THIS MUTATION CHANGED THE FILE. On its first run only ONE test reddened: the twin-escaping
//      assertion said `expect(nasty.text).toContain(PAYLOAD)` against a SINGLE shared payload used
//      for heading, paragraph and CTA label alike — and the CTA line is composed AFTER the map, so
//      the raw string survived there and the assertion passed over a twin whose heading and body had
//      both been entity-encoded. Fixed before the walk continued: three distinct payloads, one per
//      sink, and each sink asserted by name. The RED above is from the fixed version.
//
// M5 — a sixth type size: the CTA label's `font-size:${BODY_SIZE}` → `font-size:15px`. → VERBATIM:
//        × emits the five declared sizes and nothing else 10ms
//        × reports an empty harvest for a document with no type at all 2ms
//        AssertionError: the rendered email carries a font-size the spec does not declare. …:
//          expected [ Array(6) ] to deeply equal [ '14px', '16px', '18px', '1px', …(1) ]
//        AssertionError: expected 6 to be 5 // Object.is equality
//              Tests  2 failed | 25 passed (27)
//      Note the second failure is the POSITIVE CONTROL's own count of the real render — the control
//      is wired to the same scanner rather than to a copy of it.
//
// M6 — remove `role="presentation"` from the outer ground table. → VERBATIM:
//        × puts role=presentation on every layout table the SHELL emits 6ms
//        AssertionError: the shell emitted 2 tables but only 1 carry role="presentation". A layout
//          table without it is announced to a screen reader as a data table with rows and columns
//          nobody wrote.: expected 1 to be 2 // Object.is equality
//              Tests  1 failed | 26 passed (27)
//      i.e. the DERIVED expectation works: the digest fixture's own pre-built table is subtracted
//      from both sides, so the count that reddened is the shell's, not the producer's.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import { renderEmail, escapeHtml, type EmailContent } from "@/lib/email-shell";

import { stripComments } from "./helpers/strip-comments";

const SHELL = "src/lib/email-shell.ts";
const SHELL_SOURCE = readFileSync(resolve(__dirname, "../../", SHELL), "utf8");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scanners. Every assertion below runs through one of these, and the positive-control case at
// the end feeds the SAME functions a document that violates every clause — so a scanner that had
// stopped catching its defect is caught here rather than reporting a clean shell forever.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Occurrences of a literal. `split().length - 1` rather than a regex: no escaping of the needle. */
const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

/**
 * The eight constructs an HTML email must not carry, and why each one is on the list:
 *   `display:flex` / `display:grid` / `float:` — no mainstream mail client supports the first two,
 *     and the third is the layout bug the 600px table exists to avoid. Layout is tables here.
 *   `<img` — no hero image and no tracking pixel, ever (15-UI-SPEC § Every email).
 *   `class=` / `<style` — email has no reliable stylesheet; a class is a style that silently does
 *     nothing, which is worse than an inline declaration that works.
 *   `xmlns` / `DOCTYPE html PUBLIC` — the legacy XHTML preamble. Both carry an absolute
 *     specification URL into the document BEFORE the CTA, which is the first-URL defect below.
 */
const BANNED = [
  "display:flex",
  "display:grid",
  "float:",
  "<img",
  "class=",
  "<style",
  "xmlns",
  "DOCTYPE html PUBLIC",
] as const;

/** Every banned construct present, rendered `needle ×n` so a failure names what and how many. */
function bannedConstructs(html: string): string[] {
  return BANNED.filter((needle) => count(html, needle) > 0).map(
    (needle) => `${needle} ×${count(html, needle)}`,
  );
}

/** Just the needles, for the positive control's set comparison. */
const bannedNeedles = (html: string): string[] =>
  bannedConstructs(html).map((entry) => entry.split(" ×")[0]);

/**
 * How many preheader blocks a document carries. The hiding declaration is the identifying mark: a
 * preheader is defined by being invisible in the body and visible in the preview line, and
 * `mso-hide:all` is the part of that recipe nothing else in this shell has a reason to emit.
 */
const preheaderCount = (html: string): number => count(html, "mso-hide:all");

/** Index of the first absolute link in the document, or -1. */
const firstAbsoluteUrlIndex = (html: string): number => html.search(/https?:\/\//);

/** Every distinct `font-size:` value, sorted, so a set comparison reads deterministically. */
const fontSizes = (html: string): string[] =>
  [...new Set([...html.matchAll(/font-size:\s*([^;"']+)/g)].map((m) => m[1].trim()))].sort();

const tableOpens = (html: string): number => count(html, "<table");
const presentationRoles = (html: string): number => count(html, 'role="presentation"');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The two fixtures. One of each SHAPE the nineteen adopters will compose — a one-action message and
// the ops digest's table-carrying, CTA-less one — rather than one per send.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The one-action shape: heading, two paragraphs, one CTA with an absolute app URL. The second
 * paragraph carries an apostrophe and an ampersand ON PURPOSE, so the parity assertions can tell
 * "escaped" apart from "identical" — a fixture of plain ASCII words makes `escapeHtml(p) === p` and
 * the HTML half of every parity assertion becomes vacuous.
 */
const VERIFY: EmailContent = {
  heading: "Verify your email",
  paragraphs: [
    "Tap the button below to confirm this address.",
    "The link expires in 60 minutes — don't share it & don't forward this message.",
  ],
  cta: {
    label: "Verify email",
    href: "https://fitout.example/api/auth/verify-email?token=abc123",
  },
};

/**
 * The ops-digest shape: no CTA at all, and a pre-built table in the one sanctioned raw slot. Its
 * markup deliberately carries NO `role="presentation"` and NO absolute URL, because both of those
 * are what the shell's own counts are measured against — a fixture that supplied them would hide a
 * shell that had stopped emitting them.
 */
const DIGEST: EmailContent = {
  heading: "FitOut ops — 2 unresolved money alerts",
  paragraphs: [
    "Open the ops console and work the oldest row first.",
    "Showing the 50 oldest unresolved rows.",
  ],
  tableHtml:
    '<table cellpadding="6" cellspacing="0" border="1">' +
    "<tr><th>Audit</th><th>Age</th></tr>" +
    "<tr><td>audit_1</td><td>3d — AGING</td></tr>" +
    "</table>",
  tableText: "Audit    Age\naudit_1  3d — AGING",
};

/**
 * A DISTINCT quote-and-markup payload per sink, each carrying all five characters `escapeHtml`
 * handles. One shared payload string would make every per-sink assertion satisfiable by any OTHER
 * sink that happened to still carry it raw — measured during the mutation walk (M4): with one
 * shared string, escaping the heading and the paragraphs left the CTA line raw, and `text` still
 * "contained the heading" because the heading and the label were the same characters.
 */
const PAYLOADS = {
  heading: `"><script>alert('heading')&</script>`,
  body: `"><script>alert('body')&</script>`,
  label: `"><script>alert('label')&</script>`,
} as const;

const NASTY: EmailContent = {
  heading: PAYLOADS.heading,
  paragraphs: [PAYLOADS.body, "A second, harmless paragraph."],
  cta: {
    label: PAYLOADS.label,
    href: "https://fitout.example/reset?token=t1&callbackURL=%2Fdashboard",
  },
};

const verify = renderEmail(VERIFY);
const digest = renderEmail(DIGEST);
const nasty = renderEmail(NASTY);

/**
 * THE POSITIVE CONTROL, and it is a fixture rather than a mutation of the real shell because the
 * scanners must be shown catching ALL of what they claim to catch in one pass — every banned
 * construct, a duplicated preheader, and an absolute URL that is not the CTA's. It is a string; it
 * is never written to disk and no test reads it from a path.
 */
const VIOLATING_FIXTURE = [
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">',
  '<html xmlns="http://www.w3.org/1999/xhtml">',
  "<head><style>.preview{color:#ffffff}</style></head>",
  "<body>",
  '<div style="mso-hide:all">preview line one</div>',
  '<div style="mso-hide:all">preview line two</div>',
  '<a href="https://fitout.example/view-in-browser">View this in your browser</a>',
  '<div class="row" style="display:flex;float:left">',
  '<img src="https://fitout.example/pixel.gif" width="1" height="1">',
  '<div style="display:grid">two columns</div>',
  "</div>",
  '<table><tr><td><a href="https://fitout.example/cta">Do the thing</a></td></tr></table>',
  "</body></html>",
].join("");

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// GUARD THE GUARD, ASSERTED FIRST (T-15-07). Almost every assertion in this file is an ABSENCE, and
// the empty string satisfies all of them perfectly: a `renderEmail` that returned `{ html: "",
// text: "" }` would carry zero banned constructs, zero stray URLs, zero raw payloads and zero
// `mailto:`, and this file would report a clean shell forever. Same reason token-drift.test.ts
// checks its render for substance independently of what is on disk. So substance is established
// BEFORE anything is asserted absent.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("guard-the-guard: an empty render satisfies every absence below", () => {
  it("renders a document with real substance, not an empty string", () => {
    for (const [name, rendered] of [
      ["the one-action shape", verify],
      ["the ops-digest shape", digest],
    ] as const) {
      expect(
        rendered.html.length,
        `renderEmail returned ${rendered.html.length} characters of HTML for ${name}. Every ` +
          "assertion in this file below the guard block is an absence, and an empty document " +
          "satisfies all of them.",
      ).toBeGreaterThan(800);
      expect(rendered.html).toContain("<!DOCTYPE html>");
      expect(rendered.html, "the wordmark is missing — this is not a FitOut email").toContain(
        "FitOut",
      );
    }
  });

  it("renders a plain-text twin with real substance", () => {
    for (const [name, content, rendered] of [
      ["the one-action shape", VERIFY, verify],
      ["the ops-digest shape", DIGEST, digest],
    ] as const) {
      expect(
        rendered.text.length,
        `the plain-text twin of ${name} is ${rendered.text.length} characters. The parity block ` +
          "below asserts things are PRESENT in it; an empty twin fails those loudly, but the " +
          "escaping block asserts things are absent from the HTML and would pass over nothing.",
      ).toBeGreaterThan(100);
      expect(rendered.text).toContain(content.heading);
    }
  });

  it("harvests a non-empty scan from the real render", () => {
    // The three scanners whose RESULT is compared as a set. An empty harvest compares equal to an
    // empty expectation, which is the second shape of the same vacuity.
    expect(fontSizes(verify.html).length, "no font-size: value was harvested").toBeGreaterThan(0);
    expect(tableOpens(verify.html), "no <table was harvested").toBeGreaterThan(0);
    expect(SHELL_SOURCE.length, `${SHELL} read as empty`).toBeGreaterThan(2000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("EMAIL-01 — one preheader, one column, one font stack, none of the eight", () => {
  it("carries exactly one preheader block", () => {
    for (const [name, rendered] of [
      ["the one-action shape", verify],
      ["the ops-digest shape", digest],
    ] as const) {
      expect(
        preheaderCount(rendered.html),
        `${name} rendered ${preheaderCount(rendered.html)} preheader blocks. Two preheaders means ` +
          "the preview line a client shows is whichever one it happens to read first — the drift " +
          "the derived-from-the-heading default exists to remove.",
      ).toBe(1);
    }
  });

  it("declares the 600px column exactly once", () => {
    expect(
      count(verify.html, 'width="600"'),
      "the column width attribute is not declared exactly once. 15-UI-SPEC § The Email Shell pins " +
        "one 600px column; a second means a nested table has taken on layout duty.",
    ).toBe(1);
  });

  it("declares the font stack exactly once", () => {
    // A size decision as much as a consistency one: mobile clients clip a message well below the
    // desktop threshold, and an inline-styled table repeats every declaration it carries.
    expect(
      count(verify.html, "font-family"),
      `the rendered HTML declares font-family ${count(verify.html, "font-family")} times. It ` +
        "belongs on the column cell and nowhere else — see the shell's own header.",
    ).toBe(1);
  });

  it("carries none of the eight banned constructs", () => {
    for (const [name, rendered] of [
      ["the one-action shape", verify],
      ["the ops-digest shape", digest],
    ] as const) {
      expect(
        bannedConstructs(rendered.html),
        `${name} emitted a construct email cannot render. Layout is tables and inline styles here; ` +
          "there is no stylesheet, no image and no XHTML preamble. See the BANNED docblock for why " +
          "each one is on the list.",
      ).toEqual([]);
    }
  });

  it("puts role=presentation on every layout table the SHELL emits", () => {
    // The expectation is DERIVED from the fixture rather than hard-coded: `tableHtml` arrives
    // pre-built from its producer and the shell does not touch it, so whatever tables it contributes
    // are subtracted from both sides. Hard-coding "3" here would go red the day the digest's table
    // gained a row group, for a reason that has nothing to do with the shell.
    const fixtureTables = tableOpens(DIGEST.tableHtml ?? "");
    const fixtureRoles = presentationRoles(DIGEST.tableHtml ?? "");

    const shellTables = tableOpens(digest.html) - fixtureTables;
    const shellRoles = presentationRoles(digest.html) - fixtureRoles;

    expect(
      shellTables,
      "the shell emitted fewer than the two structural tables it is built from (the full-width " +
        "ground and the 600px column). An absence asserted over a document with no tables is not " +
        "an assertion.",
    ).toBeGreaterThanOrEqual(2);
    expect(
      shellRoles,
      `the shell emitted ${shellTables} tables but only ${shellRoles} carry role="presentation". A ` +
        "layout table without it is announced to a screen reader as a data table with " +
        "rows and columns nobody wrote.",
    ).toBe(shellTables);

    // …and the same, with the CTA's own nested table in play.
    expect(presentationRoles(verify.html)).toBe(tableOpens(verify.html));
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("T-15-04 — no absolute link precedes the CTA href", () => {
  it("makes the CTA href the FIRST absolute URL in the document", () => {
    const href = escapeHtml(VERIFY.cta!.href);
    expect(
      firstAbsoluteUrlIndex(verify.html),
      "an absolute URL appears in the rendered HTML before the CTA href. This is the " +
        "security-relevant one: tests/helpers/mocks.ts's `extractLink` takes the FIRST " +
        "https?:// match in the body and three shipped auth tests feed that string to " +
        "`new URL(...)` to recover a verify/reset token. A doctype's specification URL, an " +
        "xmlns attribute, a view-in-browser link, a tracking pixel or a linked wordmark would all " +
        "be handed to those tests AS THOUGH THEY WERE THE RESET LINK — and the failure surfaces " +
        'three layers away as a bogus "invalid token". Do not reintroduce the boilerplate.',
    ).toBe(verify.html.indexOf(href));
    expect(verify.html.indexOf(href)).toBeGreaterThan(-1);
  });

  it("emits no absolute URL at all when there is no CTA", () => {
    expect(
      verify.html.match(/https?:\/\/[^\s"'<>)]+/g)?.length,
      "the one-action shape rendered more than one absolute URL. A second link is a second thing " +
        "`extractLink` could pick up if the CTA ever moves down the document.",
    ).toBe(1);
    expect(
      digest.html.match(/https?:\/\//g) ?? [],
      "the CTA-less shape rendered an absolute URL. With no CTA there is no link to extract, so " +
        "any URL here is by definition one `extractLink` would return wrongly.",
    ).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("EMAIL-01 — the plain-text twin carries what the HTML carries", () => {
  it("carries every paragraph raw in text and escaped in html", () => {
    for (const [name, content, rendered] of [
      ["the one-action shape", VERIFY, verify],
      ["the ops-digest shape", DIGEST, digest],
    ] as const) {
      for (const paragraph of content.paragraphs) {
        expect(
          rendered.text,
          `${name}: a paragraph is missing from the plain-text twin. The twin is a PROJECTION of ` +
            "the same value, not a stripped copy of the HTML — if it is built by stripping tags " +
            "this is where that shows up.",
        ).toContain(paragraph);
        expect(
          rendered.html,
          `${name}: a paragraph is missing from the HTML in its escaped form.`,
        ).toContain(escapeHtml(paragraph));
        if (escapeHtml(paragraph) !== paragraph) {
          expect(
            rendered.html,
            `${name}: a paragraph appears RAW in the HTML. It contains a character escapeHtml ` +
              "handles, so its presence unescaped means it reached markup through a path that " +
              "does not go via the choke point.",
          ).not.toContain(paragraph);
        }
      }
    }
  });

  it("carries the heading raw in text and escaped in html", () => {
    for (const [content, rendered] of [
      [VERIFY, verify],
      [DIGEST, digest],
    ] as const) {
      expect(rendered.text).toContain(content.heading);
      expect(rendered.html).toContain(escapeHtml(content.heading));
    }
  });

  it("carries the table's plain-text twin whenever it carries the table", () => {
    expect(digest.html).toContain(DIGEST.tableHtml);
    expect(
      digest.text,
      "the digest's table rendered in HTML but its tableText did not reach the plain-text twin — " +
        "a text/plain reader silently loses the entire body of that message.",
    ).toContain(DIGEST.tableText);
  });

  it("carries a `{label}: {raw href}` line in the text part", () => {
    const cta = VERIFY.cta!;
    expect(
      verify.text,
      "the plain-text twin has no usable link. A text/plain reader has no button to press, so the " +
        "href must appear as literal text — and RAW, because an escaped URL in text/plain is a " +
        "defect: the reader's linkifier would carry the entities into the address bar.",
    ).toContain(`${cta.label}: ${cta.href}`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("WR-01 / T-15-02 — every caller-supplied sink is escaped, the preheader included", () => {
  it("emits no payload raw anywhere in the whole document", () => {
    for (const [sink, payload] of Object.entries(PAYLOADS)) {
      expect(
        nasty.html.includes(payload),
        `the ${sink} sink's quote-and-markup payload reached the rendered HTML unescaped. ` +
          "Heading, paragraphs, CTA label and CTA href are all caller-supplied and all pass " +
          "through one choke point; a raw occurrence means a composition site interpolated " +
          "around it.",
      ).toBe(false);
    }
  });

  it("emits the payload nowhere raw in the PREHEADER region specifically", () => {
    // T-15-02. The preheader is DERIVED from content and injected into a div, which makes it an
    // injection sink in the one element nobody ever reads. The document-wide assertion above would
    // catch this too — it is asserted separately anyway, because the whole-document form would go
    // green the day the preheader stopped being rendered at all, and the region slice cannot.
    const start = nasty.html.indexOf('<div style="display:none');
    const end = nasty.html.indexOf("</div>", start);
    expect(start, "no preheader div was found to scan").toBeGreaterThan(-1);
    const region = nasty.html.slice(start, end);
    expect(region.length, "the preheader region sliced empty").toBeGreaterThan(50);
    expect(
      region.includes(PAYLOADS.heading),
      "the derived preheader carried caller markup RAW. 15-RESEARCH § Pitfall 2: this is the " +
        "escape site the spec's own sentence does not name. The preheader defaults to the " +
        "heading, so the heading's payload is what lands here.",
    ).toBe(false);
    expect(region).toContain(escapeHtml(PAYLOADS.heading));
  });

  it("emits the escaped forms of all four sinks", () => {
    expect(nasty.html).toContain(escapeHtml(NASTY.heading));
    expect(nasty.html).toContain(escapeHtml(NASTY.paragraphs[0]));
    expect(nasty.html).toContain(escapeHtml(NASTY.cta!.label));
    expect(nasty.html).toContain(escapeHtml(NASTY.cta!.href));
  });

  it("does NOT escape the plain-text twin — escaping text/plain would be the defect", () => {
    // Asserted rather than assumed. An implementation that ran escapeHtml over both projections
    // would satisfy every absence above while mailing `&#39;` to every plain-text reader, and a
    // gate that forbade the raw payload in `text` would have PINNED that bug.
    //
    // Each sink is named separately rather than asserting the payload appears "somewhere" in the
    // twin. Measured during the mutation walk (M4): mapping escapeHtml over the heading and
    // paragraphs left the CTA line untouched, so a single `toContain(PAYLOAD)` stayed GREEN over a
    // twin whose heading and body had both been entity-encoded.
    for (const [sink, raw] of [
      ["the heading", NASTY.heading],
      ["a paragraph", NASTY.paragraphs[0]],
      ["the CTA line", `${NASTY.cta!.label}: ${NASTY.cta!.href}`],
    ] as const) {
      expect(
        nasty.text,
        `${sink} was escaped in the plain-text twin. HTML entities in text/plain are not safety, ` +
          "they are mojibake — the raw string is correct here, and an escaped href would carry " +
          "its entities into the reader's address bar.",
      ).toContain(raw);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("15-UI-SPEC § Type — exactly five font sizes, and no send may add a sixth", () => {
  it("emits the five declared sizes and nothing else", () => {
    // The four type roles the spec's table declares — wordmark 18, heading 20, body (and CTA
    // label) 16, footer/label 14 — plus the 1px the preheader's suppression recipe uses. Named as
    // a set rather than counted, because a send that added its own size would land as a sixth
    // member and a count of "5 declarations" would not notice.
    expect(
      fontSizes(verify.html),
      "the rendered email carries a font-size the spec does not declare. Every size is a module " +
        "constant in the shell (15-UI-SPEC § Type: *no send passes a size of its own*); a new one " +
        "means a composition site is styling, which is the drift the shell exists to prevent.",
    ).toEqual(["14px", "16px", "18px", "1px", "20px"]);
  });

  it("uses the same five for a message with no CTA", () => {
    expect(new Set(fontSizes(digest.html))).toEqual(
      new Set(["1px", "14px", "16px", "18px", "20px"]),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-26 — the support slot is guarded, and the guard exists in source", () => {
  it("renders no mailto: while SUPPORT_EMAIL is null", () => {
    for (const rendered of [verify, digest, nasty]) {
      expect(
        count(rendered.html, "mailto:"),
        "a support address rendered while the app has no monitored inbox. D-26: nothing false " +
          "ships — no placeholder, no dead link, no \"coming soon\".",
      ).toBe(0);
    }
  });

  it("has the guard in source exactly once, with no else-branch", () => {
    // A rendered absence ALONE cannot tell "guarded, and the constant is currently null" apart from
    // "never implemented" — both render zero `mailto:`. So the shape is read from source, the same
    // way site-contacts.test.ts reads the footer's. Comments are stripped first: this file's own
    // prose says the word `else` several times and the shell's header says it once.
    const code = stripComments(SHELL_SOURCE);
    expect(
      count(code, "SUPPORT_EMAIL !== null"),
      `${SHELL} does not carry the support guard exactly once. Zero means the slot was never ` +
        "built and the zero-mailto assertion above is passing for the wrong reason; two means " +
        "there are two places to update the day the constant becomes a string.",
    ).toBe(1);
    expect(
      count(code, "mailto:"),
      `${SHELL} writes ${count(code, "mailto:")} mailto: literals. There is one slot.`,
    ).toBe(1);
    expect(
      /\belse\b/.test(code),
      `${SHELL} carries an else-branch. The support slot is one guarded expression whose false ` +
        "branch is the bare null keyword — an else is where a placeholder address gets written.",
    ).toBe(false);
    // The false branch really is `null`, and the mailto really is inside the guarded branch.
    const guardIndex = code.indexOf("SUPPORT_EMAIL !== null");
    const mailtoIndex = code.indexOf("mailto:");
    expect(mailtoIndex).toBeGreaterThan(guardIndex);
    expect(code.slice(guardIndex).replace(/\s+/g, " ")).toMatch(/: null;/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("positive control — every scanner catches the class of defect it claims to", () => {
  it("catches all eight banned constructs on a violating fixture", () => {
    // 13-05's finding, applied: a scanner whose list of things-to-catch was never shown catching
    // one of them reports a clean file forever. The fixture is a STRING and is never written to
    // disk — nothing here reads a path.
    expect(bannedNeedles(VIOLATING_FIXTURE).sort()).toEqual([...BANNED].sort());
  });

  it("catches a duplicated preheader", () => {
    expect(preheaderCount(VIOLATING_FIXTURE)).toBe(2);
    expect(preheaderCount(verify.html)).toBe(1);
  });

  it("catches an absolute URL that precedes the CTA href", () => {
    // In the fixture the first absolute URL is the XHTML namespace — a specification document's
    // address, which is EXACTLY what a legacy preamble would hand to `extractLink` in place of a
    // reset link. The scanner must not report it as the CTA.
    const ctaIndex = VIOLATING_FIXTURE.indexOf("https://fitout.example/cta");
    expect(ctaIndex).toBeGreaterThan(-1);
    expect(firstAbsoluteUrlIndex(VIOLATING_FIXTURE)).toBe(
      VIOLATING_FIXTURE.indexOf("http://www.w3.org/1999/xhtml"),
    );
    expect(firstAbsoluteUrlIndex(VIOLATING_FIXTURE)).not.toBe(ctaIndex);
  });

  it("reports an empty harvest for a document with no type at all", () => {
    // The fixture declares no font-size anywhere. This is the vacuity the guard-the-guard block at
    // the top exists to reject: a set comparison against an empty harvest passes trivially.
    expect(fontSizes(VIOLATING_FIXTURE)).toEqual([]);
    expect(fontSizes(verify.html).length).toBe(5);
  });

  it("counts a layout table that is missing its presentation role", () => {
    expect(tableOpens(VIOLATING_FIXTURE)).toBe(1);
    expect(presentationRoles(VIOLATING_FIXTURE)).toBe(0);
  });
});
