-- Generated migration (Phase 18, HVER-02 / LVER-04, D-220/D-221/D-240) — the host_verification_status /
-- listing_review_state TYPES, the host_verification / listing_review TABLES, the listing.review_state
-- COLUMN, the two OPS-04 review-queue partial INDEXES, and the D-207 GRANDFATHER BACKFILL.
-- Produced by `drizzle-kit generate` (the drizzle/0024 rule — only what the generator cannot emit is
-- hand-written) and then hand-edited in THREE load-bearing ways:
--
-- (a) NO 55P04 SPLIT IS NEEDED FOR THE TYPES IN THIS FILE, and that is a probed fact rather than a
-- reading. Both `host_verification_status` and `listing_review_state` are BRAND-NEW
-- `CREATE TYPE ... AS ENUM`, and a brand-new type may be created and USED in the same transaction —
-- PROBED on this project's own PostgreSQL 18.4 (18-RESEARCH § F3). The Postgres 55P04 restriction
-- ("unsafe use of new value") applies ONLY to `ALTER TYPE ... ADD VALUE` on an ALREADY-COMMITTED type,
-- and both migrators wrap ALL pending migrations in ONE transaction. That is the 0010/0012 and 0020/0021
-- split, and it is exclusive to ADD VALUE. The `ALTER TYPE cancelled_by ADD VALUE ...` that
-- `drizzle-kit generate` emitted INTO this file was therefore MOVED OUT to drizzle/0027, which does
-- nothing else — see D-244 and the header there.
--
-- ⚠ AND THE NEW cancelled_by LABEL IS DELIBERATELY NOT SPELLED ANYWHERE IN THIS FILE, not even in this
-- paragraph. drizzle/0021's header established the rule and the reason: the phase's tripwire is a grep
-- for the single-quoted literal over every migration, so a header that names the token would invalidate
-- its own gate. tests/design/enum-first-use-tripwire.test.ts mechanises that grep.
--
-- (b) THE BACKFILL TAKES THE drizzle/0014 SHAPE, NOT drizzle/0017's (D-240, and this is a SCOPE call
-- rather than a mechanism call). 0017's `ADD COLUMN ... DEFAULT 'x' NOT NULL` backfills EVERY ROW BY
-- CONSTRUCTION, which here would grandfather DRAFTS — granting review-free standing to listings that
-- were never live and that nobody has ever seen. 0014's shape — a DEFAULT plus a SCOPED, IDEMPOTENT
-- `UPDATE ... WHERE ...` — backfills exactly the rows named. D-207 grandfathers what is ALREADY SELLING
-- and nothing else, so the two grandfather statements below carry an explicit predicate.
--
--     INTENDED CONSEQUENCES, stated here so they read as decisions and not as oversights:
--       • `draft` rows become 'pending'. A draft that publishes after this phase goes through review
--         like any new listing. It was never live, so nothing breaks and nobody is interrupted.
--       • `unlisted` rows become 'pending'. Not selling today, so gating it costs no live supply.
--       • A soft-deleted (`deleted_at IS NOT NULL`) published row becomes 'pending' — it is not selling.
--       • A host is grandfathered IFF they own at least one row the UPDATE touched. A host with only
--         drafts starts with NO host_verification row at all, which the gate reads as 'unverified'
--         (fail closed) — deliberately NOT 'grandfathered'.
--
-- (c) THE COLUMN DEFAULT AND ITS BACKFILL SHIP IN THE SAME FILE, ON PURPOSE (T-18-0203). `review_state`
-- defaults to 'pending' and `deriveBookable` refuses a 'pending' listing, so a deploy in which the column
-- landed without the backfill would make THE ENTIRE LIVE CATALOGUE UNSELLABLE for the length of that
-- window. There is no such window: one file, one transaction.
--
-- BOTH GRANDFATHER STATEMENTS ARE RE-RUNNABLE AND CANNOT MOVE A DECIDED ROW (T-18-0205). The UPDATE
-- carries `AND "review_state" = 'pending'`, so a row an operator has since set to 'approved' or
-- 'rejected' is structurally out of its reach; the INSERT carries `ON CONFLICT ("user_id") DO NOTHING`.
-- Re-running the pair is a no-op, which is what makes them safe to replay.
--
-- A MIGRATION IS NEVER VERIFIED WITH `tsc` (drizzle/0025:30-34). The row types come from schema.ts, so a
-- column declared there but never migrated leaves the type checker and `next build` perfectly green.
-- The proof is the replay: tests/ops/verification-schema.test.ts asserts host_verification's EXACT column
-- set against `information_schema.columns` in the replayed schema, and tests/ops/grandfather-backfill.test.ts
-- reads the two statements below OFF THIS FILE and executes them (the backfill is a NO-OP in every other
-- test file, because setupTestDb() replays into an EMPTY schema — a test asserting against the live test
-- database would pass vacuously while proving nothing).
--
-- Unqualified table/type names throughout (the schema-qualified default-schema prefixes drizzle-kit
-- emits were stripped, mirroring drizzle/0013/0017/0021) so the integration harness (tests/helpers/db.ts)
-- replays this idempotently into every isolated schema — unqualified objects resolve via the
-- schema-first search_path.
CREATE TYPE "host_verification_status" AS ENUM('unverified', 'pending', 'approved', 'rejected', 'grandfathered', 'suspended');--> statement-breakpoint
CREATE TYPE "listing_review_state" AS ENUM('pending', 'approved', 'rejected', 'grandfathered', 'withdrawn');--> statement-breakpoint
CREATE TABLE "host_verification" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" "host_verification_status" DEFAULT 'unverified' NOT NULL,
	"provider" text NOT NULL,
	"vendor_ref" text,
	"result" text,
	"checked_at" timestamp with time zone,
	"decided_by_staff_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_review" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"state" "listing_review_state" NOT NULL,
	"reason" text,
	"decided_by_staff_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "review_state" "listing_review_state" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "host_verification" ADD CONSTRAINT "host_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_review" ADD CONSTRAINT "listing_review_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "host_verification_queue_idx" ON "host_verification" USING btree ("created_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "listing_review_listing_idx" ON "listing_review" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_review_state_idx" ON "listing" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "listing_review_queue_idx" ON "listing" USING btree ("created_at") WHERE review_state = 'pending';--> statement-breakpoint
-- ── THE D-207 / D-240 GRANDFATHER BACKFILL (hand-appended; the generator emits no data statement) ──
--
-- STATEMENT ONE — the listings. Every listing that is SELLING at migration time, and only those.
-- The third predicate (`AND "review_state" = 'pending'`) is what makes this re-runnable and what makes
-- it STRUCTURALLY unable to move a row an operator has already decided: an 'approved' or 'rejected' row
-- does not match, so no re-run can silently re-grandfather it (T-18-0205).
UPDATE "listing" SET "review_state" = 'grandfathered' WHERE "status" = 'published' AND "deleted_at" IS NULL AND "review_state" = 'pending';--> statement-breakpoint
-- STATEMENT TWO — the hosts, on the SAME predicate, so the two sides of the sell-gate cannot disagree.
--
-- `checked_at` STAYS NULL AND `provider` SAYS 'migration' BECAUSE NOTHING WAS CHECKED (T-18-0202). Writing
-- a timestamp for a check that never happened would fabricate an audit record — the drizzle/0025
-- `resolved_by` principle, applied to a second column. The NULL is spelled out rather than omitted so the
-- absence reads as a decision. `status` is 'grandfathered' and NEVER 'approved': D-211 keeps the state
-- first-class and distinct, so a future PM burns the backlog down with ONE statement
-- (`UPDATE host_verification SET status = 'pending' WHERE status = 'grandfathered'`) and so the
-- verification badge — which renders for 'approved' only (D-212) — never claims a check FitOut did not do.
--
-- `ON CONFLICT ("user_id") DO NOTHING` is the idempotence half AND the never-overwrite-a-decision half: a
-- host who already carries a row (approved, rejected, suspended — any of them) is left exactly as they are.
--
-- A HOST WITH ONLY DRAFTS GETS NO ROW AT ALL, deliberately. `deriveBookable` reads a missing row as
-- 'unverified' and refuses — fail closed, never verified by absence.
--
-- ⚠ THE EXPLICIT CASTS ARE LOAD-BEARING, AND THIS WAS MEASURED RATHER THAN ANTICIPATED. Written without
-- them, `npm run db:migrate` failed on this statement with:
--     42804  column "status" is of type host_verification_status but expression is of type text
-- `SELECT DISTINCT` has to resolve every output column to a CONCRETE type before it can de-duplicate, so
-- the bare `'grandfathered'` literal is settled as `text` at that point and never gets the chance to be
-- coerced to the enum on assignment — which is what an ordinary `INSERT ... VALUES ('grandfathered')`
-- relies on. `NULL` is cast for the same reason. The DISTINCT is not optional either: a host with three
-- published listings must produce ONE row, and the PK would 23505 without it (ON CONFLICT would absorb
-- that, but only by making a row count depend on conflict handling rather than on the SELECT).
INSERT INTO "host_verification" ("user_id", "status", "provider", "checked_at", "created_at", "updated_at") SELECT DISTINCT l."host_id", 'grandfathered'::"host_verification_status", 'migration'::text, NULL::timestamptz, now(), now() FROM "listing" l WHERE l."status" = 'published' AND l."deleted_at" IS NULL ON CONFLICT ("user_id") DO NOTHING;
