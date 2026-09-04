CREATE TYPE "public"."booking_mode" AS ENUM('instant', 'request');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'published', 'unlisted');--> statement-breakpoint
CREATE TYPE "public"."space_type" AS ENUM('pickleball_court', 'tennis_court', 'basketball_court', 'multi_sport_court', 'gym_fitness_floor', 'yoga_studio', 'dance_studio', 'pilates_barre_studio', 'martial_arts_boxing', 'home_private_gym', 'multi_purpose_event');--> statement-breakpoint
CREATE TABLE "host_payout" (
	"user_id" text PRIMARY KEY NOT NULL,
	"paymongo_account_id" text,
	"activation_status" text DEFAULT 'pending' NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_payout_paymongo_account_id_unique" UNIQUE("paymongo_account_id")
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"title" text,
	"description" text,
	"primary_space_type" "space_type",
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"neighborhood" text,
	"location" geometry(point, 4326),
	"show_exact_address" boolean DEFAULT false NOT NULL,
	"max_occupancy" integer,
	"hourly_rate_cents" integer,
	"day_rate_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"booking_mode" "booking_mode" DEFAULT 'request' NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_activity_tag" (
	"listing_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_amenity" (
	"listing_id" text NOT NULL,
	"amenity" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"public_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "host_payout" ADD CONSTRAINT "host_payout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_activity_tag" ADD CONSTRAINT "listing_activity_tag_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_amenity" ADD CONSTRAINT "listing_amenity_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photo" ADD CONSTRAINT "listing_photo_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_host_idx" ON "listing" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "listing_status_idx" ON "listing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_location_gist" ON "listing" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_activity_tag_uq" ON "listing_activity_tag" USING btree ("listing_id","tag");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_amenity_uq" ON "listing_amenity" USING btree ("listing_id","amenity");--> statement-breakpoint
CREATE INDEX "listing_photo_listing_idx" ON "listing_photo" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photo_position_uq" ON "listing_photo" USING btree ("listing_id","position");