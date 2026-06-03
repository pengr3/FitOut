// Minimal centered layout for the logged-out auth surface (signup / login /
// forgot-password / reset-password). A single card container keeps these pages
// visually consistent and isolated from the (future) logged-in app chrome.
//
// NOTE: this layout is purely presentational. The real auth gate is per-page
// `auth.api.getSession()` and the optimistic redirect in src/middleware.ts — NOT
// this layout (RESEARCH Anti-Patterns: middleware/layout are not the security boundary).

import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50"
          >
            FitOut
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
