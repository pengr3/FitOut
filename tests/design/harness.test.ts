import { describe, it, expect } from "vitest";
import { wcagContrast, inGamut, formatHex, converter } from "culori";

// GUARD THE HARNESS. This file is the positive control for the entire design gate.
//
// It proves two things that every other test in tests/design/** silently assumes:
//
//   1. The DB-FREE CONFIG ACTUALLY RAN. `vitest.design.config.ts` declares no `globalSetup` and no
//      `setupFiles`, so this suite must go green with Docker stopped and no Postgres reachable. If
//      that ever stops being true, this file is where it shows up first.
//   2. THE COLOUR AUTHORITY RESOLVES. D-12 makes `culori` the single source of truth for OKLCH →
//      contrast/gamut math — a hand-rolled OKLab solver was explicitly rejected. Every contrast,
//      gamut and token-drift assertion in this phase bottoms out in these four functions.
//
// If this file is red, no other design test's result means anything: a green suite next to a broken
// harness is the vacuous pass this phase exists to make impossible (threat T-10-06). Fix this first.
describe("design gate harness", () => {
  it("resolves culori's colour primitives as callable functions", () => {
    expect(typeof wcagContrast).toBe("function");
    expect(typeof inGamut).toBe("function");
    expect(typeof formatHex).toBe("function");
    expect(typeof converter).toBe("function");
  });

  it("computes the canonical white-on-black contrast ratio of 21:1", () => {
    // The maximum achievable WCAG contrast ratio. A wrong number here means culori resolved to
    // something that is not culori, or its colour parsing is broken — either way, every
    // contrast-pair assertion downstream is worthless.
    expect(Math.round(wcagContrast("#ffffff", "#000000"))).toBe(21);
  });
});
