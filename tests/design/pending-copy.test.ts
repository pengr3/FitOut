// 13-CONTEXT D-102 — THE PENDING SURFACE MAY NOT ASSERT A PAYMENT FITOUT HAS NOT VERIFIED.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE GUARDS, AND THE FOURTH TIME IT WAS NEEDED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/booking/pending-payment-state.tsx` is what a booker sees between leaving the hosted
// checkout and the `checkout_session.payment.paid` webhook arriving. At that paint the ONLY thing
// FitOut knows is that a browser came back to `/bookings/{id}?paid=1`. PROJECT D-57 is explicit and
// binding: that parameter is a UX signal and never proof of payment — the webhook is the sole confirm
// authority, and the row is still `pending` precisely because the webhook has not spoken. A URL can be
// typed, and a hosted session can redirect and still fail to capture.
//
// The surface nevertheless shipped for four phases with a heading and a money sentence that both
// asserted RECEIPT, inherited from plan 05-03 and never re-read. The PM found them in live UAT and
// asked the question the copy could not survive: *did we really receive the payment?* We did not know.
//
// ⚠ THIS IS THE FOURTH UNVERIFIED MONEY CLAIM PHASE 13 HAS REMOVED — after the not-completed sentence
// on a real reversal (D-69), the in-transit sentence on a failed dispatch (D-83/13-18) and the bare
// charged amount on an indeterminate probe (D-96). Every one of them shipped the same way: a sentence
// was inherited, read as settled, and rewritten AROUND rather than re-checked against what the code
// actually knows. `reversed-copy.test.ts` is the gate that came out of the first one; this is its
// sibling for the state one step earlier.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A SOURCE SCAN AND NOT A RENDER ASSERTION — THE TWO GATES ARE NOT INTERCHANGEABLE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/booking/payment-states.test.tsx` renders this component at all three thresholds and asserts
// its copy. It was green for the whole life of the defect, and it could not have been anything else:
// it asserted that the shipped strings were PRESENT, and they were. A test that pins text cannot see
// that the text is a lie, in the same way 13-19 measured that a test asserting text and roles cannot
// see a spinner that never stops. Presence is not truth.
//
// So this gate asserts the other direction — a set of ASSERTION FORMS that must not appear on this
// surface at all — and it reads the SOURCE, comments included. Comments are not stripped and that is
// the whole point: the defect's defence lived in a comment above the sentence, arguing that the claim
// was true "from the first paint" because the browser only arrives here from the checkout return. That
// reasoning is the defect (a redirect is not a payment), and a comment is exactly where a corrected
// claim comes back — "just in a comment, to explain what we must not say" — after which every grep for
// the phrase matches its own prohibition and the gate is dead for good. 13-PATTERNS § H.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TWO PASSES AND AN APOSTROPHE PASS, INHERITED RATHER THAN REDISCOVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `reversed-copy.test.ts` measured both, and this file is not going to pay for them a second time:
//
//   • THE APOSTROPHE PASS. `react/no-unescaped-entities` means JSX prose stores apostrophes as
//     `&apos;`, so a scan for the plain spelling reports a clean file over copy that contains the
//     phrase. Every spelling is folded onto one before anything is looked for, and the fixture set
//     below includes the entity spelling so the folding itself cannot rot.
//   • THE COLLAPSED PASS. The formatter wraps a sentence wherever the column limit falls, so a phrase
//     that is contiguous when RENDERED is often not contiguous in source. The raw pass reports a line
//     number; the collapsed pass can only report the file, and says so.
//
// NOT COVERED, stated so the next reader under-trusts this file:
//   • CONTIGUITY, over source text. Copy assembled at runtime — a template with a substitution, a word
//     from a map keyed by a prop — is invisible to it. That is the safe direction for a ban (it can
//     miss a violation, never invent one), and it is why `payment-states.test.tsx` case (9) runs the
//     same forms over the RENDERED text at all three thresholds. Two layers, each proving its own half.
//   • ONE SURFACE. This says nothing about the page that composes it or about any other state. The
//     reversed and by-hand surfaces have their own gate, which bans different phrases for different
//     reasons — a ban list is per-surface because the truth is.
//
// ⚠ AND THIS FILE NEVER SPELLS A BANNED PHRASE, anywhere, including in the reasons and the fixtures.
// Every one is stored in two pieces and joined at runtime. A gate that spells what it forbids is the
// first violation of its own rule the day somebody widens its scope.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

/** The tree root every path below is resolved against — parameterised for the vacuity probe. */
const ROOT = process.cwd();

type Surface = {
  /** The declared, forward-slash relative path. */
  readonly rel: string;
  /** Bytes below which the file was not really read. */
  readonly minBytes: number;
  /** Identifiers the file must STILL compose — deleting the copy is not a way to satisfy a ban. */
  readonly mustCompose: readonly { readonly token: string; readonly why: string }[];
};

/**
 * THE DECLARED SURFACES — one today, and the size of the list is part of the claim.
 *
 * The hazard this gate exists for is specific: a surface that renders while the webhook is STILL
 * outstanding, where every sentence is therefore about a payment nobody has verified. Exactly one
 * component is in that position. The not-completed state is not (it renders only on an affirmative
 * provider read that the checkout did not finish); the reversed and cancelled surfaces are not (money
 * demonstrably moved, and their own gate bans the opposite claims); the confirmed page is not (the
 * webhook has spoken, which is what `confirmed` means).
 *
 * ADD A SURFACE HERE THE DAY ONE MORE RENDERS BEFORE THE AUTHORITY HAS ANSWERED — a second poller, a
 * settling banner on the bookings list, an email sent at checkout-return time. A new surface with the
 * same hazard and no gate is how a corrected claim comes back (13-18's finding, on the sibling gate).
 */
const SURFACES: readonly Surface[] = [
  {
    rel: "src/components/booking/pending-payment-state.tsx",
    minBytes: 4000,
    mustCompose: [
      {
        token: "MoneyStatement",
        why:
          "STATE-06/D-73 make that component the single owner of every \"where is your money\" " +
          "sentence on /bookings/**, and this state is one of the four it exists for. Deleting the " +
          "money sentence is not a way to satisfy a ban: a surface that says nothing about the " +
          "booker's money while their money is in the air is worse than one that says something calm " +
          "and true.",
      },
      {
        token: "BookingReference",
        why:
          "TRUST-02/D-78 put the reference on EVERY status from the first paint, and on this one it " +
          "is the only token a person could ask the booker to quote while nobody yet knows what " +
          "happened to the money.",
      },
      {
        token: "SupportPath",
        why:
          "the escalation threshold's guarded affordance (D-64). It renders nothing while " +
          "SUPPORT_EMAIL is null, which is exactly why its ABSENCE would be invisible in a render " +
          "test and has to be asserted against the source.",
      },
      {
        token: "${email}",
        why:
          "the promise past the poll cap names the booker's OWN address, interpolated verbatim and " +
          "never masked (D-63). It is the one thing on this surface that is both a promise and " +
          "checkable — the confirm path really does send it — so it is the half the bans must not be " +
          "allowed to take with them.",
      },
    ],
  },
];

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic:
 * `path.relative` emits backslashes on this box while every path declared here is forward-slash.
 */
function posix(abs: string): string {
  return relative(ROOT, abs).split("\\").join("/");
}

type Opened = { readonly rel: string; readonly raw: string };

/**
 * Open one declared file, or `null` when it is not there. Never raises: a broken scan must surface as
 * ONE named guard-the-guard failure, not as a stack trace that buries which gate went quiet.
 */
function openFile(rel: string): Opened | null {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return { rel: posix(abs), raw: readFileSync(abs, "utf8") };
}

/** Fold every spelling of an apostrophe onto one, and lower-case. See the header. */
function normalise(text: string): string {
  return text
    .replace(/&apos;|&#0*39;|&#x0*27;|&rsquo;|[\u2018\u2019\u02BC]/gi, "'")
    .toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE BANNED ASSERTION FORMS, EACH IN TWO PIECES AND EACH WITH THE REASON IT IS BANNED
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Forbidden = {
  /** The phrase, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};

/**
 * THE TEST IS ONE SENTENCE: is this true whether or not the payment ultimately lands?
 *
 * Every row below fails it in the same way — each presupposes that money reached FitOut, which is the
 * one thing this surface cannot know. Two of them are the strings that actually shipped; the rest are
 * the forms a copy pass reaches for when it rewrites those two, which is how the previous three
 * corrections in this phase came back the first time.
 *
 * ⚠ NOT BANNED, and deliberately: naming the payment at all. *"We're confirming your payment"* is the
 * register this surface is written in — the noun phrase denotes the attempt the booker just made, and
 * the verb says plainly that the answer is not in. What is banned is the assertion that it ARRIVED.
 */
const RECEIPT_CLAIMS: readonly Forbidden[] = [
  {
    pieces: ["payment rec", "eived"],
    why:
      "was this surface's `<h1>` from plan 05-03 until D-102 removed it, and it is the claim the PM " +
      "challenged in live UAT. It states as a completed fact the exact thing the webhook has not yet " +
      "told us — the row is still `pending` BECAUSE nobody knows. A heading is the most load-bearing " +
      "sentence on a page and this one was the least verified.",
  },
  {
    pieces: ["payment reach", "ed us"],
    why:
      "was this surface's money statement until D-102 removed it, defended by a comment arguing it " +
      "was true from the first paint because the browser only arrives here from the checkout return. " +
      "A redirect is not a payment: the URL is typable and a hosted session can redirect and still " +
      "fail to capture. PROJECT D-57 settles it — the parameter is a UX signal, never proof.",
  },
  {
    pieces: ["payment is s", "afe"],
    why:
      "carries the same presupposition one step further: it asserts there IS a payment, in order to " +
      "reassure about where it is. Every sentence on this surface has to be true under both readings " +
      "— it landed, it did not — and this one is only true under the first.",
  },
  {
    pieces: ["money is s", "afe"],
    why:
      "the same claim with a different noun, which is the shape a copy pass produces when it is asked " +
      "to reword the sentence above rather than to re-check it.",
  },
  {
    pieces: ["received your p", "ayment"],
    why:
      "the active voice of the heading this plan removed. FitOut has received nothing it can point " +
      "to: the webhook is the only event that makes a payment a fact on this system.",
  },
  {
    pieces: ["we have your p", "ayment"],
    why:
      "asserts possession of the booker's money. Even on the happy path the funds are with the " +
      "provider until settlement, and on this branch nobody has confirmed there are any.",
  },
  {
    pieces: ["we've got your p", "ayment"],
    why:
      "the colloquial spelling of the same possession claim, and the one a warm rewrite reaches for " +
      "first. Banned beside it because a copy pass that relaxes a register is exactly how a corrected " +
      "claim returns.",
  },
  {
    pieces: ["payment confir", "med"],
    why:
      "is the strongest false statement available on this surface: confirmation is the event that " +
      "ends this state. If it had happened the booking would be `confirmed` and this component would " +
      "not be rendering. Saying it here would fabricate the confirmed state in copy, which is the " +
      "client-side fabrication D-57 forbids in mechanism.",
  },
  {
    pieces: ["paid in f", "ull"],
    why:
      "belongs to `PaidStatement`, which mounts on the confirmed and derived-completed renders and on " +
      "nothing else (D-99). A copy-paste of it onto this state would tell a booker the money is " +
      "settled while the authority that decides that is still outstanding.",
  },
  {
    pieces: ["payment lan", "ded"],
    why:
      "is CORRECT copy on the reversed state — money demonstrably moved there — which is precisely " +
      "why it is dangerous here: it reads as house style, and it is house style, for a surface that " +
      "knows something this one does not.",
  },
  {
    pieces: ["payment went thr", "ough"],
    why:
      "the plainest spoken form of the same assertion. The not-completed state's heading is its " +
      "NEGATION, so the vocabulary is already in this corner of the product with a verified meaning " +
      "on the branch that earns it.",
  },
];

/**
 * Find every occurrence of a forbidden phrase in a body of text, as `label:line — why`.
 *
 * Both passes run over NORMALISED text (see `normalise`).
 */
function findPhrases(label: string, text: string, phrases: readonly Forbidden[]): string[] {
  const hits: string[] = [];
  const lines = text.split("\n");
  const collapsed = normalise(text).replace(/\s+/g, " ");

  for (const phrase of phrases) {
    const needle = normalise(phrase.pieces.join(""));

    let foundOnALine = false;
    lines.forEach((line, index) => {
      if (normalise(line).includes(needle)) {
        foundOnALine = true;
        hits.push(`${label}:${index + 1} — ${phrase.why}`);
      }
    });

    if (!foundOnALine && collapsed.includes(needle)) {
      hits.push(`${label} (wrapped across lines) — ${phrase.why}`);
    }
  }

  return hits;
}

/** Opened ONCE at module level; the `it()` blocks below only assert against this. */
const opened: readonly { spec: Surface; file: Opened | null }[] = SURFACES.map((spec) => ({
  spec,
  file: openFile(spec.rel),
}));

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (0) GUARD THE GUARD — asserted FIRST, because the real assertion below is "a list was empty"
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(0) the scanner can find what it bans, and it really opened the file", () => {
  it("opened every declared surface, and each is a file somebody actually wrote", () => {
    // ⚠ THE COUNT IS ASSERTED FIRST. The ban below iterates `SURFACES`, so a list emptied to none
    // would switch this gate off while every `toEqual([])` stayed green. A ban list cannot catch the
    // item nobody declared, so the SIZE of the list is part of the claim (13-09's finding).
    expect(
      SURFACES.length,
      `SURFACES declares ${SURFACES.length} surfaces. Exactly one component renders while the confirm ` +
        `authority is still outstanding today. Shrinking this list does not relax the gate, it removes ` +
        `a surface from it; growing it is correct the day a second such surface exists.`,
    ).toBe(1);

    for (const { spec, file } of opened) {
      expect(
        file,
        `${spec.rel} was not found. The ban in this file is \`toEqual([])\`, which a scan over nothing ` +
          `satisfies perfectly. If the component moved, move this declaration in the same commit.`,
      ).not.toBeNull();
      expect(
        file!.raw.length,
        `${spec.rel} is ${file!.raw.length} bytes. That is not a component, it is a stub — and a stub ` +
          `passes every ban here.`,
      ).toBeGreaterThanOrEqual(spec.minBytes);
    }
  });

  it("pointed at a path that does not exist, opens nothing — which is why the floor above exists", () => {
    // The vacuity probe as a permanent assertion rather than a one-off. `openFile` returns null for a
    // missing path instead of raising, deliberately: the realistic version of this failure is a moved
    // file, and a moved file does not raise.
    expect(openFile("src/components/booking/pending-payment-state-nope.tsx")).toBeNull();
  });

  it("finds a banned form when there IS one — inline, wrapped, and in the entity spelling", () => {
    // BOTH DIRECTIONS, through the same code path the real assertion uses. Without this, "found
    // nothing" is equally consistent with a scanner that can never find anything. Every fixture is
    // BUILT from the two-piece encoding, so this file still never spells a banned form.
    const heading = RECEIPT_CLAIMS[0].pieces.join("");

    const inline = findPhrases("fixture-inline.tsx", `<h1>${heading}</h1>`, RECEIPT_CLAIMS);
    expect(inline).toHaveLength(1);
    expect(inline[0]).toContain("fixture-inline.tsx:1");
    expect(inline[0]).toContain("05-03");

    // Contiguous once rendered, not contiguous in source — the formatter's line wrap.
    const words = heading.split(" ");
    const wrapped = findPhrases(
      "fixture-wrapped.tsx",
      `<h1>\n  ${words[0]}\n  ${words.slice(1).join(" ")}\n</h1>`,
      RECEIPT_CLAIMS,
    );
    expect(wrapped).toHaveLength(1);
    expect(wrapped[0]).toContain("wrapped across lines");

    // THE ENTITY SPELLING — JSX prose stores apostrophes this way, and without the fold the gate is
    // green over copy that contains the phrase. The row chosen is the one that carries an apostrophe.
    const contracted = RECEIPT_CLAIMS.find((row) => row.pieces.join("").includes("'"))!;
    const needle = contracted.pieces.join("");
    const entitySource = `<p>${needle.replace("'", "&apos;")} — hang tight.</p>`;
    expect(entitySource.includes("&apos;")).toBe(true);
    expect(findPhrases("fixture-entity.tsx", entitySource, RECEIPT_CLAIMS)).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (1) THE BAN — whole file, comments included
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-102 — no sentence on the pending surface asserts a payment we have not verified", () => {
  for (const { spec, file } of opened) {
    it(`${spec.rel} states FitOut's knowledge, never the money's arrival`, () => {
      expect(file, `${spec.rel} was not opened — see case (0)`).not.toBeNull();
      expect(
        findPhrases(file!.rel, file!.raw, RECEIPT_CLAIMS),
        "the pending surface asserts something about the booker's money that no event on this system " +
          "has established. The row is `pending` because the `checkout_session.payment.paid` webhook " +
          "has not arrived, and that webhook is the sole confirm authority (PROJECT D-57). Say what we " +
          "KNOW — that we are confirming, that we are waiting on the provider, that we will write to " +
          "them — never what we HAVE. Comments count: the last version of this defect was defended by " +
          "one, and a phrase in a comment kills every future grep for it.",
      ).toEqual([]);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (2) THE POSITIVE HALF — a surface with no money copy at all satisfies every ban perfectly
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("the surface still says something, and still promises something real", () => {
  for (const { spec, file } of opened) {
    for (const required of spec.mustCompose) {
      it(`${spec.rel} still composes ${required.token}`, () => {
        expect(file, `${spec.rel} was not opened — see case (0)`).not.toBeNull();
        expect(file!.raw.includes(required.token), required.why).toBe(true);
      });
    }
  }
});
