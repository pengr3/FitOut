# Marketing UI pass — October 12, 2026

Owner comments 1–13 authorize a creative redesign beyond the earlier repair-only UI spec, new photographed Preview fixtures and removal of visible capture captions. This pass retains Court palette, Geist typography, app primitives and checked same-tab destinations.

Design: left-aligned large display headlines paired with venue photographs; centered desktop navigation with equal flexible side columns; spacious product sections and larger authentic captures. Keep colors from Court (white background, foreground #0a0a0a, coral action approximately #d92335, muted neutral, white cards); no font or app-theme change. Photography is the main expressive element, with a secondary studio/fitness crop on shared-audience and player heroes. No invented venue counts, reviews or partner claims.

References inspected: Peerspace https://www.peerspace.com/ for photo-led marketplace hierarchy; Donux Sportclubby case study https://donux.com/case-studies/sportclubby for approachable sports discovery and product presentation. Final photos are separately licensed Unsplash/Pexels reference photographs; see public/marketing/photos/manifest.json.

Scope: marketing pages, shared marketing components, exact photo asset routing, capture fixtures, isolated Preview synthetic venue content and tests of these surfaces. Existing unrelated dirty app files and phase27 release work are preserved. Production Contact remains gated; the marketing page shows the existing support email while delivery is disabled.

Preview seed verified against the independently read-back schema-only branch br-silent-glade-b31mruln (nonprimary, nondefault, parent-schema). Five published/approved synthetic spaces each have a cover photograph and seven operating days. No production data or provider calls. Replay uses scripts/seed-marketing-preview.mjs, hard-bound to that branch's saved private configuration; repeat runs do not duplicate the gallery.

Verification complete: 61 focused marketing/design tests passed (six pre-existing skipped cases); 86 host/origin routing tests passed, including exact photo/method/host allowlists; 60 material-edit/review-signal tests passed. TypeScript, scoped ESLint and diff whitespace checks passed. Browser runs passed actual five-space search, empty host signup with Host a space selected, readiness roadmap, five Live host listings, selected future session and pending unpaid booking review. A separate UI run passed all five pages at 1310, 768, 375 and 320px with no horizontal overflow, decoded hero photographs, centered desktop navigation, removed captions and mobile menu/Escape focus. Desktop/mobile review PNGs are in the adjacent marketing-ui-20261012 directory. These are review artifacts, not Linux visual baselines.

Six app PNGs were refreshed through the genuine local application using the same five-space content as the isolated Preview seed. Each exact retained PNG was inspected; dimensions, hashes, provenance and approval are recorded in the screenshot manifest. The earlier inspected wizard capture is retained while app-wizard work proceeds elsewhere. Capture scripts never submit payment. Public captures contain no real personal, ID, banking or hold-query credentials. Photo credits/licenses are in the photo manifest.

The capture run exposed a client import of the server review module's node:crypto dependency. Moved the unchanged seven-field vocabulary into a pure module and re-exported it for existing server callers. Review writes and material-field behavior are covered by the 60 passing tests.

Local environment recovery: a shared test-database reset interrupted an early capture attempt, so subsequent captures and database tests ran sequentially. A later Next generated-cache write exhausted available disk space. Cleared only verified workspace webpack cache files and reran the responsive checks successfully. No source or persistent data was removed.

The redesigned marketing UI is implemented in the working tree for review. No deployment was performed by this UI pass. Production contact delivery remains subject to the existing release switch and sender configuration; the disabled state now exposes the existing support email instead of a form that cannot send. Local development retains its test form. Phase27 release decisions and unrelated dirty app work were preserved.


