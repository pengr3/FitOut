/** OPS-11: only the default customer role may use booking and hosting capabilities. */
export function isCustomerRole(role: unknown): role is "user" {
  return role === "user";
}
