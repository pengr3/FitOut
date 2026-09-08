import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, sql } from "drizzle-orm";

import { OPS_APP_ORIGIN } from "@/lib/app-origins";
import type { DbConn } from "@/lib/availability/read-model";
import { db } from "@/lib/db";
import { account, audit, user, verification } from "@/lib/db/schema";
import { sendStaffInviteEmail } from "@/lib/email";
import { DEFAULT_ROLE, STAFF_ROLE, writeRole } from "@/lib/ops/grant";
import {
  acceptStaffInvitationInput,
  issueStaffInvitationInput,
  type AcceptStaffInvitationInput,
  type IssueStaffInvitationInput,
} from "@/lib/validation/ops-staff";

const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TOKEN_LENGTH = 20;
const TOKEN_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/;
const IDENTIFIER_PREFIX = "staff-invite-token:";
const ROW_PREFIX = "staff-invite:";
const LOCK_PREFIX = "fitout:staff-invitation:";

const INVITATION_ISSUED = "staff_invitation_issued";
const INVITATION_RESENT = "staff_invitation_resent";
const INVITATION_CANCELLED = "staff_invitation_cancelled";
const INVITATION_EXPIRED = "staff_invitation_expired";
const INVITATION_ACCEPTED = "staff_invitation_accepted";
const INVITATION_ACCEPT_REFUSED = "staff_invitation_accept_refused";

type InvitationMetadata = {
  version: 1;
  email: string;
  inviterUserId: string;
  sentAt: string;
};

type InvitationRow = {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
};

export type StaffInvitationState =
  | { state: "active"; email: string }
  | { state: "inactive" };

export type StaffInvitationRef = { id: string; version: string };

type InvitationView = {
  email: string;
  expiresAt: Date;
  ref: StaffInvitationRef;
};

type InvitationDelivery =
  | { outcome: "sent"; invitation: InvitationView }
  | { outcome: "pending-delivery-failed"; invitation: InvitationView };

type StaffInvitationAcceptance =
  | { outcome: "accepted"; userId: string }
  | { outcome: "inactive" }
  | { outcome: "invalid" }
  | { outcome: "refused"; reason: "already-staff-member" | "separate-staff-email" };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function invitationRowId(email: string): string {
  return `${ROW_PREFIX}${sha256(email)}`;
}

function invitationIdentifier(token: string): string {
  return `${IDENTIFIER_PREFIX}${sha256(token)}`;
}

function mintToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte & 31]).join("");
}

function parseMetadata(value: string): InvitationMetadata | null {
  try {
    const parsed = JSON.parse(value) as Partial<InvitationMetadata>;
    if (
      parsed.version !== 1 ||
      typeof parsed.email !== "string" ||
      typeof parsed.inviterUserId !== "string" ||
      typeof parsed.sentAt !== "string"
    ) {
      return null;
    }
    return parsed as InvitationMetadata;
  } catch {
    return null;
  }
}

function invitationView(row: InvitationRow, metadata: InvitationMetadata): InvitationView {
  return {
    email: metadata.email,
    expiresAt: row.expiresAt,
    ref: { id: row.id, version: row.identifier },
  };
}

async function lockInvitation(dbConn: DbConn, key: string): Promise<void> {
  await dbConn.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${LOCK_PREFIX}${key}`}, 0))`,
  );
}

async function writeInvitationAudit(
  dbConn: DbConn,
  input: {
    actorId: string;
    action: string;
    invitationId: string;
    reason?: string;
  },
): Promise<void> {
  await dbConn.insert(audit).values({
    id: randomUUID(),
    actorId: input.actorId,
    action: input.action,
    outcome: input.reason ? "denied" : "ok",
    meta: {
      invitationId: input.invitationId,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  });
}

async function existingAccountConflict(
  dbConn: DbConn,
  email: string,
): Promise<"already-staff-member" | "separate-staff-email" | null> {
  const [found] = await dbConn
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!found) return null;
  return found.role === "staff" ? "already-staff-member" : "separate-staff-email";
}

async function deliverInvitation(
  row: InvitationRow,
  metadata: InvitationMetadata,
  token: string,
): Promise<InvitationDelivery> {
  const delivery = await sendStaffInviteEmail(
    metadata.email,
    `${OPS_APP_ORIGIN}/invite/${encodeURIComponent(token)}`,
  );
  const invitation = invitationView(row, metadata);
  return delivery.delivered
    ? { outcome: "sent", invitation }
    : { outcome: "pending-delivery-failed", invitation };
}

export async function issueStaffInvitation(
  input: IssueStaffInvitationInput,
  inviterUserId: string,
  dbConn: DbConn = db,
) {
  const parsed = issueStaffInvitationInput.safeParse(input);
  if (!parsed.success) return { outcome: "invalid" } as const;

  const email = parsed.data.email;
  const rowId = invitationRowId(email);
  const token = mintToken();
  const identifier = invitationIdentifier(token);

  const created = await dbConn.transaction(async (tx) => {
    await lockInvitation(tx, rowId);

    const conflict = await existingAccountConflict(tx, email);
    if (conflict) return { outcome: "refused", reason: conflict } as const;

    const [existing] = await tx
      .select()
      .from(verification)
      .where(eq(verification.id, rowId))
      .limit(1);

    if (existing) {
      const [clock] = (await tx.execute(sql`
        SELECT expires_at > now() AS active
          FROM verification
         WHERE id = ${existing.id}
      `)) as unknown as Array<{ active: boolean }>;
      if (clock.active) {
        return { outcome: "refused", reason: "active-invitation-exists" } as const;
      }
      await writeInvitationAudit(tx, {
        actorId: inviterUserId,
        action: INVITATION_EXPIRED,
        invitationId: existing.id,
      });
      await tx
        .delete(verification)
        .where(and(eq(verification.id, rowId), sql`${verification.expiresAt} <= now()`));
    }

    const [row] = (await tx.execute(sql`
      WITH invitation_clock AS (
        SELECT clock_timestamp() AS sent_at
      )
      INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
      SELECT
        ${rowId},
        ${identifier},
        json_build_object(
          'version', 1,
          'email', ${email}::text,
          'inviterUserId', ${inviterUserId}::text,
          'sentAt', to_char(sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )::text,
        sent_at + interval '24 hours',
        sent_at,
        sent_at
      FROM invitation_clock
      ON CONFLICT (id) DO NOTHING
      RETURNING id, identifier, value, expires_at AS "expiresAt"
    `)) as unknown as InvitationRow[];

    if (!row) return { outcome: "refused", reason: "active-invitation-exists" } as const;
    const metadata = parseMetadata(row.value);
    if (!metadata) throw new Error("Staff invitation metadata was not persisted correctly");

    await writeInvitationAudit(tx, {
      actorId: inviterUserId,
      action: INVITATION_ISSUED,
      invitationId: row.id,
    });
    return { outcome: "created", row, metadata } as const;
  });

  if (created.outcome !== "created") return created;
  return deliverInvitation(created.row, created.metadata, token);
}

export async function resendStaffInvitation(
  ref: StaffInvitationRef,
  actorId: string,
  dbConn: DbConn = db,
) {
  const token = mintToken();
  const identifier = invitationIdentifier(token);

  const rotated = await dbConn.transaction(async (tx) => {
    await lockInvitation(tx, ref.id);
    const [row] = (await tx.execute(sql`
      WITH invitation_clock AS (
        SELECT clock_timestamp() AS sent_at
      )
      UPDATE verification AS invitation
         SET identifier = ${identifier},
             value = json_build_object(
               'version', 1,
               'email', invitation.value::jsonb->>'email',
               'inviterUserId', invitation.value::jsonb->>'inviterUserId',
               'sentAt', to_char(invitation_clock.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
             )::text,
             expires_at = invitation_clock.sent_at + interval '24 hours',
             updated_at = invitation_clock.sent_at
        FROM invitation_clock
       WHERE invitation.id = ${ref.id}
         AND invitation.identifier = ${ref.version}
         AND invitation.expires_at > now()
      RETURNING invitation.id, invitation.identifier, invitation.value,
                invitation.expires_at AS "expiresAt"
    `)) as unknown as InvitationRow[];
    if (!row) return null;

    const metadata = parseMetadata(row.value);
    if (!metadata) throw new Error("Staff invitation metadata is invalid");
    await writeInvitationAudit(tx, {
      actorId,
      action: INVITATION_RESENT,
      invitationId: row.id,
    });
    return { row, metadata };
  });

  if (!rotated) return { outcome: "stale" } as const;
  return deliverInvitation(rotated.row, rotated.metadata, token);
}

export async function cancelStaffInvitation(
  ref: StaffInvitationRef,
  actorId: string,
  dbConn: DbConn = db,
) {
  const cancelled = await dbConn.transaction(async (tx) => {
    await lockInvitation(tx, ref.id);
    const [row] = (await tx.execute(sql`
      DELETE FROM verification
       WHERE id = ${ref.id}
         AND identifier = ${ref.version}
         AND expires_at > now()
      RETURNING id
    `)) as unknown as Array<{ id: string }>;
    if (!row) return false;
    await writeInvitationAudit(tx, {
      actorId,
      action: INVITATION_CANCELLED,
      invitationId: row.id,
    });
    return true;
  });
  return cancelled ? ({ outcome: "cancelled" } as const) : ({ outcome: "stale" } as const);
}

export async function inspectStaffInvitation(
  rawToken: string | null | undefined,
  dbConn: DbConn = db,
): Promise<StaffInvitationState> {
  if (typeof rawToken !== "string" || !TOKEN_PATTERN.test(rawToken)) {
    return { state: "inactive" };
  }

  const [row] = await dbConn
    .select({ value: verification.value })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, invitationIdentifier(rawToken)),
        gt(verification.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  if (!row) return { state: "inactive" };
  const metadata = parseMetadata(row.value);
  return metadata ? { state: "active", email: metadata.email } : { state: "inactive" };
}

export async function acceptStaffInvitation(
  input: AcceptStaffInvitationInput,
  dbConn: DbConn = db,
): Promise<StaffInvitationAcceptance> {
  const parsed = acceptStaffInvitationInput.safeParse(input);
  if (!parsed.success) return { outcome: "invalid" };

  const identifier = invitationIdentifier(parsed.data.token);
  const [candidate] = await dbConn
    .select({ id: verification.id })
    .from(verification)
    .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, sql`now()`)))
    .limit(1);
  if (!candidate) return { outcome: "inactive" };

  // Better Auth's own password helper is the compatibility boundary: the account
  // row produced below must be consumable by its credential provider, not merely
  // resemble one. Hashing is intentionally outside the transaction's lock window.
  const passwordHash = await hashPassword(parsed.data.password);

  return dbConn.transaction(async (tx): Promise<StaffInvitationAcceptance> => {
    await lockInvitation(tx, candidate.id);

    const [consumed] = (await tx.execute(sql`
      DELETE FROM verification
       WHERE id = ${candidate.id}
         AND identifier = ${identifier}
         AND expires_at > now()
      RETURNING id, identifier, value, expires_at AS "expiresAt"
    `)) as unknown as InvitationRow[];
    if (!consumed) return { outcome: "inactive" };

    const metadata = parseMetadata(consumed.value);
    if (!metadata) {
      await writeInvitationAudit(tx, {
        actorId: "system",
        action: INVITATION_ACCEPT_REFUSED,
        invitationId: consumed.id,
        reason: "invalid-metadata",
      });
      return { outcome: "inactive" };
    }

    const conflict = await existingAccountConflict(tx, metadata.email);
    if (conflict) {
      await writeInvitationAudit(tx, {
        actorId: metadata.inviterUserId,
        action: INVITATION_ACCEPT_REFUSED,
        invitationId: consumed.id,
        reason: conflict,
      });
      return { outcome: "refused", reason: conflict };
    }

    const userId = randomUUID();
    await tx.insert(user).values({
      id: userId,
      name: parsed.data.name,
      firstName: parsed.data.name,
      email: metadata.email,
      emailVerified: true,
      canBook: false,
      canHost: false,
      role: DEFAULT_ROLE,
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });

    const grant = await writeRole(
      {
        target: userId,
        actorId: metadata.inviterUserId,
        role: STAFF_ROLE,
      },
      tx,
    );
    if (grant.outcome !== "written") {
      throw new Error(`Staff invitation role grant failed: ${grant.outcome}`);
    }

    await writeInvitationAudit(tx, {
      actorId: metadata.inviterUserId,
      action: INVITATION_ACCEPTED,
      invitationId: consumed.id,
    });
    return { outcome: "accepted", userId };
  });
}
