-- D-23: additive Contact quota only. Earlier manual migrations already own their schema changes.
CREATE TABLE "contact_quota" (
  "key" text PRIMARY KEY NOT NULL,
  "attempts" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_quota_expiry_idx" ON "contact_quota" ("expires_at");
