import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { HostingIntent } from "@/components/marketing/hosting-intent";
import { PanelCard } from "@/components/patterns/panel-card";

export default async function StartHostingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?callbackURL=%2Fstart-hosting");
  if (session.user.canHost) redirect("/host");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <PanelCard title="Start hosting with FitOut" titleAs="h1"
          description="Add hosting to your account, then continue your host setup.">
          <p className="text-sm text-muted-foreground">
            You can keep booking spaces. Hosting setup includes verification before your space can become bookable.
          </p>
          <HostingIntent />
          <Link href="/" className="text-sm underline">Keep browsing spaces</Link>
        </PanelCard>
      </div>
    </main>
  );
}
