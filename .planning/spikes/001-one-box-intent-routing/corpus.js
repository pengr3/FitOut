/* Spike 001 — the judgement corpus.
 *
 * 30 things a Manila booker plausibly types into one box, each with the params the router SHOULD
 * emit. Written BEFORE the router was run, so the score below is a measurement and not a
 * post-hoc rationalisation.
 *
 * `expect` is a PARTIAL match: every key stated must be present and equal. Keys the router adds
 * beyond it are reported as `extra` rather than counted wrong — a router that also resolves a date
 * has not failed a case about a category. `expectAbsent` names keys that must NOT appear, which is
 * how the honest-failure cases (14, 19) assert that the router did not invent a place.
 *
 * `note` marks the cases whose value is the failure, not the pass.
 */
(function (root) {
  "use strict";

  // Fixed clock: 2026-08-31. Every temporal expectation below is derived from THIS date.
  const NOW = new Date("2026-08-31T09:00:00+08:00");

  const CORPUS = [
    // ── the single most likely query on a pickleball marketplace ──────────────────────────────
    { input: "pickleball", expect: { category: "pickleball" }, note: "the query Photon answers with a court in Florida" },
    { input: "pickleball in makati", expect: { category: "pickleball", place: "Makati", placeKind: "city" } },
    { input: "yoga tonight", expect: { category: "yoga", date: "2026-08-31", start: "18:00", end: "22:00" } },
    // ITERATION 3 — REWRITTEN BY A MEASUREMENT, not by taste. This case originally expected
    // place="Ortigas Center" as an applied PARAM, via the prefix rule. `edge-cases.js` P2 then grew
    // the catalog to 37 places and found the same rule resolving "ayala" uniquely — and therefore
    // confidently — to "Ayala Alabang", a city twenty kilometres from the Ayala a Manila booker
    // means. Uniqueness is not correctness. A prefix is now a SUGGESTION the booker confirms.
    { input: "basketball court in ortigas", expect: { category: "basketball_court", q: "ortigas" }, expectAbsent: ["place"], expectSuggestion: "Ortigas Center", note: "short form of a district — offered, never applied" },
    { input: "gym", expect: { category: "gym_fitness_floor" }, note: "synonym: no label contains the bare word 'gym'" },
    { input: "poblacion", expect: { place: "Poblacion", placeKind: "neighborhood" } },
    { input: "makati yoga studio", expect: { place: "Makati", category: "yoga_studio" } },
    // ITERATION 3 — same correction. P1 measured `dennis` becoming category=tennis and `dancer`
    // becoming category=dance. A wrong category does not merely fail to help: it silently deletes
    // every listing the booker wanted, with nothing on the page to say so. Fuzzy now suggests.
    { input: "pickelball", expect: { q: "pickelball" }, expectAbsent: ["category"], expectSuggestion: "pickleball", note: "typo — offered as 'did you mean', never applied silently" },
    { input: "boxing", expect: { category: "boxing_mma" } },
    { input: "muay thai", expect: { category: "boxing_mma" }, note: "two-word synonym" },

    { input: "alabang multi-sport court", expect: { place: "Alabang", category: "multi_sport_court" } },
    { input: "quezon city gym saturday", expect: { place: "Quezon City", category: "gym_fitness_floor", date: "2026-09-05" }, note: "3 intents, one box; 'quezon city' must not split" },
    { input: "tennis", expect: { category: "tennis" }, note: "resolves cleanly and returns ZERO listings — the relaxation ladder's job, not the router's" },
    { input: "bgc", expect: { q: "bgc" }, expectAbsent: ["place", "category"], note: "THE HONEST FAILURE — no catalog listing carries 'BGC', so it falls to free text" },
    { input: "court with showers", expect: { amenity: ["showers"], q: "court" }, note: "amenity is a NET-NEW server param; 'court' alone is not a label" },
    { input: "Sunlit Yoga Studio", expect: { category: "yoga_studio", q: "sunlit" }, note: "a listing NAME — the half the router cannot do without spike 002" },
    { input: "", expect: {}, note: "empty box = the D-30 default browse view, unchanged" },
    { input: "cheap pickleball", expect: { category: "pickleball", q: "cheap" }, expectAbsent: ["priceMax"], note: "HONEST: no price NLP. 'cheap' must not silently become a ceiling" },
    { input: "pilates mandaluyong tomorrow", expect: { category: "pilates", place: "Mandaluyong", date: "2026-09-01" } },
    { input: "hoops near me", expect: { category: "basketball", useMyLocation: true }, note: "absorbs the separate 'Use my location' button" },

    { input: "weightlifting kamias", expect: { category: "weightlifting", place: "Kamias" } },
    { input: "dance studio", expect: { category: "dance_studio" }, note: "longest-phrase-first: must beat the bare 'dance' tag" },
    { input: "badminton this weekend", expect: { category: "badminton", date: "2026-09-05" } },
    { input: "climbing", expect: { category: "climbing" } },
    { input: "yoga in poblacion friday", expect: { category: "yoga", place: "Poblacion", date: "2026-09-04" } },
    { input: "multi purpose event space", expect: { category: "multi_purpose_event" } },
    { input: "crossfit", expect: { category: "hiit_cross_training" } },
    { input: "parking", expect: { amenity: ["parking"] }, note: "genuinely ambiguous — amenity or a place. Records which way the router leans" },
    { input: "caloocan", expect: { place: "Caloocan", placeKind: "city" } },
    { input: "yoga studio with showers and parking tomorrow", expect: { category: "yoga_studio", amenity: ["showers", "parking"], date: "2026-09-01" }, note: "the compound stress case" },
  ];

  root.SpikeCorpus = { CORPUS, NOW };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SpikeCorpus;
})(typeof globalThis !== "undefined" ? globalThis : this);
