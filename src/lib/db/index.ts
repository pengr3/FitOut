import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { assertPreviewDatabase } from "@/lib/preview-environment";

if (process.env.VERCEL_ENV === "preview") assertPreviewDatabase(process.env.DATABASE_URL);
export const db = drizzle(postgres(process.env.DATABASE_URL!), { schema });
