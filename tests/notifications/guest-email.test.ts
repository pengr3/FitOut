// GROUP-03/GROUP-04 · D-122 · RESEARCH Pitfall 2 / RESOLVED A2 — the email-only guest send path.
//
// A group attendee can RSVP through the invite link with NO account. `notification.recipientId` is a NOT
// NULL FK to `user.id`, so they cannot flow through `fitout/notify` (it would fail the FK and crash-loop —
// T-08-11). The remedy is `fitout/guest-email`: the D-83 retry/onFailure envelope, but ONLY a send-email
// step and NO durable row. These cases pin the load-bearing properties:
//   - G6 (T-08-08): every field — a host-controlled listing title included — is escapeHtml'd in the body.
//   - Dev fallback: the send resolves without throwing when RESEND_API_KEY is unset (no new integration).
//   - T-07-38 / T-08-09: onFailure records a needs_attention audit carrying the KIND — NEVER the address.

import { describe, it, expect, vi } from "vitest";

import { mockResend } from "../helpers/mocks";
import { sendGuestRsvpEmail } from "@/lib/email";
import {
  GUEST_EMAIL_EVENT,
  guestEmail,
  guestEmailOnFailure,
} from "@/inngest/functions/guest-email";

const GROUP_HREF = "https://fitout.example/invite/tok_123";
const WHEN = "Sat, Jul 25, 8:00 AM – 9:00 AM (Manila time)";

describe("fitout/guest-email — the email-only guest path (no durable row)", () => {
  it("the wire contract is the shared event name", () => {
    expect(GUEST_EMAIL_EVENT).toBe("fitout/guest-email");
  });

  it("the mounted function carries the D-83 envelope (id + retries:4 + onFailure)", () => {
    // Inngest exposes the resolved config on the function instance. This proves the retry/onFailure envelope
    // survived the clone from notify.ts, not merely that a function exists.
    const opts = (guestEmail as unknown as { opts: { id: string; retries?: number; onFailure?: unknown } }).opts;
    expect(opts.id).toBe("guest-email");
    expect(opts.retries).toBe(4);
    expect(typeof opts.onFailure).toBe("function");
  });

  it("(G6) escapes a hostile listing title and sends an rsvp_confirmed email", async () => {
    const hostileTitle = '<script>alert(1)</script> Court';
    const result = await sendGuestRsvpEmail({
      to: "guest-confirm@example.com",
      kind: "rsvp_confirmed",
      listingTitle: hostileTitle,
      whenLabel: WHEN,
      href: GROUP_HREF,
    });

    expect(result).toEqual({ sent: true });
    const [email] = mockResend.sent().filter((e) => e.to === "guest-confirm@example.com");
    expect(email).toBeDefined();
    // The tag survives as escaped, inert text — never live markup.
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>alert(1)</script>");
    // The invite href is present as the anchor target.
    expect(email.html).toContain(GROUP_HREF);
    expect(email.html).toContain("RSVP is confirmed");
  });

  it("group_cancelled renders the cancelled copy", async () => {
    await sendGuestRsvpEmail({
      to: "guest-cancel@example.com",
      kind: "group_cancelled",
      listingTitle: "Court A",
      whenLabel: WHEN,
      href: GROUP_HREF,
    });
    const [email] = mockResend.sent().filter((e) => e.to === "guest-cancel@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("cancelled");
    expect(email.html).toContain("Court A");
  });

  it("does NOT throw and resolves when RESEND_API_KEY is unset (the [email:dev] fallback)", async () => {
    // The guest path needs no new integration. With no key, `send` logs the body instead of delivering.
    // Re-import email.ts fresh with the key cleared so the module binds `resend = null` at load.
    vi.stubEnv("RESEND_API_KEY", "");
    vi.resetModules();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { sendGuestRsvpEmail: freshSend } = await import("@/lib/email");
      await expect(
        freshSend({
          to: "guest-dev@example.com",
          kind: "rsvp_confirmed",
          listingTitle: "Court A",
          whenLabel: WHEN,
          href: GROUP_HREF,
        }),
      ).resolves.toEqual({ sent: true });
      // The dev fallback logged the body rather than delivering — proof the keyless path is exercised.
      expect(logSpy.mock.calls.some((c) => String(c[0]).includes("[email:dev]"))).toBe(true);
    } finally {
      logSpy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("guest-email onFailure — a permanent failure is visible but never leaks the address (T-08-09)", () => {
  it("records a needs_attention audit carrying the kind, and NO email address anywhere", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await guestEmailOnFailure({
      error: { message: "resend 503" },
      event: {
        data: {
          event: {
            data: {
              to: "secret-guest@example.com",
              kind: "rsvp_confirmed",
              listingTitle: "Court A",
              whenLabel: WHEN,
              href: GROUP_HREF,
            },
          },
        },
      },
    });

    const entries = infoSpy.mock.calls
      .filter((c) => c[0] === "[audit]")
      .map((c) => JSON.parse(c[1] as string) as { action: string; outcome: string; meta: Record<string, unknown> });
    const entry = entries.find((e) => e.action === "guest-email");
    expect(entry).toBeDefined();
    expect(entry!.outcome).toBe("needs_attention");
    expect(entry!.meta).toMatchObject({ guestEmailKind: "rsvp_confirmed", error: "resend 503" });

    // The address must appear in NO audit line and NO alert line (T-07-38 / T-08-09).
    const allInfo = JSON.stringify(infoSpy.mock.calls);
    const allError = JSON.stringify(errorSpy.mock.calls);
    expect(allInfo).not.toContain("secret-guest@example.com");
    expect(allError).not.toContain("secret-guest@example.com");
    // The operator alert still fires — visible, never silent.
    expect(errorSpy).toHaveBeenCalledWith("[guest-email-alert] permanently failed", { error: "resend 503" });

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
