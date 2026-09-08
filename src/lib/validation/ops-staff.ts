import { z } from "zod";

const STAFF_INVITE_TOKEN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/;

export const issueStaffInvitationInput = z.object({
  email: z.preprocess(
    (email) => (typeof email === "string" ? email.trim().toLowerCase() : email),
    z.email(),
  ),
});

export const acceptStaffInvitationInput = z.object({
  token: z.string().regex(STAFF_INVITE_TOKEN),
  name: z.string().trim().min(1).max(128),
  password: z.string().min(10).max(128),
});

export type IssueStaffInvitationInput = z.input<typeof issueStaffInvitationInput>;
export type AcceptStaffInvitationInput = z.input<typeof acceptStaffInvitationInput>;
