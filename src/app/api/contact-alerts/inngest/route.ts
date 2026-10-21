import { dispatchBackgroundAfterResponse } from "@/lib/background-after";
import { serve } from "inngest/next";
import { contactAlertClient, contactAlertMonitor } from "@/inngest/contact-alerts";
export const runtime = "nodejs";
if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error("INNGEST_SIGNING_KEY is required for Contact alert monitoring");
}
const handlers = serve({ client: contactAlertClient, functions: [contactAlertMonitor] });

export const GET = handlers.GET;
export const POST = async (...args: Parameters<typeof handlers.POST>) => {
  const response=await handlers.POST(...args);
  if (response.status>=200 && response.status<300) dispatchBackgroundAfterResponse();
  return response;
};
export const PUT = async (...args: Parameters<typeof handlers.PUT>) => {
  const response=await handlers.PUT(...args);
  if (response.status>=200 && response.status<300) dispatchBackgroundAfterResponse();
  return response;
};
