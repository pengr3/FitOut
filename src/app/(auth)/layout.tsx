// Minimal centered layout for the logged-out auth surface (signup / login /
// forgot-password / reset-password). A single card container keeps these pages
// visually consistent and isolated from the (future) logged-in app chrome.
//
// NOTE: this layout is purely presentational. The real auth gate is per-page
// `auth.api.getSession()` and the optimistic redirect in src/middleware.ts — NOT
// this layout (RESEARCH Anti-Patterns: middleware/layout are not the security boundary).

// COLOUR (DS-13 / D-15 / THEME-05): the shell surface reads a semantic token, so it follows a theme
// switch. It used to be a numbered neutral paired with a dark-mode variant — a frozen value no theme
// could reach, plus a half-built second colour scheme nothing in the app ever activates (D-129: the
// app tree carries no variant at all; the dormant block in globals.css and the vendored primitives
// keep theirs). `foreground` on `muted` is a declared pairing in src/lib/design/contrast-pairs.ts,
// measured 18.16 court / 16.89 grove.
//
// ── THE CENTRED WORDMARK IS GONE, AND ITS REMOVAL IS THE POINT (SHELL-01, plan 11-10) ─────────────
// This layout used to render its own `text-2xl` FitOut wordmark linking home, above the card. The
// shell now supplies one, and two wordmarks on one screen — at two different type sizes, linking to
// the same place — is exactly the duplication this phase exists to end. Nothing else about these
// screens changes here: Phase 15 owns the auth surfaces.
//
// The `(auth)` composition is the PUBLIC one, unmodified. A `Log in` / `Sign up` pair in the header
// of the login page is mildly redundant and is deliberately not special-cased: a fourth composition
// whose only difference is a suppressed button is a fork, and the drift it invites costs more than
// the redundancy. Phase 15 may decide otherwise with the whole surface in front of it.

import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/patterns/site-footer";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <div className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      {/* SHELL-02. The auth surface shares the PUBLIC composition unmodified (see above), and that
          includes the footer: `/terms` and `/privacy` are reachable from the page where someone is
          being asked to create an account, which is the page where they most want to read them. */}
      <SiteFooter />
    </div>
  );
}
