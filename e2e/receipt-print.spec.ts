import { expect, test, type Locator, type Page } from "@playwright/test";

import { BASE, seedBookableListing, signUpBooker, type SeededListing } from "./helpers/booker-seed";
import { seedPaymentStates, type SeededPaymentStates } from "./helpers/seed-payment-states";
import { seedTheme } from "./helpers/theme";
import { THEMES as DECLARED_THEMES, type ThemeName } from "../src/components/theme/theme-provider";

// TRUST-05 / D-74 / 13-UI-SPEC § The Print Contract — THE REPO'S FIRST PRINT-MEDIA SPEC.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY PRINT IS A REAL MEDIUM HERE, AND WHAT THE FIVE ASSERTIONS ARE ACTUALLY GUARDING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The receipt is the only surface in the product designed for a screen AND for paper, and D-74 makes the
// browser's own print dialog the entire PDF pipeline. So "it prints" is a shipped feature with no library
// behind it and nothing but CSS deciding whether the artefact is usable.
//
// 13-RESEARCH § Pitfall 3 names the failure precisely, and it is not a cosmetic one: the CSS property
// governing whether a printer reproduces backgrounds starts at its ECONOMY value and Chrome's "Background
// graphics" box is off by default, so filled surfaces drop their fill while their FOREGROUND ink keeps
// whatever colour it had. A control designed as near-white text on a filled rectangle therefore prints as
// near-white text on white paper — present in the document, legible to nobody. The status pill is exactly
// that shape, which is why the contract replaces it with a WORD rather than trusting it to survive.
//
// (That property is named descriptively in this paragraph rather than spelled. `tests/design/*` runs a raw
// count over `src/` expecting ZERO occurrences of it, and 13-12's summary records the same collision being
// closed twice in the source files. It IS spelled once below, in the assertion that queries for it — this
// file is under `e2e/`, outside that scan's tree, and an assertion cannot ask for a property it may not
// name.)
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ASSERTION 2 IS A *RENDERING* ASSERTION, WHICH IS THE POINT OF IT BEING HERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// GATE-STATES asks for a rendering assertion in a real browser, and this is the class of property jsdom
// cannot produce at all: jsdom has no layout, so every `boundingBox()` in it is zero and every media query
// is whatever the test says it is. "The reference still occupies a box when the page is printed" is only
// meaningful measured — and the accessibility half is measured against the SAME rendered tree, so an
// element suppressed for print is absent from both answers together rather than by two mechanisms
// agreeing.
//
// The a11y half is read through `locator.ariaSnapshot()` — the browser's own accessibility tree for the
// receipt subtree, not a proxy for it. An element with `display: none` is not in that tree, which is what
// makes the print-suppressed control's ABSENCE from it a real assertion rather than a restatement of the
// computed style already asserted above.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY EVERY CHECK RUNS IN BOTH DIRECTIONS (`reduced-motion.spec.ts`'s rule, for its measured reason)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file's header records four traps, and the first is the one this spec inherits wholesale: emulation
// that silently did not apply produces a GREEN result against a page where nothing was under test. A spec
// that asserts "the header is hidden" without ever entering print media is satisfied by a header that was
// never there — a broken selector, a 404, a redirect to `/login`.
//
// Two mechanisms close it, and both are needed:
//
//   • `expectPrintMedia` asserts `matchMedia("print").matches` on the page itself, so emulation is
//     ASSERTED rather than assumed;
//   • every suppression assertion has a SCREEN-MEDIA TWIN in the same run, on the same document. The
//     header, the footer, the copy control and the status pill are asserted VISIBLE first and hidden
//     after. A spec that emulated nothing would fail the second half; a spec whose selectors are wrong
//     fails the first.
//
// The theme is asserted the same way and for the same reason. `helpers/theme.ts`'s own header warns that a
// seam that seeds a key the provider does not read is a SILENT no-op — the run would audit `court` twice
// and report full two-theme coverage — so `data-theme` is read back off the document before anything is
// measured under it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ENVIRONMENT BOUNDARY (D-35)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `DATABASE_URL` and nothing else. The fixture is a `confirmed` row whose money columns the seed wrote, and
// `receipt/page.tsx` admits it on the row's own columns; no payment provider is called and no key is read.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE STILL CANNOT PROVE — AND 13-VALIDATION KEEPS IT MANUAL FOR THIS REASON
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `emulateMedia` proves the STYLESHEET APPLIES. It does not prove a printed page is legible: it does not
// paginate, does not rasterise, does not know the printer's margins and cannot see contrast. The manual
// check stands — print to PDF in both themes, confirm no solid flood and that the reference and the total
// are readable. This spec makes that check cheap by guaranteeing everything mechanical about it first.

/**
 * The themes this file actually drives — one `test()` body each, named below.
 *
 * Written out by hand rather than looped over `THEMES`, so a failure says WHICH theme failed instead of
 * naming an index. The cost of writing it out is that the list can fall behind the provider's, which is
 * what the last assertion in this file exists to catch: it compares THIS list against the imported one.
 * Both themes are LIGHT (13-UI-SPEC) — `--card` is `#ffffff` in court and grove alike — so neither prints
 * as a flood, and the contract holds identically rather than by two coincidences.
 */
const COVERED_THEMES: readonly ThemeName[] = ["court", "grove"];

/** The itemisation terms the print contract requires to survive, as they are rendered. */
const ITEMISATION_TERMS = ["Space cost", "Service fee", "Total"] as const;

test.describe("TRUST-05 — the receipt survives being printed, in both themes", () => {
  test.describe.configure({ mode: "serial" });

  let seed: SeededListing;
  let payStates: SeededPaymentStates | null = null;
  let ownerEmail: string;
  let bookingId: string;

  test.beforeAll(async () => {
    seed = await seedBookableListing({ titlePrefix: "E2E Receipt Print" });
  });

  test.afterAll(async () => {
    await payStates?.teardown();
    await seed.teardown();
  });

  /** See `receipt-parity.spec.ts` — the session does not cross a test boundary. */
  async function logInAs(page: Page, email: string): Promise<void> {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("averylongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  }

  /** Fail loudly if media emulation silently did not apply — `reduced-motion.spec.ts` trap 1. */
  async function expectPrintMedia(page: Page, shouldMatch: boolean): Promise<void> {
    const matches = await page.evaluate(() => matchMedia("print").matches);
    expect(
      matches,
      `print emulation did not reach the page (expected matchMedia("print").matches = ${shouldMatch}). ` +
        `Every assertion below this line would then be measuring the SCREEN rendering while claiming to ` +
        `measure the printed one — green, and about nothing.`,
    ).toBe(shouldMatch);
  }

  /** And fail loudly if the theme seam silently did not apply — `helpers/theme.ts`'s own warning. */
  async function expectTheme(page: Page, theme: ThemeName): Promise<void> {
    const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(
      applied,
      `the theme seam seeded "${theme}" and the document resolved "${applied}". A run that reports ` +
        `two-theme coverage while rendering one theme twice is the silent no-op helpers/theme.ts exists ` +
        `to prevent, and it has no other symptom.`,
    ).toBe(theme);
  }

  /** The computed `display` of the one element a locator resolves to. */
  async function displayOf(locator: Locator): Promise<string> {
    return locator.evaluate((el) => getComputedStyle(el).display);
  }

  /**
   * ⚠ WHY SUPPRESSION IS MEASURED WITH `checkVisibility()` AND A NULL BOX, NOT WITH COMPUTED `display`.
   *
   * MEASURED, not reasoned about — this file's first draft asserted `getComputedStyle(pill).display ===
   * "none"` and went RED on correct code, reporting `inline-flex`. The cause is that computed `display` is
   * an element's OWN value: an element inside a `display: none` ancestor is not rendered at all, and still
   * computes whatever its own rules say. `receipt/page.tsx` puts `print:hidden` on the `<span>` WRAPPING
   * the badge (the badge is a shared component and DS-11 keeps its box out of a call site's hands), so the
   * pill genuinely does not print while reporting `inline-flex` forever.
   *
   * The direction of that mistake is the dangerous one in the mirror image: had the contract been written
   * with the rule on a wrapper for the HEADER too, the computed-display assertion would have gone GREEN
   * for the wrong reason on any element whose own rule happened to say `none` — and this spec would have
   * been measuring where a class is written rather than whether anything prints.
   *
   * `checkVisibility()` is the browser's own answer to "is this rendered", and it accounts for ancestors.
   * The null bounding box is Playwright's independent answer to the same question. Both are asserted,
   * because the property under test is that the element is NOT ON THE PRINTED SHEET.
   */
  async function expectNotRendered(locator: Locator, what: string): Promise<void> {
    const visible = await locator.evaluate((el) => el.checkVisibility());
    expect(
      visible,
      `${what} is still RENDERED in print media. Whatever computed style says, the browser's own ` +
        `visibility answer is what lands on paper.`,
    ).toBe(false);
    expect(
      await locator.boundingBox(),
      `${what} still occupies a box in print media, so it prints — the two answers must agree, and ` +
        `Playwright's is the one measured against the rendered layout.`,
    ).toBeNull();
  }

  /** The same question, the other way round. */
  async function expectRendered(locator: Locator, what: string): Promise<void> {
    const visible = await locator.evaluate((el) => el.checkVisibility());
    expect(visible, `${what} is not rendered, and it must be.`).toBe(true);
    expect(await locator.boundingBox(), `${what} occupies no box, and it must.`).not.toBeNull();
  }

  /** Every element under a locator that may resolve to many, answered for rendering rather than style. */
  async function renderedCount(locator: Locator): Promise<number> {
    return locator.evaluateAll((els) => els.filter((el) => el.checkVisibility()).length);
  }

  /**
   * A `<dd>` addressed through the `<dt>` that names it.
   *
   * The `<dl>` rows carry no per-row hook and should not grow one: the term IS the label, and a hook per
   * row would be four ids declared to say what four words already say. `following-sibling::dd[1]` is the
   * association the markup already asserts for assistive tech, used here for the same reason.
   */
  function valueFor(receipt: Locator, term: string): Locator {
    return receipt
      .locator("dt", { hasText: new RegExp(`^${term}$`) })
      .locator("xpath=following-sibling::dd[1]");
  }

  /** Non-zero box: the assertion that an element still OCCUPIES the printed page. */
  async function expectNonZeroBox(locator: Locator, what: string): Promise<void> {
    const box = await locator.boundingBox();
    expect(
      box,
      `${what} has no bounding box at all under print media, which means it computed display:none. The ` +
        `print contract suppresses the CHROME and the CONTROLS; everything that makes the sheet a record ` +
        `of a booking has to survive, or the printed artefact is a page of headings.`,
    ).not.toBeNull();
    expect(box!.width, `${what} printed at zero width`).toBeGreaterThan(0);
    expect(box!.height, `${what} printed at zero height`).toBeGreaterThan(0);
  }

  /**
   * ONE THEME, THE WHOLE CONTRACT — screen first, print second, screen again.
   *
   * Written as a function rather than duplicated per theme so the two runs cannot drift, and called from
   * two `test()` bodies rather than looped inside one so a failure names which theme failed.
   */
  async function runPrintContract(page: Page, theme: ThemeName): Promise<void> {
    await page.goto(`${BASE}/bookings/${bookingId}/receipt`, { waitUntil: "networkidle" });
    await expectTheme(page, theme);

    const receipt = page.getByTestId("receipt");
    await expect(
      receipt,
      `${theme}: the receipt did not render at all, so every assertion below would be about the ` +
        `not-found boundary. Check the sign-in above before suspecting the print contract.`,
    ).toHaveCount(1);

    const header = page.getByTestId("site-header");
    const footer = page.getByTestId("site-footer");
    const controls = receipt.locator("button, [role=button]");
    const pill = receipt.locator('[data-slot="badge"]');
    // `hidden print:inline` — the word that replaces the pill on paper. Addressed by the utility that IS
    // the behaviour under test rather than by its text, which varies with the derived status.
    const statusWord = receipt.locator('span[class~="print:inline"]');

    // ── GUARD THE GUARDS. Every suppression assertion below is satisfied by an element that does not
    //    exist, so the counts come first. `controls` in particular: "every button inside the receipt is
    //    hidden" is vacuously true of a receipt with no buttons, and the copy control is the only one
    //    today — if it were ever removed this spec would keep reporting that controls are suppressed.
    await expect(
      header,
      `${theme}: no site-header on the receipt route, so "the chrome disappears in print" has nothing to ` +
        `disappear.`,
    ).toHaveCount(1);
    await expect(footer, `${theme}: no site-footer on the receipt route`).toHaveCount(1);
    expect(
      await controls.count(),
      `${theme}: the receipt renders ZERO controls, so assertion 1's control half is vacuous. The copy ` +
        `control on the reference is the one this route ships; if it moved, point this at what replaced ` +
        `it rather than deleting the assertion.`,
    ).toBeGreaterThan(0);
    await expect(pill, `${theme}: no status badge inside the receipt`).toHaveCount(1);
    await expect(statusWord, `${theme}: no print-only status word inside the receipt`).toHaveCount(1);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // DIRECTION 1 — SCREEN MEDIA. The control that makes an unemulated run impossible to pass.
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    await page.emulateMedia({ media: "screen" });
    await expectPrintMedia(page, false);

    await expectRendered(
      header,
      `${theme}: the site header on SCREEN — print:hidden compiles only inside @media print, so its ` +
        `absence here is not the print contract leaking, it is the header genuinely gone from the shell`,
    );
    await expectRendered(footer, `${theme}: the site footer on screen`);
    expect(
      await renderedCount(controls),
      `${theme}: a control inside the receipt is hidden on SCREEN. The copy control is how a booker gets ` +
        `the reference into a message; suppressing it on screen would be the print rule applied to the ` +
        `wrong medium.`,
    ).toBe(await controls.count());
    await expectRendered(pill, `${theme}: the status pill on screen`);
    await expectNotRendered(
      statusWord,
      `${theme}: the print-only status word on SCREEN — if it renders here the pill and the word both ` +
        `show and the status is stated twice`,
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // DIRECTION 2 — PRINT MEDIA. The five falsifiable items, in 13-UI-SPEC's order.
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    await page.emulateMedia({ media: "print" });
    await expectPrintMedia(page, true);

    // ── 1. The chrome and every control leave the printed page. ────────────────────────────────────
    await expectNotRendered(
      header,
      `${theme}: the site header in print media — a printed receipt carrying the app's navigation is a ` +
        `sheet of links nobody can click, and it pushes the record itself down the page`,
    );
    // The rule is on the header and the footer THEMSELVES, so computed display is also asserted: it says
    // WHERE the suppression lives, which `checkVisibility()` deliberately cannot. If a later refactor
    // moved `print:hidden` onto a wrapper the element would still not print and this line would go red —
    // which is the correct outcome, because the contract names these two elements by name.
    expect(
      await displayOf(header),
      `${theme}: the site header does not print, but the rule that hides it is no longer ON the header. ` +
        `The print contract names site-chrome.tsx's <header> and site-footer.tsx's <footer> as the two ` +
        `elements carrying print:hidden; a wrapper doing it instead is a contract change, not a refactor.`,
    ).toBe("none");
    await expectNotRendered(
      footer,
      `${theme}: the site footer in print media — it carries the legal and support links, and a page of ` +
        `them prints after every receipt`,
    );
    expect(await displayOf(footer), `${theme}: print:hidden is no longer on the footer itself`).toBe(
      "none",
    );
    expect(
      await renderedCount(controls),
      `${theme}: ${await renderedCount(controls)} of ${await controls.count()} controls inside the ` +
        `receipt still render in print media. The suppression is written as a CLOSED SET on the article ` +
        `(print:[&_button]:hidden print:[&_a]:hidden) precisely so a control added later is caught by it ` +
        `— a non-zero count here means something escaped that set, or the set was narrowed. A button on ` +
        `paper is a rectangle of ink that does nothing.`,
    ).toBe(0);

    // ── 2. The record itself keeps a box, and stays in the accessibility tree. ─────────────────────
    await expectNonZeroBox(page.getByTestId("booking-reference"), `${theme}: the booking reference`);
    await expectNonZeroBox(page.getByTestId("receipt-total"), `${theme}: the receipt total`);
    for (const term of ITEMISATION_TERMS) {
      await expectNonZeroBox(valueFor(receipt, term), `${theme}: the "${term}" figure`);
    }
    await expectNonZeroBox(valueFor(receipt, "Space"), `${theme}: the venue`);
    await expectNonZeroBox(valueFor(receipt, "When"), `${theme}: the date and time`);

    // The accessibility tree of the printed subtree — the browser's own, not a proxy for it.
    const printedTree = await receipt.ariaSnapshot();
    const reference = ((await page.getByTestId("booking-reference").textContent()) ?? "").trim();
    expect(
      reference,
      `${theme}: the booking reference element rendered empty text, so the tree assertion below would ` +
        `search for the empty string and find it in anything.`,
    ).toMatch(/^FIT-/);
    expect(
      printedTree,
      `${theme}: the reference "${reference}" is absent from the receipt's accessibility tree under ` +
        `print media. A sheet whose reference is not in the tree is a sheet a screen reader cannot read ` +
        `back, and it is the one string on the document a booker quotes down a phone (TRUST-02).`,
    ).toContain(reference);
    const total = ((await page.getByTestId("receipt-total").textContent()) ?? "").trim();
    expect(
      printedTree,
      `${theme}: the total "${total}" is absent from the receipt's accessibility tree under print media.`,
    ).toContain(total);
    // …and the control's absence from that SAME tree, which is what makes the two assertions above a
    // measurement rather than a restatement of "the snapshot is a long string".
    expect(
      printedTree,
      `${theme}: the copy control is still in the accessibility tree under print media, even though its ` +
        `computed display is none. Two answers about one element that disagree mean this tree is not the ` +
        `printed rendering, and the assertions above are about the screen.`,
    ).not.toContain("Copy booking reference");

    // ── 3. The status word survives; the pill does not. ────────────────────────────────────────────
    await expectNotRendered(
      pill,
      `${theme}: the status PILL in print media — backgrounds drop on paper, so a filled badge prints as ` +
        `an empty outline at best and as invisible ink at worst (13-RESEARCH Pitfall 3). The pill's ` +
        `meaning is in its shape and fill; on paper the word carries it. NOTE: the rule lives on the ` +
        `<span> wrapping the badge, so this element's own computed display reads inline-flex either way ` +
        `— see expectNotRendered's docblock before "fixing" this assertion`,
    );
    await expectRendered(
      statusWord,
      `${theme}: the printed status word — without it the sheet states no status at all, and a receipt ` +
        `that does not say whether the booking stands is the document's whole purpose missing`,
    );
    await expectNonZeroBox(statusWord, `${theme}: the printed status word`);
    expect(
      ((await statusWord.textContent()) ?? "").trim(),
      `${theme}: the printed status word is empty. It comes from the same derivation as the pill, so an ` +
        `empty string here means the word and the pill can disagree.`,
    ).not.toBe("");

    // ── 4. Nothing inside the receipt forces exact colour reproduction. ───────────────────────────
    //
    // Scoped to the article rather than the document, and that is a correction 13-12 handed forward:
    // vendored Leaflet CSS ships the forcing declaration on `.leaflet-control`, in node_modules, outside
    // this subtree. A document-wide query would go red on a stylesheet this contract does not govern.
    const adjustValues = await receipt.evaluateAll((articles) => {
      const root = articles[0];
      if (!root) return [] as string[];
      return [root, ...Array.from(root.querySelectorAll("*"))].map((el) =>
        getComputedStyle(el as Element).getPropertyValue("print-color-adjust").trim(),
      );
    });
    // VACUITY FIRST. If the engine does not know the property, every value is the empty string and the
    // ban below is green against a query that asked nothing.
    expect(
      adjustValues.filter((v) => v !== "").length,
      `${theme}: not one element inside the receipt reported a value for the colour-adjust property, so ` +
        `the ban below is green against a query the engine did not understand. Check the property name ` +
        `against the browser before trusting this assertion again.`,
    ).toBeGreaterThan(0);
    expect(
      adjustValues.filter((v) => v === "exact").length,
      `${theme}: ${adjustValues.filter((v) => v === "exact").length} elements inside the receipt force ` +
        `exact colour reproduction. The contract's "Never" row: forcing it costs the booker ink and buys ` +
        `nothing on a document whose job is to be legible as ink on white.`,
    ).toBe(0);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // DIRECTION 3 — BACK IN SCREEN MEDIA, AND ASSERTION 5 AT 320px.
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    //
    // `print:max-w-none print:px-0 print:py-0` opens the measure up on paper. If any of it leaked out of
    // `@media print` the screen page would lose its page padding and its centred column, and the first
    // place that shows is the narrowest viewport the product supports.
    await page.emulateMedia({ media: "screen" });
    await expectPrintMedia(page, false);
    await expectRendered(
      header,
      `${theme}: the site header after returning to SCREEN media — if it is still hidden here then what ` +
        `hid it was not the print emulation, and everything asserted under print above is about a page ` +
        `that was already in that state`,
    );

    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 320, height: 800 });
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${theme}: the receipt overflows horizontally at 320px — scrollWidth ${overflow.scrollWidth} against ` +
        `clientWidth ${overflow.clientWidth}. The print contract's measure rules are print-scoped by ` +
        `construction; a screen overflow here means one of them escaped @media print.`,
    ).toBeLessThanOrEqual(overflow.clientWidth);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }

  test("(1) court — the print contract holds, with a screen-media control", async ({ page }) => {
    test.setTimeout(120_000);

    await seedTheme(page.context(), "court");
    ownerEmail = await signUpBooker(page, seed);
    const [{ id: bookerId }] = await seed.sql<{ id: string }[]>`
      SELECT id FROM "user" WHERE email = ${ownerEmail}
    `;
    payStates = await seedPaymentStates(seed, bookerId, { idPrefix: "e2e_print" });
    bookingId = payStates.bookingIds.confirmed;

    await runPrintContract(page, "court");
  });

  test("(2) grove — the same contract, the other theme", async ({ page }) => {
    test.setTimeout(120_000);

    expect(
      payStates,
      "the payment-state fixture is null, so case 1 did not reach its seed. A null here is a failure of " +
        "that case, not of this one.",
    ).not.toBeNull();

    await seedTheme(page.context(), "grove");
    await logInAs(page, ownerEmail);
    await runPrintContract(page, "grove");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// AND THE COVERAGE CLAIM ITSELF, ASSERTED AGAINST THE PROVIDER RATHER THAN AGAINST THIS FILE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// "Both themes" is a claim about a set, and the set is declared in `theme-provider.tsx` — not here. Two
// hand-written cases can silently become two-of-three the day a third theme ships, and nothing about this
// file would change: it would keep passing and keep reporting full coverage. Comparing the local list to a
// literal spelled in the same file would be a tautology, so the imported constant is one side of this.
test("both themes means every theme the provider declares", () => {
  expect(
    [...DECLARED_THEMES],
    `theme-provider.tsx declares ${DECLARED_THEMES.length} themes and this file drives ` +
      `${COVERED_THEMES.length} (${COVERED_THEMES.join(", ")}). The print contract is a per-theme ` +
      `property — 13-UI-SPEC's forward rule is that the receipt never relies on a painted background in ` +
      `ANY theme — so a new theme needs its own case here, not a wider loop over a list this file no ` +
      `longer matches.`,
  ).toEqual([...COVERED_THEMES]);
});
