// AUTH-02 / D-12: sessions are ~30-day sliding.
//
// Asserts the shipped auth config (src/lib/auth.ts) declares a 30-day session that slides
// daily. Reads auth.options directly so the test is a contract over the production config —
// it goes red if expiresIn/updateAge are changed away from the locked D-12 values.

import { describe, it, expect } from "vitest";
import { auth } from "@/lib/auth";

const opts = (auth as unknown as { options: { session?: { expiresIn?: number; updateAge?: number } } })
  .options;

describe("session config (D-12 / AUTH-02)", () => {
  it("expiresIn is 30 days (2592000s)", () => {
    expect(opts.session?.expiresIn).toBe(60 * 60 * 24 * 30);
    expect(opts.session?.expiresIn).toBe(2592000);
  });

  it("updateAge slides once per day (86400s)", () => {
    expect(opts.session?.updateAge).toBe(60 * 60 * 24);
    expect(opts.session?.updateAge).toBe(86400);
  });
});
