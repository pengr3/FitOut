// Group + RSVP validation (Zod 4) — the SINGLE re-validation boundary for everything that crosses into the
// group server actions. Clones the src/lib/validation/notification.ts + listing.ts contract: one schema owns
// the shape, and the shape is re-parsed SERVER-SIDE at the top of every action. Server-action argument types
// are NOT enforced at runtime (a crafted POST lands here raw), so nothing upstream is trusted (Security V5).
//
// TWO SHAPES, and the asymmetry between them is the point:
//   - createGroupSchema : one field. There is deliberately no capacity field — `capacity_snapshot` is read
//                         from the LISTING inside the write (D-111), so there is no request shape in which a
//                         client could propose its own cap.
//   - rsvpSchema        : the PUBLIC path's body (GROUP-03). Name required, email OPTIONAL (D-117 — a
//                         blank-email guest is a valid, supported RSVP), answer a two-value enum. There is
//                         deliberately NO quantity/+guests field: one RSVP is one person (D-120), and the
//                         absence of the field is what makes that structurally true rather than merely
//                         enforced.
//
// The guest NAME is attacker-controlled free text rendered to the organizer and mailed out (G6/T-08-08). It
// is bounded here and escaped at every render/send site — bounding it here keeps an unbounded string out of
// a durable row and out of an email subject.

import { z } from "zod";

/** Bound on a guest-typed display name. Long enough for a real name, short enough not to be a payload. */
const NAME_MAX = 80;
/** RFC-ish practical ceiling; the same bound the durable `guest_email_norm` column should ever see. */
const EMAIL_MAX = 200;

/**
 * The optional attendee email (D-117 / G2).
 *
 * TRIMMED FIRST, VALIDATED SECOND — and that order is load-bearing, not tidiness. `z.email()` rejects
 * surrounding whitespace, and a mobile keyboard or an autofill routinely appends a trailing space; validating
 * before trimming turns `"gina@example.com "` into "We couldn't save your RSVP", which is a dead end on the
 * one field the product promises is OPTIONAL and low-stakes.
 *
 * Accepts a real address OR blank (empty / all-whitespace), because an optional text input submits `""`
 * rather than `undefined` — treating `""` as a validation failure would make "leave it blank" an error
 * state, which is precisely the gate D-117 says the email must not be. Every blank shape collapses to
 * `undefined` so exactly ONE downstream branch exists ("no address"). Case is left alone here: lowercasing
 * is `normalizeEmail`'s job, because that value is a de-dup KEY rather than a display string.
 */
const optionalEmail = z
  .string()
  .trim()
  .max(EMAIL_MAX)
  .optional()
  .refine((v) => v === undefined || v === "" || z.email().safeParse(v).success, {
    message: "Enter a valid email address, or leave it blank.",
  })
  .transform((v) => (v === "" || v === undefined ? undefined : v));

/**
 * The public RSVP body. `answer` is an enum, not a boolean: "yes" and "no" are two different rows in the
 * roster and two different sentences in the organizer's notification, and a boolean would invite a third
 * "unanswered" meaning that has no row.
 */
export const rsvpSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  email: optionalEmail,
  answer: z.enum(["yes", "no"]),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

/** The ONLY field createGroup accepts. No capacity, no token — both are server-minted (D-111/D-118). */
export const createGroupSchema = z.object({
  bookingId: z.string().min(1).max(128),
});

/** Identity of an existing group/rsvp for the organizer-management actions. Ids only; never a name. */
export const groupIdSchema = z.object({ groupId: z.string().min(1).max(128) });
export const rsvpIdSchema = z.object({ rsvpId: z.string().min(1).max(128) });

/**
 * The bearer invite credential as it arrives from the URL. Shape-bounded (Crockford symbols only, exactly
 * the 20 the minter emits) so a crafted `/invite/{...}` is a calm "no longer active" rather than a query
 * carrying arbitrary text. It is a SHAPE check, never an existence check — an unknown-but-well-formed token
 * must render identically to a revoked one (T-08-17, no enumeration oracle).
 */
export const inviteTokenSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{20}$/);
