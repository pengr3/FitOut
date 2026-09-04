// @vitest-environment jsdom

// D-03 / HSURF-02 — THE WORDS A HOST READS WHEN CREATION FAILED, AND THE PROOF THEY SURVIVE THE
// REDIRECT WITHOUT THE URL BEING ABLE TO PUT ITS OWN WORDS IN THEIR PLACE.
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
//
// THE SECOND HALF IS THE ONE THAT WOULD ACTUALLY GO RED ONE DAY. The destination must show the
// module's own string for exactly one known token and nothing at all for anything else, and a hostile
// value must be echoed nowhere. `/host/listings` is a Server Component, awaited to a tree and then
// rendered — the idiom `tests/booking/detail-completeness.test.tsx` established for exactly this
// shape, with every read stubbed to its EMPTY answer so the render lands in the ZERO-LISTINGS state.
// That state is deliberate: it is where the notice is most likely to be lost, because a host whose
// very first creation failed has no grid to hang a message on.
//
// jsdom rather than node, for the whole file: the copy half does not care, and the render half needs
// a document.

import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

import {
  LISTING_CREATE_FAILED_STATE,
  LISTING_CREATE_FAILED_REASON,
  LISTING_CREATE_FAILED_CTA,
  LISTING_CREATE_FAILED_PARAM,
  composeListingCreateFailedSentence,
} from "@/lib/listing/create-signal";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The toast host: mounted by the page, irrelevant here, and it reaches for a theme provider no test
// mounts.
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
// The two server actions the client card imports. Neither is called; pulling the real `"use server"`
// module into jsdom would drag the whole listing writer path in with it.
vi.mock("@/app/actions/listing", () => ({
  unlistListing: vi.fn(),
  softDeleteListing: vi.fn(),
}));
vi.mock("@/lib/host/verification-status", () => ({
  loadHostVerification: async () => ({ status: "approved", suspended: false, reason: null }),
}));
vi.mock("@/lib/listing/hours-signal", () => ({
  loadPublishedListingsMissingHours: async () => [],
}));
// Every read resolves EMPTY. The grid therefore renders its zero state, and the notice's placement
// relative to that state is what the second case measures.
vi.mock("@/lib/db", () => {
  type Chain = {
    from: () => Chain;
    where: () => Chain;
    orderBy: () => Chain;
    limit: () => Chain;
    then: (onOk: (rows: unknown[]) => unknown, onErr?: (e: unknown) => unknown) => Promise<unknown>;
  };
  const chain = (): Chain => {
    const c: Chain = {
      from: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      then: (onOk, onErr) => Promise.resolve([]).then(onOk, onErr),
    };
    return c;
  };
  return { db: { select: () => chain() } };
});

import HostListingsPage from "@/app/(host)/host/listings/page";

afterEach(cleanup);

/**
 * THE BANNED TOPICS, AS ONE TABLE.
 *
 * Each row is a row of `19-UI-SPEC § ⚠ What the copy MUST NOT say`, and each carries its reason so a
 * red says what it is protecting rather than only that a word appeared.
 */
const FORBIDDEN_TOPICS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE RENDER, AT THE DESTINATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** A session for a host who may host. The page's own guards are not the subject of this file. */
function seedSession() {
  getSession.mockResolvedValue({ user: { id: "host-1", canHost: true, emailVerified: true } });
}

/** Render `/host/listings` with a given `?create=` value (or none), and hand back its text and HTML. */
async function renderGrid(create?: string) {
  seedSession();
  const tree = await HostListingsPage({
    searchParams: Promise.resolve(create === undefined ? {} : { create }),
  });
  const { container } = render(tree as React.ReactElement);
  return {
    text: (container.textContent ?? "").replace(/\s+/g, " ").trim(),
    html: container.innerHTML,
  };
}

describe("D-03 — the sentence survives the redirect, and only for the one known token", () => {
  it("renders the module's own sentence, and its way out, when the exported token is present", async () => {
    const { text } = await renderGrid("failed");
    expect(text).toContain(composeListingCreateFailedSentence());
    expect(text).toContain(LISTING_CREATE_FAILED_CTA);
  });

  it("renders in the ZERO-LISTINGS state, ABOVE the shipped empty state rather than instead of it", async () => {
    const { text } = await renderGrid("failed");
    // The empty state is unchanged by this phase. The notice sits above it, outside the
    // populated-versus-empty fork — a host whose very first creation failed needs both.
    expect(text).toContain("No listings yet");
    const noticeAt = text.indexOf(LISTING_CREATE_FAILED_STATE);
    const emptyAt = text.indexOf("No listings yet");
    expect(noticeAt).toBeGreaterThanOrEqual(0);
    expect(
      noticeAt,
      "THE NOTICE FELL BELOW (OR INSIDE) THE POPULATED-VERSUS-EMPTY FORK. It belongs above it, in " +
        "the HostingPausedNotice slot and with its offset, so it renders in BOTH grid states.",
    ).toBeLessThan(emptyAt);
  });

  it("renders NOTHING for an arbitrary value on the same key", async () => {
    const { text } = await renderGrid("something-else");
    expect(text).not.toContain(LISTING_CREATE_FAILED_STATE);
    expect(text).not.toContain(LISTING_CREATE_FAILED_REASON);
    expect(text).toContain("No listings yet");
  });

  it("renders nothing at all when the parameter is absent — the ordinary visit is unchanged", async () => {
    const { text } = await renderGrid();
    expect(text).not.toContain(LISTING_CREATE_FAILED_STATE);
    expect(text).toContain("No listings yet");
  });

  it("never echoes a hostile value — no notice, and the value appears nowhere in the output", async () => {
    const hostile = '"><script>alert(1)</script>';
    const { text, html } = await renderGrid(hostile);

    expect(
      text.includes(LISTING_CREATE_FAILED_STATE),
      "A NON-MATCHING VALUE PRODUCED THE NOTICE. The contract is ONE equality check against the " +
        "module's own exported token; anything else renders nothing.",
    ).toBe(false);

    expect(
      html.includes("alert(1)") || text.includes("alert(1)"),
      "THE QUERY VALUE WAS ECHOED INTO THE PAGE. `searchParams` is UNTRUSTED INPUT (T-19-31). The " +
        "contract is one equality check against a known constant, after which the page renders THE " +
        "MODULE'S OWN STRING. Interpolating the value — to make the message more specific, to name " +
        "a failed id, to echo the token back — is exactly what this assertion exists to catch. That " +
        "React would escape it is not the point: it must not be there at all.",
    ).toBe(false);
    expect(html).not.toContain("<script");
  });

  it.each(FORBIDDEN_TOPICS)(
    "the RENDERED notice names no forbidden topic: $pattern",
    async ({ pattern, why }) => {
      const { text } = await renderGrid("failed");
      // Scoped to what the notice contributes — the rest of the page is shipped copy this phase does
      // not own — so the ban is asserted at the RENDER SITE and not only in the constant.
      const start = text.indexOf(LISTING_CREATE_FAILED_STATE);
      expect(start).toBeGreaterThanOrEqual(0);
      const notice = text.slice(
        start,
        start + composeListingCreateFailedSentence().length + LISTING_CREATE_FAILED_CTA.length + 4,
      );
      expect(
        pattern.test(notice),
        `THE RENDER SITE REINTRODUCED A BANNED TOPIC (${String(pattern)}). ${why}. ` +
          `Rendered notice was: ${JSON.stringify(notice)}`,
      ).toBe(false);
    },
  );
});
