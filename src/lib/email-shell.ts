// EMAIL-01 / EMAIL-02 — ONE RENDERER, AND THE ONE PLACE ANYTHING IS ESCAPED.
//
// This module turns one `EmailContent` value into an HTML document and its plain-text twin. Every
// transactional message the app sends is meant to come through here, so that markup, spacing,
// palette and escaping are decided ONCE rather than re-typed per send.
//
// PURE BY CONSTRUCTION, AND THAT IS LOAD-BEARING. There is no rendering directive on line 1, no
// environment guard, and — deliberately — no import of the mail transport. The design-gate vitest
// config loads no `setupFiles`, so the transport's mock does not exist there; a gate that asserted on
// a captured send could not run under that config at all, and therefore could not run inside
// `next build`. Because `renderEmail` is a plain exported function over a plain value, the gates can
// assert on the STRING rather than on a delivery. Its only imports are the generated token module,
// the product-theme owner and the app's own facts about itself.
//
// ── WHY THE PLAIN-TEXT PART IS A PROJECTION, NOT A STRIPPED COPY ──────────────────────────────────
//
// Both outputs derive from the SAME `EmailContent`. The text part is never produced by stripping tags
// off the HTML: a stripper re-introduces exactly the drift this shape exists to remove, and it would
// emit HTML entities into `text/plain`, where they are a defect rather than correctness. The text
// part takes the RAW strings; only the HTML part is escaped.
//
// ── ESCAPING IS STRUCTURAL (WR-01, strengthened) ──────────────────────────────────────────────────
//
// FIVE sinks are escaped here so that no composition site can forget one: the heading, every
// paragraph, the CTA label, the CTA href, and — the one the spec's own sentence does not name — the
// DERIVED preheader. The preheader is derived from content and injected into a div, which makes it an
// injection sink in the one place nobody reads. `tableHtml` is the single deliberate exception; see
// the comment on the field.
//
// ── NO ABSOLUTE LINK MAY APPEAR BEFORE THE CTA HREF ───────────────────────────────────────────────
//
// The test helper that follows verify/reset flows extracts the FIRST absolute link in the rendered
// body and hands it to `new URL(...)` to recover a token. So the document preamble carries no
// external identifier, the root element declares no namespace attribute, the wordmark is TEXT rather
// than a link, and there is no view-in-browser link and no tracking pixel. A legacy XHTML preamble
// here would hand a specification document's address to those tests as though it were a reset link,
// and the failure would surface three layers from its cause. This is a construction rule, not a
// style preference — do not reintroduce the boilerplate.
//
// ── COLOUR (EMAIL-02) ─────────────────────────────────────────────────────────────────────────────
//
// Email cannot read custom properties, so it needs literal colour values — and a literal typed by
// hand drifts. Every colour below is read from the generated token module at render time, keyed by
// the same product theme the app itself mounts. Exactly seven token keys are consumed and no others.
// Reading them INSIDE the function rather than at module scope is deliberate: a module-scope copy is
// frozen at import time, and a theme passed per call would then be ignored.
//
// Comments in this file name tokens DESCRIPTIVELY — the quiet ground, the column surface, the ink,
// the accent fill. Never by colour value and never by utility-class name: source-scanning gates read
// this tree, and three prior plans were burned by a comment that quoted what it was explaining.

import { THEME_TOKENS } from "@/lib/design/tokens.generated";
import { DEFAULT_THEME, type ThemeName } from "@/lib/design/theme";
import { SITE_TAGLINE, SUPPORT_EMAIL } from "@/lib/site";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The shell's own measurements. Declared ONCE here, never per send: a message needing a bespoke gap
// is a scope alarm, and its content belongs in paragraphs rather than in layout. Every value is a
// step on the app's own spacing ladder.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The column the message is drawn in. Old desktop clients honour the attribute; narrow ones the inline cap. */
const COLUMN_WIDTH = 600;
/** Quiet above and below the column. */
const GROUND_PADDING = "24px 0";
/** The column cell's own inset — the panel rhythm restated at email width. */
const CARD_PADDING = "32px 24px";
/** Wordmark-to-body, and rule-to-footer-text. */
const BLOCK_GAP = "24px";
/** The default distance between two elements. */
const ELEMENT_GAP = "16px";
/** A section break either side of the one action. */
const CTA_MARGIN = "24px 0";
/** Sized so the label's own line box clears the touch floor. */
const CTA_PADDING = "12px 24px";

/**
 * The app's four type roles, restated as inline declarations because email has no stylesheet. The
 * font stack is declared exactly ONCE, on the column cell — that is a size decision as much as a
 * consistency one, since mobile clients clip a message well below the desktop threshold and an
 * inline-styled table repeats every declaration it carries.
 */
const FONT_STACK = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const WORDMARK_SIZE = "18px";
const HEADING_SIZE = "20px";
const BODY_SIZE = "16px";
const LABEL_SIZE = "14px";

/**
 * Padding that keeps trailing body text out of a client's preview line. Named entities only — a
 * numeric character reference would read as a colour value to the gate that forbids one here.
 */
const PREHEADER_PADDING = "&zwnj;&nbsp;".repeat(30);

/**
 * HTML-escape a string before it is interpolated into email markup (WR-01). The verify/reset `url`
 * is library- and (for reset, via `redirectTo`) client-influenced; dropping it raw into an
 * `href="..."` attribute and into HTML text is an injection sink. We escape the five HTML-significant
 * characters so a value containing `"`, `<`, `>`, `&`, or `'` can never break out of the attribute
 * or inject markup — rather than trusting an upstream library to pre-escape content we concatenate.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * One message, stated once, rendered twice.
 *
 * Every field except `tableHtml` is RAW: the renderer escapes it for the HTML part and passes it
 * verbatim into the plain-text part.
 */
export type EmailContent = {
  /** Optional override for the preview line. Defaults to the heading, so it cannot drift from it. */
  preheader?: string;
  /** RAW — the renderer escapes it. One per message. */
  heading: string;
  /** RAW — escaped for HTML, verbatim in the text part. */
  paragraphs: string[];
  /** Label and href are both escaped for HTML; the text part gets the raw href on its own line. */
  cta?: { label: string; href: string };
  /**
   * PRE-ESCAPED raw markup, inserted untouched. The ops digest's table is its ONLY sanctioned
   * producer, and that producer escapes every field it interpolates. A second caller passing
   * anything derived from user input here creates the injection sink the rest of this module exists
   * to remove — compose paragraphs instead. A message using this slot must also pass `tableText`, or
   * its plain-text twin silently loses the content.
   */
  tableHtml?: string;
  /** The plain-text twin of `tableHtml`. */
  tableText?: string;
};

/**
 * Render one message. Returns the HTML document and its plain-text twin, both derived from the same
 * value, so neither can drift from the other.
 */
export function renderEmail(
  content: EmailContent,
  theme: ThemeName = DEFAULT_THEME,
): { html: string; text: string } {
  // Read INSIDE the function — see the header. Exactly seven keys, and no others.
  const palette = THEME_TOKENS[theme];
  const ground = palette["--muted"].hex; // the quiet ground behind the column
  const surface = palette["--card"].hex; // the column itself
  const ink = palette["--foreground"].hex; // wordmark, heading, body
  const quietInk = palette["--muted-foreground"].hex; // the footer's voice
  const rule = palette["--border"].hex; // the hairline above the footer
  const accent = palette["--brand"].hex; // the one accent, on the one action
  const accentInk = palette["--brand-foreground"].hex; // the label on that accent

  // The support slot: ONE guarded branch, and no else. While the app has no monitored inbox nothing
  // about support appears in either output — no placeholder, no dead link, no "coming soon". The day
  // that constant becomes a string, both projections light up together from this one site.
  const support =
    SUPPORT_EMAIL !== null
      ? {
          html:
            `<div style="font-size:${LABEL_SIZE};line-height:1.43;color:${quietInk}">Questions? Email ` +
            `<a href="` +
            `mailto:${SUPPORT_EMAIL}` +
            `" style="color:${quietInk}">${escapeHtml(SUPPORT_EMAIL)}</a>.</div>`,
          text: `Questions? Email ${SUPPORT_EMAIL}.`,
        }
      : null;

  // The preview line, derived so it cannot drift — and escaped, because it is derived from raw
  // content and lands in markup. Its own ink is the column surface read from the token module; a
  // hand-typed white here would be an eighth colour value and would fail the palette gate.
  const preheader =
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;` +
    `overflow:hidden;mso-hide:all;color:${surface}">` +
    escapeHtml(content.preheader ?? content.heading) +
    PREHEADER_PADDING +
    `</div>`;

  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 ${ELEMENT_GAP};font-size:${BODY_SIZE};line-height:1.5;color:${ink}">` +
        escapeHtml(paragraph) +
        `</p>`,
    )
    .join("");

  const cta = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${CTA_MARGIN}">` +
      `<tr><td bgcolor="${accent}" style="background:${accent};border-radius:8px">` +
      `<a href="${escapeHtml(content.cta.href)}" style="display:inline-block;padding:${CTA_PADDING};` +
      `font-size:${BODY_SIZE};line-height:1.5;font-weight:600;text-decoration:none;color:${accentInk}">` +
      escapeHtml(content.cta.label) +
      `</a></td></tr></table>`
    : "";

  const html =
    `<!DOCTYPE html>` +
    `<html lang="en">` +
    `<head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(content.heading)}</title>` +
    `</head>` +
    `<body style="margin:0;padding:0;background:${ground}">` +
    preheader +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${ground}">` +
    `<tr><td align="center" style="padding:${GROUND_PADDING}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${COLUMN_WIDTH}" ` +
    `style="max-width:100%;background:${surface}">` +
    `<tr><td style="padding:${CARD_PADDING};font-family:${FONT_STACK}">` +
    // The wordmark is TEXT, never a link — a link here would put an app address ahead of the CTA.
    `<div style="font-size:${WORDMARK_SIZE};font-weight:600;letter-spacing:-0.02em;color:${ink};` +
    `padding-bottom:${BLOCK_GAP}">FitOut</div>` +
    `<h1 style="margin:0 0 ${ELEMENT_GAP};font-size:${HEADING_SIZE};line-height:1.3;font-weight:600;color:${ink}">` +
    escapeHtml(content.heading) +
    `</h1>` +
    paragraphs +
    // The one pre-escaped slot. Inserted raw ON PURPOSE; its producer owns its own escaping.
    (content.tableHtml ?? "") +
    cta +
    `<div style="border-top:1px solid ${rule};padding-top:${BLOCK_GAP}">` +
    `<div style="font-size:${LABEL_SIZE};line-height:1.43;font-weight:600;color:${quietInk}">FitOut</div>` +
    `<div style="font-size:${LABEL_SIZE};line-height:1.43;color:${quietInk}">${escapeHtml(SITE_TAGLINE)}</div>` +
    (support?.html ?? "") +
    `</div>` +
    `</td></tr></table>` +
    `</td></tr></table>` +
    `</body></html>`;

  // The same value, projected again. RAW strings throughout — escaping `text/plain` would be a defect.
  const blocks: string[] = [content.heading, ...content.paragraphs];
  if (content.tableText) blocks.push(content.tableText);
  if (content.cta) blocks.push(`${content.cta.label}: ${content.cta.href}`);

  const footer = ["FitOut", SITE_TAGLINE];
  if (support) footer.push(support.text);

  const text = `${blocks.join("\n\n")}\n\n${footer.join("\n")}`;

  return { html, text };
}
