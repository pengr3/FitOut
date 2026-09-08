import { safeCallbackPath } from "@/lib/safe-callback-url";

/**
 * Normalize an untrusted callback through the shared same-origin parser, then narrow the result to
 * the protected ops namespace. Returning the parser's normalized output is important: callers never
 * navigate to a raw value whose backslashes, control characters, or dot segments were checked in a
 * different form.
 */
export function safeOpsCallback(
  raw: string | null | undefined,
  opsOrigin: string,
): string {
  const normalized = safeCallbackPath(raw, opsOrigin);

  try {
    const pathname = new URL(normalized, opsOrigin).pathname;
    if (pathname === "/ops" || pathname.startsWith("/ops/")) return normalized;
  } catch {
    // The shared parser already rejects malformed URLs. Keep this final consumer boundary closed if
    // its contract ever changes rather than passing an unchecked value through.
  }

  return "/ops";
}
