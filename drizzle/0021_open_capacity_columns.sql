-- Custom SQL migration (Phase 9, D-124/D-125, RESEARCH §Migration Sequence) — BACKFILL-FREE. Both columns
-- are nullable or carry a DEFAULT: listing.per_head_price_cents is nullable (every existing exclusive
-- listing keeps NULL), booking.open_capacity carries NOT NULL DEFAULT false so every pre-Phase-9 booking row
-- reads exclusive by construction and the 0022 EXCLUDE narrow is a no-op for them.
--
-- Unqualified table names throughout (the schema-qualified public. prefixes drizzle-kit emits are stripped,
-- mirroring drizzle/0013/0017) so the integration harness (tests/helpers/db.ts) replays this idempotently
-- into every isolated schema. NOTE: this file must NEVER name the open_capacity ENUM VALUE added by 0020
-- (55P04) — open_capacity here is a BOOLEAN COLUMN on booking, unrelated to the enum and always safe. The
-- quoted enum literal is deliberately absent from this file even in comments, so the phase's grep gate
-- (a search for the single-quoted literal over every migration after 0020 must print 0) stays a real,
-- usable tripwire rather than a check that always trips on prose.
ALTER TABLE "listing" ADD COLUMN "per_head_price_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "open_capacity" boolean DEFAULT false NOT NULL;
