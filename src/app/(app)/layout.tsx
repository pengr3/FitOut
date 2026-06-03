// Logged-in booker shell (the (app) route group).
//
// This is the REAL per-page session gate (the optimistic middleware only hints): every page under
// (app) requires a session; if there is none we redirect to /login (threat T-04-06). The header
// hosts the Airbnb-style mode switch (wired in Task 2) so a user can flip between booking and
// hosting context, plus a link to their profile.

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ModeSwitch } from "@/components/mode-switch";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const u = session.user as typeof session.user & {
    canBook?: boolean;
    canHost?: boolean;
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          FitOut
        </Link>
        <div className="flex items-center gap-3">
          {/* Airbnb-style booker/host context switch (D-04) — currently in the booking context. */}
          <ModeSwitch
            current="book"
            canBook={u.canBook ?? false}
            canHost={u.canHost ?? false}
          />
          <Link
            href="/profile"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Profile
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
