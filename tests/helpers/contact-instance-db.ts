// Test-only adapter: real isolated Postgres, no provider transport.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../src/lib/db/schema";
import { assertTestDatabase } from "./test-db-url";
const url = process.env.DATABASE_URL!;
assertTestDatabase(url, "Contact child process database");
const isolated = process.env.CONTACT_TEST_SCHEMA ?? "";
if (!/^test_[a-z0-9_]+$/.test(isolated)) throw new Error("Isolated test schema required");
export const client = postgres(url, { max: 1, onnotice: () => {}, connection: { search_path: isolated } });
export const db = drizzle(client, { schema });
export const transport = { attempts: 0 };
export async function sendContactInquiry() {
  transport.attempts++;
  // Reservations succeed, but the handler must return 503 rather than invent delivery.
  return { delivered: false, transport: "disabled-test" };
}
