import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";
import { assertPreviewDatabase } from "../src/lib/preview-environment";
import { marketingSpaces, referenceImages } from "./lib/marketing-spaces.mjs";

// Never borrow .env.local: that file can contain a production connection.
config({ path: ".env.preview.local", quiet: true });

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.length > 1) {
    throw new Error("Usage: npm run preview:seed -- [--apply]");
  }
  if (process.env.VERCEL_ENV === "production") throw new Error("Seeding Production is refused.");
  const url = assertPreviewDatabase(process.env.PREVIEW_DATABASE_URL);
  const identities = ["host", "booker", "staff"] as const;
  if (!args.includes("--apply")) {
    console.log("Dry run: add three sandbox identities and three listings (instant, request, draft). No writes or provider calls.");
    console.log("Target: schema-only preview/phase27-20261010. Repeat with --apply to seed.");
    return;
  }
  const password = process.env.PREVIEW_SEED_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("Set PREVIEW_SEED_PASSWORD to a private 12–128 character sandbox password.");
  }
  const hash = await hashPassword(password);
  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    await sql.begin(async (tx) => {
      // Serialize repeat seed runs. Existing accounts, passwords, edits and bookings are preserved.
      await tx`SELECT pg_advisory_xact_lock(hashtext('fitout-preview-sandbox-seed'))`;
      for (const kind of identities) {
        const id = `preview_sandbox_${kind}`;
        const role = kind === "staff" ? "staff" : "user";
        await tx`INSERT INTO "user" (id,name,email,email_verified,first_name,can_host,can_book,role,created_at,updated_at)
          VALUES (${id},${`Preview ${kind}`},${`${kind}@preview.fitout.invalid`},true,'Preview',${kind === "host"},${kind === "booker"},${role},now(),now())
          ON CONFLICT (id) DO NOTHING`;
        const [existing] = await tx`SELECT email,role FROM "user" WHERE id=${id}`;
        if (existing.email !== `${kind}@preview.fitout.invalid` || existing.role !== role) {
          throw new Error("A sandbox identity conflicts with existing data; no seed changes committed.");
        }
        await tx`INSERT INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at)
          VALUES (${`${id}_credential`},${id},'credential',${id},${hash},now(),now()) ON CONFLICT (id) DO NOTHING`;
      }
      const host = "preview_sandbox_host";
      await tx`INSERT INTO host_payout (user_id,paymongo_account_id,activation_status,payouts_enabled,onboarding_complete,created_at,updated_at)
        VALUES (${host},'preview_synthetic_account','activated',true,true,now(),now()) ON CONFLICT (user_id) DO NOTHING`;
      await tx`INSERT INTO host_verification (user_id,status,provider,created_at,updated_at)
        VALUES (${host},'approved','manual',now(),now()) ON CONFLICT (user_id) DO NOTHING`;
      for (const [index, mode] of (["instant", "request", "draft"] as const).entries()) {
        const id = `preview_sandbox_listing_${mode}`;
        const space = marketingSpaces[index];
        const rows = await tx`INSERT INTO listing
          (id,host_id,title,description,primary_space_type,address_line1,city,region,postal_code,country,neighborhood,location,
          show_exact_address,max_occupancy,unit_count,timezone,hourly_rate_cents,occupancy_mode,currency,booking_mode,cancellation_policy,status,review_state,published_at,created_at,updated_at)
          VALUES (${id},${host},${`[Preview] ${space.title} (${mode})`},${space.description},${space.type},'Synthetic venue address','Makati','Metro Manila','1210','Philippines','Poblacion',
          ST_SetSRID(ST_MakePoint(${121.03076 + index * 0.002},${14.56546 + index * 0.002}),4326),false,${space.capacity},1,'Asia/Manila',${space.rate},'exclusive','php',${mode === "request" ? "request" : "instant"},'flexible',
          ${mode === "draft" ? "draft" : "published"},${mode === "draft" ? "pending" : "approved"},${mode === "draft" ? null : new Date()},now(),now())
          ON CONFLICT (id) DO NOTHING RETURNING id`;
        if (!rows.length) continue;
        for (let day = 0; day < 7; day++) {
          await tx`INSERT INTO operating_hours (id,listing_id,day_of_week,open_time,close_time,created_at)
            VALUES (${`${id}_hours_${day}`},${id},${day},'06:00','23:00',now())`;
        }
        await tx`INSERT INTO listing_activity_tag (listing_id,tag) VALUES (${id},${space.tag})`;
        await tx`INSERT INTO listing_photo (id,listing_id,public_id,url,position)
          VALUES (${`${id}_photo`},${id},${`preview-sandbox-${mode}`},${referenceImages[space.key as keyof typeof referenceImages]},0)`;
      }
    });
    const listings = await sql`SELECT id,status,booking_mode FROM listing WHERE host_id='preview_sandbox_host' ORDER BY id`;
    console.log(JSON.stringify({ seeded: true, providerCalls: false, listings, accounts: identities.map((kind) => `${kind}@preview.fitout.invalid`) }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch(() => {
  // Driver errors can contain a connection string or SQL with password hashes.
  console.error("Preview seed failed. Check the explicit preview target, password, database capacity and schema. No credentials are logged.");
  process.exitCode = 1;
});
