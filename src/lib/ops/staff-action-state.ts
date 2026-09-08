export type OpsStaffActionState =
  | { status: "idle" }
  | {
      status: "success";
      action: "invite" | "resend" | "cancel" | "revoke";
      message: string;
      targetUserId?: string;
    }
  | {
      status: "error";
      action: "invite" | "resend" | "cancel" | "revoke";
      message: string;
    };

export const INITIAL_OPS_STAFF_ACTION_STATE: OpsStaffActionState = { status: "idle" };
