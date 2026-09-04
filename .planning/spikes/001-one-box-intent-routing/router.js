/* Spike 001 — the intent router.
 *
 * ONE text box in, SERVER search params out. Never a fetch of its own: the geocoder is an INJECTED
 * function, which is what lets the Node harness run 30 cases deterministically off a fixture file
 * while the browser demo calls Photon live through the same code path.
 *
 * ── THE ORDER IS THE FINDING ───────────────────────────────────────────────────────────────────
 * Stages run closed-set-first, open-set-last, and the research measurement that forced it is in the
 * README: typing `pickleball` into Photon returns a building in Quezon City and two pitches in the
 * United States. Any design that geocodes the raw string is broken for the single most likely query
 * on a pickleball marketplace. So:
 *
 *   S1 temporal   — closed set (14 words)
 *   S2 vocabulary — closed set (44 terms + 27 synonyms), the product's own nouns
 *   S3 catalog    — open set, but OURS: places that have published listings
 *   S4 residue    — free text (`q`) → spike 002 decides if this is affordable at 0025
 *   S5 geocode    — the world. Reached ONLY by residue that survived S1-S4, and clamped to the
 *                   launch bbox. Today's search bar starts here; this router ends here.
 *
 * D-130 holds throughout: this emits PARAMS ONLY. No price, no availability, no distance is
 * computed here — the server query remains the sole authority, exactly as `query.ts` has it.
 */
(function (root) {
  "use strict";

  const D = root.SpikeData || require("./data.js");

  // ── normalisation ─────────────────────────────────────────────────────────────────────────────
  /** Lowercase, strip accents and punctuation, collapse whitespace. */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
      // ITERATION 2 — the hyphen was in this keep-list and `labelKey` below turns it into a space,
      // so "multi-sport court" normalised to a token no label could ever equal. An asymmetry
      // between how the INPUT and the VOCABULARY are normalised is invisible until a hyphenated
      // label is typed the way it is printed. Both sides now split on it.
      .replace(/[^a-z0-9\s.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Label → matchable key: "Gym / fitness floor" → "gym fitness floor". */
  const labelKey = (l) => norm(l).replace(/[/,-]/g, " ").replace(/\s+/g, " ").trim();

  /** Within one DAMERAU edit — substitution, insertion, deletion, or ADJACENT TRANSPOSITION.
   *
   * ITERATION 2. This was plain Levenshtein and the corpus caught it immediately: `pickelball`
   * scored FAIL. A swapped adjacent pair is TWO Levenshtein edits but ONE Damerau edit, and
   * transposition is the typo people actually make on a keyboard — on the single most likely query
   * this product will ever receive. Plain Levenshtein would have shipped a search box that does not
   * forgive `pickelball`. */
  function within1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la === lb && a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; continue; } // transposition
      if (la > lb) i++;
      else if (lb > la) j++;
      else { i++; j++; }
    }
    if (i < la || j < lb) edits++;
    return edits <= 1;
  }

  // ── the searchable index, built once ──────────────────────────────────────────────────────────
  function buildIndex() {
    const entries = [];
    const push = (key, kind, value, label, source) =>
      entries.push({ key, kind, value, label, source, words: key.split(" ").length });

    D.SPACE_TYPES.forEach((t) => push(labelKey(t.label), "spaceType", t.value, t.label, "label"));
    D.ACTIVITY_TAGS.forEach((t) => push(labelKey(t.label), "activityTag", t.value, t.label, "label"));
    D.AMENITIES.forEach((t) => push(labelKey(t.label), "amenity", t.value, t.label, "label"));

    // The machine values too ("gym_fitness_floor" → "gym fitness floor"), so a shared URL that
    // carries a raw value still resolves if a booker pastes it into the box.
    D.SPACE_TYPES.forEach((t) => push(t.value.replace(/_/g, " "), "spaceType", t.value, t.label, "value"));
    D.ACTIVITY_TAGS.forEach((t) => push(t.value.replace(/_/g, " "), "activityTag", t.value, t.label, "value"));

    Object.entries(D.SYNONYMS).forEach(([word, target]) => {
      const st = D.SPACE_TYPES.find((t) => t.value === target);
      const at = D.ACTIVITY_TAGS.find((t) => t.value === target);
      const am = D.AMENITIES.find((t) => t.value === target);
      const hit = st || at || am;
      if (hit) push(norm(word), st ? "spaceType" : at ? "activityTag" : "amenity", hit.value, hit.label, "synonym");
    });

    // Catalog places: the neighborhood and the city are each independently typeable.
    const seen = new Set();
    D.CATALOG.forEach((p) => {
      if (p.neighborhood) {
        push(norm(p.neighborhood), "neighborhood", p.neighborhood, `${p.neighborhood}, ${p.city}`, "catalog");
      }
      if (!seen.has(p.city)) {
        seen.add(p.city);
        const inCity = D.CATALOG.filter((q) => q.city === p.city);
        push(norm(p.city), "city", p.city, p.city, "catalog");
        // centroid of the city's places, for the map's initial viewport
        const lat = inCity.reduce((s, q) => s + q.lat * q.n, 0) / inCity.reduce((s, q) => s + q.n, 0);
        const lng = inCity.reduce((s, q) => s + q.lng * q.n, 0) / inCity.reduce((s, q) => s + q.n, 0);
        entries[entries.length - 1].centroid = { lat, lng };
        entries[entries.length - 1].count = inCity.reduce((s, q) => s + q.n, 0);
      }
    });
    // attach centroid/count to neighborhood entries
    entries.forEach((e) => {
      if (e.kind !== "neighborhood") return;
      const p = D.CATALOG.find((q) => q.neighborhood === e.value);
      if (p) { e.centroid = { lat: p.lat, lng: p.lng }; e.count = p.n; }
    });

    // Longest phrases first so "multi sport court" beats "court", "ortigas center" beats "ortigas".
    entries.sort((a, b) => b.words - a.words || b.key.length - a.key.length);
    return entries;
  }

  const INDEX = buildIndex();
  const MAX_PHRASE = Math.max(...INDEX.map((e) => e.words), 3);

  // ── temporal ──────────────────────────────────────────────────────────────────────────────────
  function resolveTemporal(phrase, now) {
    const rule = D.TEMPORAL[phrase];
    if (rule === undefined) return null;
    const base = new Date(now.getTime());
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (typeof rule === "number") { base.setDate(base.getDate() + rule); return { date: iso(base), how: phrase }; }
    if (rule === "weekend") {
      const delta = (6 - base.getDay() + 7) % 7; // next Saturday (today if Saturday)
      base.setDate(base.getDate() + delta);
      return { date: iso(base), how: phrase };
    }
    if (rule.startsWith("dow:")) {
      const want = Number(rule.slice(4));
      const delta = (want - base.getDay() + 7) % 7 || 7; // always FORWARD; "monday" on a Monday means next Monday
      base.setDate(base.getDate() + delta);
      return { date: iso(base), how: phrase };
    }
    return null;
  }

  // ── the router ────────────────────────────────────────────────────────────────────────────────
  /**
   * @param {string} input        raw text from the one box
   * @param {object} opts
   * @param {Date}   opts.now     injected clock (deterministic tests)
   * @param {Function} opts.geocode  async (residue) => {lat,lng,label} | null — stage 5 only
   * @returns {{params, matches, residue, trace}}
   */
  async function route(input, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const trace = [];
    const t0 = Date.now();

    const text = norm(input);
    if (!text) {
      trace.push({ stage: "S0", note: "empty input — default browse view (D-30)" });
      return { params: {}, matches: [], suggestions: [], residue: "", trace, ms: Date.now() - t0 };
    }

    let tokens = text.split(" ");
    const taken = new Array(tokens.length).fill(false);
    let matches = [];

    // S1 + S2 + S3 share ONE longest-phrase-first sweep, so a phrase can never be split across two
    // stages ("ortigas center" is one place, not "ortigas" + a stray "center").
    for (let len = Math.min(MAX_PHRASE, tokens.length); len >= 1; len--) {
      for (let i = 0; i + len <= tokens.length; i++) {
        if (taken.slice(i, i + len).some(Boolean)) continue;
        const phrase = tokens.slice(i, i + len).join(" ");

        // S1 — temporal
        const when = resolveTemporal(phrase, now);
        if (when) {
          matches.push({ stage: "S1", kind: "date", value: when.date, label: phrase, confidence: 1, span: [i, i + len] });
          const w = D.TEMPORAL_WINDOW[phrase];
          if (w) matches.push({ stage: "S1", kind: "window", value: w, label: phrase, confidence: 1, span: [i, i + len] });
          for (let k = i; k < i + len; k++) taken[k] = true;
          continue;
        }

        // S1b — "near me" / "nearby": absorbs the separate `Use my location` button
        if (D.GEO_SELF.has(phrase)) {
          matches.push({ stage: "S1b", kind: "useMyLocation", value: true, label: phrase, confidence: 1, span: [i, i + len] });
          for (let k = i; k < i + len; k++) taken[k] = true;
          continue;
        }

        // S2/S3 — exact against the closed vocabulary, then the catalog
        const exact = INDEX.find((e) => e.words === len && e.key === phrase);
        if (exact) {
          matches.push({
            stage: exact.kind === "city" || exact.kind === "neighborhood" ? "S3" : "S2",
            kind: exact.kind, value: exact.value, label: exact.label, confidence: 1,
            via: exact.source, centroid: exact.centroid, count: exact.count, span: [i, i + len],
          });
          for (let k = i; k < i + len; k++) taken[k] = true;
        }
      }
    }

    // S3b — CATALOG PREFIX. ITERATION 2, and the most product-relevant of the three corrections.
    //
    // `basketball court in ortigas` scored FAIL because the catalog stores the neighborhood as
    // "Ortigas Center" and nobody types the "Center". A booker types the SHORT form of a district
    // — Ortigas, Alabang, Poblacion — and the long form is an artifact of how a host filled in an
    // address field. Requiring the full stored string would have made the catalog stage look far
    // weaker than it is, and would have pushed the exact queries this spike exists to serve down
    // into the geocoder that research already proved answers them wrongly.
    //
    // Guarded on UNIQUENESS: a prefix matching two catalog entries is genuinely ambiguous and is
    // left for the residue rather than guessed. Confidence is 0.9, never 1 — it is an inference.
    for (let i = 0; i < tokens.length; i++) {
      if (taken[i]) continue;
      const tok = tokens[i];
      if (tok.length < 4) continue;
      const hits = INDEX.filter(
        (e) => (e.kind === "city" || e.kind === "neighborhood") &&
               e.key !== tok && e.key.split(" ")[0] === tok,
      );
      if (hits.length !== 1) continue;
      const e = hits[0];
      matches.push({
        stage: "S3b", kind: e.kind, value: e.value, label: e.label, confidence: 0.9,
        via: `prefix:${tok}`, centroid: e.centroid, count: e.count, span: [i, i + 1],
      });
      // ITERATION 4 — deliberately does NOT consume the token. A low-confidence match is an OFFER,
      // and an offer that swallows the word leaves the booker with an empty result set and a hint.
      // The token still falls through to the free-text residue, so a booker who typed a short
      // district name gets whatever `q` finds AND the precise place chip to confirm.
    }

    // S2b — fuzzy, single tokens only, and only for words long enough that an edit is a typo rather
    // than a different word. "tennis"/"dennis" is a real risk at length 5; at 6+ it is not.
    tokens.forEach((tok, i) => {
      if (taken[i] || tok.length < 6) return;
      const near = INDEX.find((e) => e.words === 1 && within1(e.key, tok));
      if (!near) return;
      matches.push({
        stage: "S2b",
        kind: near.kind, value: near.value, label: near.label, confidence: 0.8,
        via: "fuzzy:" + tok, centroid: near.centroid, count: near.count, span: [i, i + 1],
      });
      // ITERATION 4 — see S3b. `pickelball` scored FAIL because the fuzzy rule consumed the token
      // and the search ran with NO parameters at all: the booker got the default browse view plus a
      // "did you mean", which is worse than the typo. The word stays in the residue.
    });

    // Connectives are consumed silently — they carried meaning by joining, not by being.
    tokens.forEach((tok, i) => { if (!taken[i] && D.CONNECTIVES.has(tok)) taken[i] = true; });

    const residue = tokens.filter((_, i) => !taken[i]).join(" ").trim();

    // ── assemble params ─────────────────────────────────────────────────────────────────────────
    //
    // ITERATION 3 — THE CONFIDENCE SPLIT, and it is the spike's most important correction.
    //
    // `edge-cases.js` P1 measured a 4-of-9 FALSE-POSITIVE rate on words that must claim nothing:
    // `dennis` became category=tennis and `dancer` became category=dance, both through the fuzzy
    // rule. A wrong category is strictly worse than no category — it does not merely fail to help,
    // it SILENTLY DELETES every listing the booker wanted, and the results page has no way to say
    // so. P2 then found the same shape in the prefix rule at catalog scale: `ayala` resolved
    // uniquely, and therefore confidently, to "Ayala Alabang" — a different city twenty kilometres
    // from the Ayala a Manila booker means.
    //
    // So the rule is now: ONLY confidence-1.0 matches (an exact hit in the closed vocabulary, or an
    // exact hit in our own catalog) become PARAMS. Everything inferred — fuzzy, prefix — becomes a
    // visible SUGGESTION the booker confirms. Uniqueness is not correctness, and the router is not
    // entitled to act on a guess it cannot show.
    //
    // This is D-137 ("never surprise them") applied to search, and it is why the corpus expectation
    // for `pickelball` was rewritten mid-spike rather than the measurement being explained away.
    const CONFIDENT = 1;
    const suggestions = matches.filter((m) => m.confidence < CONFIDENT);
    matches = matches.filter((m) => m.confidence >= CONFIDENT);

    const params = {};
    const cat = matches.find((m) => m.kind === "spaceType" || m.kind === "activityTag");
    if (cat) params.category = cat.value; // ONE combined param — D-35, unchanged
    const amenities = matches.filter((m) => m.kind === "amenity").map((m) => m.value);
    if (amenities.length) params.amenity = amenities; // ⚠ NET-NEW param — no server support today
    const place = matches.find((m) => m.kind === "neighborhood") || matches.find((m) => m.kind === "city");
    if (place) {
      params.place = place.value;
      params.placeKind = place.kind;
      if (place.centroid) { params.lat = place.centroid.lat; params.lng = place.centroid.lng; }
    }
    if (matches.some((m) => m.kind === "useMyLocation")) params.useMyLocation = true;
    const date = matches.find((m) => m.kind === "date");
    if (date) params.date = date.value;
    const win = matches.find((m) => m.kind === "window");
    if (win) { params.start = win.value.start; params.end = win.value.end; }

    trace.push({
      stage: "S1-S3", ms: Date.now() - t0,
      note: `${matches.length} match(es) from the closed set + catalog; residue=${JSON.stringify(residue)}`,
    });

    // S4/S5 — only the residue reaches the open world.
    if (residue) {
      const looksLikeAddress = /\d/.test(residue) || /\b(street|st|ave|avenue|road|rd|drive|blvd|boulevard|corner|cor)\b/.test(residue);
      if (looksLikeAddress && opts.geocode) {
        const g = await opts.geocode(residue);
        trace.push({ stage: "S5", note: `geocoded ${JSON.stringify(residue)} → ${g ? g.label : "no result"}` });
        if (g) { params.lat = g.lat; params.lng = g.lng; params.origin = g.label; delete params.place; delete params.placeKind; }
        else params.q = residue;
      } else {
        params.q = residue; // ⚠ NET-NEW param — spike 002 decides whether this is affordable at 0025
        trace.push({ stage: "S4", note: `residue → free-text q (needs spike 002 verdict)` });
      }
    }

    return { params, matches, suggestions, residue, trace, ms: Date.now() - t0 };
  }

  /** The Photon call, as stage 5 would really make it — bbox-clamped to the launch region.
   *  The bbox is NOT decoration: without it, research measured US results for a PH query. */
  const LAUNCH_BBOX = "120.90,14.35,121.15,14.78"; // Metro Manila (minLon,minLat,maxLon,maxLat)
  function photonGeocoder(fetchImpl) {
    return async function (residue) {
      const url = `https://photon.komoot.io/api?q=${encodeURIComponent(residue)}&limit=1&bbox=${LAUNCH_BBOX}`;
      try {
        const res = await fetchImpl(url);
        const json = await res.json();
        const f = json.features && json.features[0];
        if (!f) return null;
        const p = f.properties || {};
        return {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          label: [p.name, p.district, p.city].filter(Boolean).join(", "),
          type: p.type,
          extent: p.extent || null, // a free bbox when OSM has one — MAP-02 material
        };
      } catch (e) {
        return null;
      }
    };
  }

  root.SpikeRouter = { route, norm, within1, INDEX, photonGeocoder, LAUNCH_BBOX };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SpikeRouter;
})(typeof globalThis !== "undefined" ? globalThis : this);
