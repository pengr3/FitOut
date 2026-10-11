import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { seedMarketingSpaces, marketingSpaces, referenceImages } from "./lib/marketing-spaces.mjs";

// Owner-requested five-space seed. Deliberately bound to the existing schema-only Preview.
const config = JSON.parse(readFileSync("playwright/.cache/phase27-08/preview-private-20261010.json", "utf8"));
if (config.branchId !== "br-silent-glade-b31mruln" || new URL(config.databaseUrl).hostname !== "ep-young-heart-b3h8o9yw-pooler.c-4.ap-southeast-1.aws.neon.tech" || new URL(config.databaseUrl).pathname !== "/neondb") {
  throw new Error("Refusing any database except the checked isolated phase27 Preview.");
}
const sql = postgres(config.databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
const hostId = "marketing_preview_gallery_host_20261012";
try {
  const existing = await sql`SELECT id FROM listing WHERE host_id=${hostId}`;
  if (existing.length === 0) {
    await sql.begin(async (tx) => {
      await tx`INSERT INTO "user" (id,name,email,email_verified,first_name,can_host,can_book,created_at,updated_at) VALUES (${hostId},'Preview Spaces','marketing-gallery-20261012@example.invalid',true,'Preview',true,false,now(),now())`;
      await tx`INSERT INTO host_payout (user_id,paymongo_account_id,activation_status,payouts_enabled,onboarding_complete,created_at,updated_at) VALUES (${hostId},${`demo_gallery_${randomUUID()}`},'activated',true,true,now(),now())`;
      await tx`INSERT INTO host_verification (user_id,status,provider,created_at,updated_at) VALUES (${hostId},'approved','manual',now(),now())`;
      await seedMarketingSpaces(tx,hostId,{remotePhotos:true,prefix:"marketing_preview"});
    });
  }
  for (const space of marketingSpaces) {
    await sql`UPDATE listing_photo SET url=${referenceImages[space.key]} WHERE public_id=${`preview-reference-${space.key}`} AND listing_id IN (SELECT id FROM listing WHERE host_id=${hostId})`;
    await sql`UPDATE listing SET description=${space.description} WHERE host_id=${hostId} AND title=${space.title}`;
  }
  const rows = await sql`SELECT l.id,l.title,l.status,l.review_state,count(distinct p.id)::int AS photos,count(distinct h.id)::int AS days FROM listing l LEFT JOIN listing_photo p ON p.listing_id=l.id LEFT JOIN operating_hours h ON h.listing_id=l.id WHERE l.host_id=${hostId} GROUP BY l.id ORDER BY l.title`;
  if (rows.length!==5 || rows.some((row)=>row.status!=="published" || row.review_state!=="approved" || row.photos<1 || row.days!==7)) throw Error("Preview gallery readiness check failed");
  console.log(JSON.stringify({branchId:config.branchId,synthetic:true,providersCalled:false,spaces:rows,expectedTitles:marketingSpaces.map((space)=>space.title)},null,2));
} catch (error) {
  console.error("Preview gallery seed failed: " + (error.code ?? "readiness check"));
  process.exitCode=1;
} finally { await sql.end(); }
