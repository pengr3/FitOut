CREATE TABLE "background_task" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_kind" text NOT NULL,
  "entity_id" text NOT NULL,
  "kind" text NOT NULL,
  "generation" text NOT NULL,
  "due_at" timestamptz NOT NULL,
  "available_at" timestamptz NOT NULL,
  "check_number" integer DEFAULT 0 NOT NULL,
  "publish_attempts" integer DEFAULT 0 NOT NULL,
  "lease_until" timestamptz,
  "published_at" timestamptz,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "background_task_ready_idx" ON "background_task" ("available_at")
  WHERE published_at IS NULL AND completed_at IS NULL AND cancelled_at IS NULL;
--> statement-breakpoint
CREATE INDEX "background_task_entity_idx" ON "background_task" ("entity_kind", "entity_id");
--> statement-breakpoint
CREATE FUNCTION "public"."enqueue_background_change"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entity_type text := TG_ARGV[0]; entity_key text; generation_key text := gen_random_uuid()::text;
BEGIN
  entity_key := CASE WHEN entity_type = 'verification' THEN to_jsonb(NEW)->>'user_id' ELSE to_jsonb(NEW)->>'id' END;
  IF entity_type = 'payout' AND to_jsonb(NEW)->>'kind' <> 'payout' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF entity_type = 'booking' THEN
      IF ROW(NEW.status,NEW.expires_at,NEW.checkout_session_id,NEW.starts_at,NEW.ends_at,NEW.payment_id) IS NOT DISTINCT FROM
        ROW(OLD.status,OLD.expires_at,OLD.checkout_session_id,OLD.starts_at,OLD.ends_at,OLD.payment_id) THEN RETURN NEW; END IF;
    ELSIF entity_type = 'verification' THEN
      IF ROW(NEW.status,NEW.vendor_ref) IS NOT DISTINCT FROM ROW(OLD.status,OLD.vendor_ref) THEN RETURN NEW; END IF;
    ELSIF entity_type = 'payout' THEN
      IF ROW(NEW.state,NEW.transfer_id) IS NOT DISTINCT FROM ROW(OLD.state,OLD.transfer_id) THEN RETURN NEW; END IF;
    END IF;
  END IF;
  -- Supersede queued timers in the same transaction as the changed deadline/state.
  UPDATE "public"."background_task" SET cancelled_at=now()
    WHERE entity_kind=entity_type AND entity_id=entity_key AND completed_at IS NULL AND cancelled_at IS NULL;
  INSERT INTO "public"."background_task" (id,entity_kind,entity_id,kind,generation,due_at,available_at)
    VALUES (generation_key,entity_type,entity_key,'plan',generation_key,now(),now());
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "booking_background_change" AFTER INSERT OR UPDATE OF status,expires_at,checkout_session_id,starts_at,ends_at,payment_id
  ON "public"."booking" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_background_change"('booking');
--> statement-breakpoint
CREATE TRIGGER "verification_background_change" AFTER INSERT OR UPDATE OF status,vendor_ref
  ON "public"."host_verification" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_background_change"('verification');
--> statement-breakpoint
CREATE TRIGGER "payout_background_change" AFTER INSERT OR UPDATE OF state,transfer_id
  ON "public"."host_payout_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_background_change"('payout');
--> statement-breakpoint
CREATE TRIGGER "contact_background_change" AFTER INSERT ON "public"."contact_alert"
  FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_background_change"('contact');
--> statement-breakpoint
-- Existing records get their first durable planner. No domain state or financial record is changed.
INSERT INTO "background_task" (id,entity_kind,entity_id,kind,generation,due_at,available_at)
  SELECT 'bootstrap:booking:'||id,'booking',id,'plan','bootstrap:booking:'||id,now(),now() FROM "booking"
  WHERE status IN ('requested','pending','approved','confirmed','completed') OR payment_id IS NOT NULL;
--> statement-breakpoint
INSERT INTO "background_task" (id,entity_kind,entity_id,kind,generation,due_at,available_at)
  SELECT 'bootstrap:verification:'||user_id,'verification',user_id,'plan','bootstrap:verification:'||user_id,now(),now()
  FROM "host_verification" WHERE status='pending' AND vendor_ref IS NOT NULL;
--> statement-breakpoint
INSERT INTO "background_task" (id,entity_kind,entity_id,kind,generation,due_at,available_at)
  SELECT 'bootstrap:payout:'||id,'payout',id,'plan','bootstrap:payout:'||id,now(),now()
  FROM "host_payout_ledger" WHERE kind='payout' AND state IN ('held','processing');
--> statement-breakpoint
INSERT INTO "background_task" (id,entity_kind,entity_id,kind,generation,due_at,available_at)
  SELECT 'bootstrap:contact:'||id,'contact',id,'plan','bootstrap:contact:'||id,now(),now()
  FROM "contact_alert" WHERE sent_at IS NULL;
