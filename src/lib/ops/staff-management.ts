import "server-only";

import { and, asc, eq, gt, inArray, like, sql } from "drizzle-orm";

import type { DbConn } from "@/lib/availability/read-model";
import { db } from "@/lib/db";
import { user, verification } from "@/lib/db/schema";
import {
  LAST_STAFF_REVOKE_REASON,
  SELF_REVOKE_REASON,
  STAFF_ROLE,
} from "@/lib/ops/grant";
import { requireStaff } from "@/lib/ops/staff";

const INVITATION_ROW_PREFIX = "staff-invite:";

type PendingMetadata = {
  email: string;
  inviterUserId: string;
  sentAt: Date;
};

export type ActiveStaffRow = {
  email: string;
  staffSinceLabel: string;
  isCurrentActor: boolean;
  canRevoke: boolean;
  revokeDisabledReason: string | null;
  actionRef: { targetUserId: string };
};

export type PendingStaffInvitationRow = {
  email: string;
  sentAtLabel: string;
  expiresAtLabel: string;
  inviterLabel: string;
  actionRef: { id: string; version: string };
};

export type StaffManagementSnapshot = {
  activeStaff: ActiveStaffRow[];
  pendingInvitations: PendingStaffInvitationRow[];
};

function parsePendingMetadata(value: string): PendingMetadata | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const sentAt = typeof parsed.sentAt === "string" ? new Date(parsed.sentAt) : null;
    if (
      parsed.version !== 1 ||
      typeof parsed.email !== "string" ||
      typeof parsed.inviterUserId !== "string" ||
      !sentAt ||
      Number.isNaN(sentAt.valueOf())
    ) {
      return null;
    }
    return { email: parsed.email, inviterUserId: parsed.inviterUserId, sentAt };
  } catch {
    return null;
  }
}

function formatPhtDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatPhtInstant(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
    .format(value)
    .replace("GMT+8", "PHT");
}

/**
 * Return the one protected, deterministic source of truth for the staff-management panel.
 * Internal identifiers live only inside actionRef values and are never promoted into display text.
 */
export async function readStaffManagementSnapshot(
  dbConn: DbConn = db,
): Promise<StaffManagementSnapshot> {
  const actor = await requireStaff();

  const active = await dbConn
    .select({ id: user.id, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.role, STAFF_ROLE))
    .orderBy(asc(user.createdAt), asc(user.id));

  if (active.length === 0) throw new Error("STAFF_MANAGEMENT_INVARIANT_EMPTY");

  const pendingRows = await dbConn
    .select({
      id: verification.id,
      version: verification.identifier,
      value: verification.value,
      expiresAt: verification.expiresAt,
    })
    .from(verification)
    .where(
      and(
        like(verification.id, `${INVITATION_ROW_PREFIX}%`),
        gt(verification.expiresAt, sql`now()`),
      ),
    );

  const pending = pendingRows
    .map((row) => {
      const metadata = parsePendingMetadata(row.value);
      return metadata ? { ...row, metadata } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort(
      (left, right) =>
        right.metadata.sentAt.valueOf() - left.metadata.sentAt.valueOf() ||
        right.id.localeCompare(left.id),
    );

  const inviterIds = [...new Set(pending.map((row) => row.metadata.inviterUserId))];
  const inviters =
    inviterIds.length === 0
      ? []
      : await dbConn
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, inviterIds));
  const inviterLabels = new Map(
    inviters.map((inviter) => [
      inviter.id,
      inviter.name.trim().length > 0 ? inviter.name : inviter.email,
    ]),
  );

  return {
    activeStaff: active.map((staff) => {
      const isCurrentActor = staff.id === actor.id;
      const revokeDisabledReason = isCurrentActor
        ? SELF_REVOKE_REASON
        : active.length === 1
          ? LAST_STAFF_REVOKE_REASON
          : null;
      return {
        email: staff.email,
        staffSinceLabel: formatPhtDate(staff.createdAt),
        isCurrentActor,
        canRevoke: revokeDisabledReason === null,
        revokeDisabledReason,
        actionRef: { targetUserId: staff.id },
      };
    }),
    pendingInvitations: pending.map((row) => ({
      email: row.metadata.email,
      sentAtLabel: formatPhtInstant(row.metadata.sentAt),
      expiresAtLabel: formatPhtInstant(row.expiresAt),
      inviterLabel: inviterLabels.get(row.metadata.inviterUserId) ?? "Former staff",
      actionRef: { id: row.id, version: row.version },
    })),
  };
}
