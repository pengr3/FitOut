// T7 (07-20) — formatMoney must ALWAYS render two fraction digits.
//
// The reported UAT nit: the shared formatter dropped a trailing zero, so ₱307.50 rendered "₱307.5" and
// ₱300.00 rendered "₱300" — because `minimumFractionDigits` was 0. Since formatMoney is the ONE formatter
// every price surface imports (checkout summary, cancelled-state copy, the refundLabel notification
// payload, the listing cards), pinning it here fixes all of them at once.
//
// Assertions match on the DECIMAL SUBSTRING, not the whole localized string, so the test is robust to the
// ICU currency symbol / locale the runner happens to use — the property under test is "two decimals
// always", not "this exact glyph".

import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/money";

describe("formatMoney — always two fraction digits (T7)", () => {
  it("renders a trailing-zero half-peso as .50, never .5", () => {
    expect(formatMoney(30750, "php")).toMatch(/307\.50/);
    expect(formatMoney(30750, "php")).not.toMatch(/307\.5$/);
  });

  it("renders a whole peso as .00, never a bare integer", () => {
    expect(formatMoney(30000, "php")).toMatch(/300\.00/);
    expect(formatMoney(30000, "php")).not.toMatch(/300$/);
  });

  it("leaves an already-two-decimal amount unchanged", () => {
    expect(formatMoney(64575, "php")).toMatch(/645\.75/);
  });

  it("renders zero as 0.00", () => {
    expect(formatMoney(0, "php")).toMatch(/0\.00/);
  });

  it("an unrecognized-but-well-formed code still renders two decimals via the Intl path", () => {
    // "ZZZ" is a well-formed 3-letter code Intl does NOT reject — it renders the code as the symbol
    // ("ZZZ 307.50") rather than throwing, so the 2-decimal rule must still hold on this path.
    expect(formatMoney(30750, "zzz")).toMatch(/307\.50/);
  });

  it("the malformed-currency CATCH fallback returns a bare fixed-2 string", () => {
    // A non-ISO code (not 3 ASCII letters) makes Intl.NumberFormat throw a RangeError → the catch
    // fallback ((cents/100).toFixed(2)) applies, and it too is fixed at 2 digits.
    expect(formatMoney(30750, "x")).toBe("307.50");
  });
});
