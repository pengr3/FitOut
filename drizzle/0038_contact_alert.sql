-- Contact-only durable incidents; no inquiry, IP, sender or payment data.
CREATE TABLE "contact_alert" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "kind" text DEFAULT 'global_budget' NOT NULL CHECK (kind = 'global_budget'),
  "attempt_count" integer DEFAULT 100 NOT NULL CHECK (attempt_count = 100),
  "synthetic" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "sent_at" timestamp with time zone,
  "provider_id" text
);
--> statement-breakpoint
CREATE INDEX "contact_alert_pending_idx" ON "contact_alert" ("created_at") WHERE sent_at IS NULL;
