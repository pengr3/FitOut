import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { isCustomerRole } from "@/lib/customer-role";

/** Resolve customer standing from the current row, independently of session capability flags. */
export async function readCustomerUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return null;
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return isCustomerRole(row?.role) ? userId : null;
}
