// WR-01, the VENDOR half — the escaping that makes a smuggled parameter and a real one distinguishable.
//
// ── WHY A TEST FOR SOMEBODY ELSE'S CODE ─────────────────────────────────────────────────────────
// `src/app/api/cloudinary/sign/route.ts` argues, in its header, that a caller holding a signature
// minted over four keys "cannot add one". That sentence is TRUE, and until WR-01 nothing in this
// repository was what made it true. The mechanism was `cloudinary@2.10.0`: since signature version 2
// its `api_string_to_sign` runs every `key=value` pair through `encode_param`, which replaces `&`
// with `%26` — added by the vendor for precisely this attack. Without it, a body whose TIMESTAMP
// value carries `&<another pair>` produces a string-to-sign byte-identical to the one Cloudinary
// derives from an upload that really carries that extra parameter, and the extra parameter never had
// to pass a gate because it never presented itself as a key.
//
// The route now refuses that value itself, so the smuggle is closed twice over. This file pins the
// second half. Two reasons it is worth a file rather than a comment:
//
//   1. A DEFAULT IN A DEPENDENCY IS NOT A CONTROL THIS REPO OWNS. A downgrade, a lockfile
//      resolution, or a vendor decision to change the default can each remove it, and nothing else
//      here would notice. This phase's whole thesis is that a control living outside the repo must
//      not be silently depended on — it is why `scripts/cloudinary-preset.ts` exists at all
//      (16.1-PATTERNS Pattern 3 / § R-1.6 layer 4). The same rule, aimed at the one dependency the
//      route's security paragraph rests on.
//   2. IT IS WHAT MAKES THE ROUTE'S OWN TESTS MEAN WHAT THEY SAY. `tests/listing/cloudinary-sign
//      .test.ts` asserts a 400 on the smuggling body. That 400 would still be green if the route's
//      value check were deleted and the vendor were doing all the work — the exact state this repo
//      was in before WR-01. Only the pair of files distinguishes "we refuse it" from "somebody else
//      does".
//
// ── WHAT THIS FILE DOES *NOT* COVER, SAID OUT LOUD ──────────────────────────────────────────────
// It measures the library's DEFAULT, on this machine, with no ambient Cloudinary configuration. A
// `CLOUDINARY_URL` carrying `signature_version=1` in a deployed environment would downgrade the
// signer at runtime and no test can see that from here. That escalation is now harmless for THIS
// attack — the route refuses the value before the signer is reached — which is the entire reason
// WR-01 put the check in the route rather than leaving a comment about the vendor's default.
//
// ── WHY `tests/design/` ─────────────────────────────────────────────────────────────────────────
// Pure: no network, no credential, no database, no clock. Same placement and the same reason as
// `tests/design/upload-refusal.test.ts` and `tests/design/cloudinary-preset-script.test.ts`
// (16.1-PATTERNS C-2) — it pays no Postgres preflight and it runs inside `npm run build`
// (`lint && test:design && next build`), which is where a silent dependency change would surface.
// The consequence, so nobody rediscovers it: `npm test` does NOT collect this file;
// `npm run test:design` does.
//
// ⚠ THE VENDOR PACKAGE IS IMPORTED HERE DELIBERATELY, AND `src/lib/cloudinary.ts` IS NOT.
// `vitest.design.config.ts` has no `setupFiles`, so there is NO cloudinary mock in this config —
// which is exactly what this file needs, since a mocked `api_sign_request` returning a fixed string
// could tell us nothing. Our own wrapper module is READ AS TEXT below but never imported: it calls
// `cloudinary.config()` at module scope off the environment, and this file has no business being
// affected by whether a `.env.local` exists.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { v2 as cloudinary } from "cloudinary";

/** Not a real secret and not read from anywhere — the hash only has to be reproducible. */
const SECRET = "test-secret-not-a-credential";

/** The vendor's own construction: sha1 of the string-to-sign with the secret appended. */
const sign = (toSign: string): string =>
  createHash("sha1").update(`${toSign}${SECRET}`).digest("hex");

const FOLDER = "fitout/listings/00000000-0000-0000-0000-000000000000";
const PRESET = "a_preset_name";
const TIMESTAMP = "1700000000";

/**
 * The parameter a smuggler wants signed and the route can never admit as a key, split into its two
 * halves so both spellings below are built from one source.
 *
 * ⚠ SPELLED HERE RATHER THAN IMPORTED. This is the ATTACKER's string, not a declaration this repo
 * owns — there is nothing for it to drift from (rule F2 is about our own values appearing twice).
 */
const SMUGGLED_PAIR = "transformation=c_scale,w_4000";

describe("WR-01 — the vendor escapes a signed value, so a smuggled pair cannot forge a real one", () => {
  it("signs the SAME four keys to a different value depending on whether the `&` is in a value", () => {
    // THE WHOLE FINDING, IN ONE COMPARISON, AND IT USES THE VENDOR ON BOTH SIDES so it cannot be
    // asserting our arithmetic against itself.
    //
    // LEFT: the body the sign route receives — four allow-listed keys, correct folder, correct
    // preset, and the payload riding inside the TIMESTAMP's value.
    // RIGHT: a genuine five-parameter upload that really carries that parameter. Cloudinary sorts
    // alphabetically, and `timestamp` < `transformation` < `upload_preset`, so the smuggled pair
    // lands in exactly the position the real one occupies.
    //
    // Without `encode_param` these two are BYTE-IDENTICAL and therefore hash identically: one
    // signature, good for both uploads, and the 2048px ceiling the preset carries is scaled past.
    const smugglingBody = cloudinary.utils.api_sign_request(
      {
        folder: FOLDER,
        source: "uw",
        timestamp: `${TIMESTAMP}&${SMUGGLED_PAIR}`,
        upload_preset: PRESET,
      },
      SECRET,
    );
    const genuineFiveParamUpload = cloudinary.utils.api_sign_request(
      {
        folder: FOLDER,
        source: "uw",
        timestamp: TIMESTAMP,
        transformation: "c_scale,w_4000",
        upload_preset: PRESET,
      },
      SECRET,
    );

    expect(
      smugglingBody,
      "THE SIGNER NO LONGER ESCAPES `&` IN A SIGNED VALUE. A signature minted over four keys is now " +
        "byte-identical to one over five, so the upload preset's pixel ceiling can be scaled past " +
        "with a signature our own endpoint issued (probe E11). The sign route refuses this value " +
        "itself since WR-01, so the product is not open — but the vendor half of that defence is " +
        "gone, and the route's header says so out loud. Read the WR-01 block in " +
        "src/app/api/cloudinary/sign/route.ts before changing this test.",
    ).not.toBe(genuineFiveParamUpload);
  });

  it("escapes it to `%26` specifically — the string signed is the one this file claims it is", () => {
    // The case above proves the two differ. This one proves WHY, by reconstructing both candidate
    // strings by hand: without it, a vendor change that (say) dropped the offending pair entirely,
    // or reordered the params, would keep the two hashes apart while meaning something completely
    // different about what got signed. "The signature changed" and "the parameter was neutralised"
    // are not the same claim.
    const pairs = [`folder=${FOLDER}`, "source=uw"];
    const unescaped = [...pairs, `timestamp=${TIMESTAMP}`, SMUGGLED_PAIR, `upload_preset=${PRESET}`];
    const escaped = [
      ...pairs,
      `timestamp=${TIMESTAMP}%26${SMUGGLED_PAIR}`,
      `upload_preset=${PRESET}`,
    ];

    const actual = cloudinary.utils.api_sign_request(
      {
        folder: FOLDER,
        source: "uw",
        timestamp: `${TIMESTAMP}&${SMUGGLED_PAIR}`,
        upload_preset: PRESET,
      },
      SECRET,
    );

    expect(actual, "the signed string is no longer the `&`-escaped one").toBe(sign(escaped.join("&")));
    expect(actual, "the signed string is the UNESCAPED one — this is the smuggle").not.toBe(
      sign(unescaped.join("&")),
    );
  });

  it("leaves an ordinary param set alone, so the escaping cannot be mistaken for a broken signer", () => {
    // The other direction of the both-directions rule. A signer that mangled every value would pass
    // both cases above while breaking every real upload — the failure mode would be an "Invalid
    // Signature" from Cloudinary on the happy path, which no test in this repo would attribute here.
    const clean = { folder: FOLDER, source: "uw", timestamp: TIMESTAMP, upload_preset: PRESET };
    expect(cloudinary.utils.api_sign_request(clean, SECRET)).toBe(
      sign(
        [`folder=${FOLDER}`, "source=uw", `timestamp=${TIMESTAMP}`, `upload_preset=${PRESET}`].join(
          "&",
        ),
      ),
    );
  });
});

describe("WR-01 — our own signer does not opt out of the version that escapes", () => {
  // `api_sign_request` resolves its version as `config().signature_version || 2`, so the escaping is
  // the DEFAULT and an explicit configuration is the only way this repo could turn it off. That is a
  // one-line edit inside a `config({…})` call which reads as tuning, so it is pinned here as text.
  //
  // READ, NOT IMPORTED — see this file's header. Importing the module would run `cloudinary.config()`
  // against whatever environment the runner happens to have.
  const MODULE_PATH = "src/lib/cloudinary.ts";
  const SOURCE = readFileSync(resolve(process.cwd(), MODULE_PATH), "utf8");

  it("the file really was read (detector self-test)", () => {
    // Without this a typo'd path, an empty file or a moved module would make the prohibition below
    // pass vacuously — the both-directions rule every source assertion in this phase carries.
    expect(SOURCE).toContain("api_sign_request");
    expect(SOURCE).toContain("cloudinary.config(");
  });

  it("never sets `signature_version`", () => {
    // Deliberately a prohibition on the WHOLE FILE, comments included, and deliberately not narrowed
    // to `: 1`. If a future change needs to name this setting at all — even to pin it at 2, which
    // would be a perfectly reasonable thing to want — that change should have to come here, read the
    // header above, and decide on purpose. A greppable name is the cheapest possible tripwire on a
    // setting whose wrong value is invisible in every other way.
    expect(
      SOURCE,
      `${MODULE_PATH} now configures the signature version. Version 1 does NOT escape a signed ` +
        "value, which reopens the parameter smuggle WR-01 is about — see the WR-01 block in " +
        "src/app/api/cloudinary/sign/route.ts.",
    ).not.toContain("signature_version");
  });
});
