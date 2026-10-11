import { serve } from "inngest/next";
import { contactAlertClient, contactAlertMonitor } from "@/inngest/contact-alerts";
export const runtime = "nodejs";
if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error("INNGEST_SIGNING_KEY is required for Contact alert monitoring");
}
export const { GET, POST, PUT } = serve({ client: contactAlertClient, functions: [contactAlertMonitor] });
