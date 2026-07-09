// New-listing entry (D-01 draft-first). Reaching (host)/** already means canHost (the layout gates),
// but we re-check at page level (defense in depth — the project's belt-and-suspenders). We create an
// empty DRAFT owned by the caller and immediately redirect into the wizard at [id]/edit, so the
// listing exists as a draft the moment creation begins (autosave then fills it in).

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createDraftListing } from "@/app/actions/listing";

export default async function NewListingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/"); // defense in depth — never render/act on hosting content without canHost.
  }

  const res = await createDraftListing();
  if (!res.ok || !res.id) {
    // Creation failed — send them back to the grid rather than a broken wizard.
    redirect("/host/listings");
  }

  redirect(`/host/listings/${res.id}/edit`);
}
