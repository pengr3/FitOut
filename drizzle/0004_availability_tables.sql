CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'declined', 'completed');--> statement-breakpoint
CREATE TABLE "availability_block" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"unit" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"unit" integer NOT NULL,
	"booker_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operating_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "unit_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "timezone" text DEFAULT 'Asia/Manila' NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_block" ADD CONSTRAINT "availability_block_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_booker_id_user_id_fk" FOREIGN KEY ("booker_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_block_listing_idx" ON "availability_block" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "booking_listing_idx" ON "booking" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "operating_hours_listing_idx" ON "operating_hours" USING btree ("listing_id");