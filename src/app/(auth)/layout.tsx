// Minimal centered layout for the logged-out auth surface (signup / login /
// forgot-password / reset-password). A single card container keeps these pages
// visually consistent and isolated from the (future) logged-in app chrome.
//
// NOTE: this layout is purely presentational. The real auth gate is per-page
// `auth.api.getSession()` and the optimistic redirect in src/middleware.ts — NOT
// this layout (RESEARCH Anti-Patterns: middleware/layout are not the security boundary).

// COLOUR (DS-13 / D-15 / THEME-05): the shell surface and the wordmark read semantic tokens, so both
// follow a theme switch. They used to be a numbered neutral and an absolute black, each paired with a
// dark-mode variant — frozen values that no theme could reach, plus a half-built second colour scheme
// nothing in the app ever activates (D-129: the app tree carries no variant at all; the dormant block
// in globals.css and the vendored primitives keep theirs). `foreground` on `muted` is a declared
// pairing in src/lib/design/contrast-pairs.ts, measured 18.16 court / 16.89 grove.

import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            FitOut
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
