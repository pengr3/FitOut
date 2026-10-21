import "server-only";
import { Resend } from "resend";
import { z } from "zod";
import { renderEmail } from "@/lib/email-shell";
import { previewRecipientAllowed } from "@/lib/preview-environment";
export type ContactControlAlert = { id: string; kind: "global_budget" | "quota_unavailable"; observedAt: string; attemptCount?: number; synthetic?: boolean };
export function contactAlertRecipient(): string | null {
  const parsed = z.email().safeParse(process.env.CONTACT_ALERT_EMAIL);
  return parsed.success ? parsed.data : null;
}
export function contactAlertMonitorEnabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production" && Boolean(contactAlertRecipient());
}
export async function sendContactControlAlert(alert: ContactControlAlert): Promise<string> {
  const to = contactAlertRecipient(), key = process.env.RESEND_API_KEY;
  if (!to || !key) throw new Error("Contact alert transport is not configured");
  if (process.env.VERCEL_ENV === "preview" && !previewRecipientAllowed(to,process.env.PREVIEW_EMAIL_RECIPIENTS)) {
    throw new Error("Preview Contact alerts require an allowlisted tester recipient");
  }
  const label = alert.kind === "global_budget" ? "hourly quota exhausted" : "quota store unavailable";
  const subject = (alert.synthetic ? "[Synthetic test] " : "") + "FitOut Contact alert: " + label;
  const { html, text } = renderEmail({ heading: subject, paragraphs: [
    "Incident: " + alert.id, "Observed (UTC): " + alert.observedAt,
    ...(alert.kind === "global_budget" ? ["Shared Contact budget: 100 reservations in the rolling hour."] : ["The monitor could not verify the shared Contact quota store."]),
    "Contact rejects submissions when its quota is exhausted or unavailable.",
    "Keep public Contact disabled while investigating. Review the Contact monitor run and restore only after the controls are healthy.",
    ...(alert.synthetic ? ["This is an owner-approved synthetic alert test. No Contact inquiry was sent."] : []),
  ] });
  try {
    const { data, error } = await new Resend(key).emails.send({ from: process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>", to, subject, html, text }, { idempotencyKey: "contact-alert/" + alert.id });
    if (error || !data?.id) throw new Error("Contact alert delivery not accepted");
    return data.id;
  } catch {
    // Provider exceptions can include payloads, recipients or credentials.
    throw new Error("Contact alert delivery failed");
  }
}
