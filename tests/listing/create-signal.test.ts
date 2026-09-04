// D-03 / HSURF-02 — THE WORDS A HOST READS WHEN CREATION FAILED.
//
// `(host)/host/listings/new/page.tsx` RENDERS NOTHING — every branch of it ends in a `redirect()` —
// so the sentence cannot be rendered at the origin and cannot be client state (a server redirect
// discards it). It travels in the URL. That structural fact is what this file is written around: the
// moment a failure signal becomes a query parameter, an attacker-controlled string is on the render
// path of a host surface for the first time on this route.
//
// This half asserts THE COPY: that the constants say what `19-UI-SPEC § Copywriting Contract § NEW`
// says they must, and — the part that would actually go red one day — that they do NOT say the four
// things `§ ⚠ What the copy MUST NOT say` bans. The verification ban is the load-bearing one: the
// four refusing verification states redirect to `/host/verify` BEFORE this branch, so a verification
// sentence here is copy about a check that never failed. The host would go there, find nothing
// wrong, and lose trust in both surfaces.
//
// The same `FORBIDDEN_TOPICS` table is applied a second time, to the RENDERED output, in the render
// half below. A ban that holds only in the module is a ban a page file can walk around.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import {
  LISTING_CREATE_FAILED_STATE,
  LISTING_CREATE_FAILED_REASON,
  LISTING_CREATE_FAILED_CTA,
  LISTING_CREATE_FAILED_PARAM,
  composeListingCreateFailedSentence,
} from "@/lib/listing/create-signal";

/**
 * THE BANNED TOPICS, AS ONE TABLE.
 *
 * Each row is a row of `19-UI-SPEC § ⚠ What the copy MUST NOT say`, and each carries its reason so a
 * red says what it is protecting rather than only that a word appeared.
 */
export const FORBIDDEN_TOPICS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  {
    pattern: /verif/i,
    why:
      "the four refusing verification states redirect to /host/verify BEFORE this branch, so a " +
      "verification sentence here is copy about a check that never failed",
  },
  {
    pattern: /approv/i,
    why: "nothing was submitted for approval — the insert never landed",
  },
  {
    pattern: /account check/i,
    why: "same as the verification ban: this branch catches infrastructure failure only",
  },
  { pattern: /delet/i, why: "nothing was created, so nothing was removed" },
  { pattern: /remov/i, why: "nothing was created, so nothing was removed" },
  {
    pattern: /support/i,
    why: "SUPPORT_EMAIL is null and a placeholder is forbidden (D-64 / D-250)",
  },
  {
    pattern: /contact/i,
    why: "SUPPORT_EMAIL is null and a placeholder is forbidden (D-64 / D-250)",
  },
  {
    pattern: /get in touch/i,
    why: "SUPPORT_EMAIL is null and a placeholder is forbidden (D-64 / D-250)",
  },
];

describe("D-03 — the creation-failure copy module", () => {
  it("composes the state and the reason into the one sentence the contract specifies", () => {
    expect(composeListingCreateFailedSentence()).toBe(
      "We couldn't start your new listing. Something went wrong on our side, and nothing was saved.",
    );
  });

  it("joins the two parts with exactly one space and carries no edge whitespace", () => {
    const sentence = composeListingCreateFailedSentence();
    expect(sentence).toBe(`${LISTING_CREATE_FAILED_STATE} ${LISTING_CREATE_FAILED_REASON}`);
    expect(sentence).toBe(sentence.trim());
    expect(sentence).not.toMatch(/ {2}/);
  });

  it("is calm — no exclamation mark anywhere in the composed sentence", () => {
    expect(composeListingCreateFailedSentence()).not.toContain("!");
  });

  it.each(FORBIDDEN_TOPICS)(
    "the composed sentence names no forbidden topic: $pattern",
    ({ pattern, why }) => {
      const sentence = composeListingCreateFailedSentence();
      expect(
        pattern.test(sentence),
        `THE COPY REACHED FOR A BANNED TOPIC (${String(pattern)}). ${why}. ` +
          `Sentence was: ${JSON.stringify(sentence)}`,
      ).toBe(false);
    },
  );

  it("is not a bare 'Something went wrong.' — it carries a state AND a reason", () => {
    // Rule O7's third part, the way out, is a separate export rendered as a link beside this
    // sentence; the two clauses here are the first two. A single-clause sentence would be the defect
    // this plan closes, differently spelled.
    expect(LISTING_CREATE_FAILED_STATE.length).toBeGreaterThan(0);
    expect(LISTING_CREATE_FAILED_REASON.length).toBeGreaterThan(0);
    expect(composeListingCreateFailedSentence()).not.toBe("Something went wrong.");
  });

  it("names the way out, and the way out is a label rather than a sentence", () => {
    expect(LISTING_CREATE_FAILED_CTA).toBe("Try again");
    expect(LISTING_CREATE_FAILED_CTA).not.toContain(".");
  });

  it("exports ONE stable query token, so the origin and the destination cannot drift", () => {
    expect(LISTING_CREATE_FAILED_PARAM).toBe("create=failed");
    expect(LISTING_CREATE_FAILED_PARAM).not.toMatch(/\s/);
    expect(LISTING_CREATE_FAILED_PARAM).toBe(encodeURI(LISTING_CREATE_FAILED_PARAM));
  });

  it("imports nothing — which is what makes a support address structurally unable to reach this copy", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/listing/create-signal.ts"), "utf8");
    const importLines = source.split("\n").filter((l) => /^import\b/.test(l));
    expect(
      importLines,
      "THE COPY MODULE GREW AN IMPORT. Its zero-dependency shape is the reason no runtime value — a " +
        "support address, an error string, a database message — can be interpolated into a sentence " +
        "the host reads (T-19-32). Compose from this module's own exports, or do not compose it here.",
    ).toEqual([]);
  });
});
