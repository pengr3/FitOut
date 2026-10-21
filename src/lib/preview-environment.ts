/** The schema-only sandbox, independently inventoried in Neon. Never accept an arbitrary host. */
export const PREVIEW_DATABASE_HOST = "ep-young-heart-b3h8o9yw.c-4.ap-southeast-1.aws.neon.tech";

export function assertPreviewDatabase(databaseUrl: string | undefined): string {
  let url: URL;
  try {
    url = new URL(databaseUrl ?? "");
  } catch {
    throw new Error("An explicit preview database URL is required.");
  }
  const host = url.hostname.replace(/-pooler(?=\.)/, "");
  if (!/^(postgres|postgresql):$/.test(url.protocol) || host !== PREVIEW_DATABASE_HOST ||
      url.pathname !== "/neondb" || (url.port && url.port !== "5432")) {
    throw new Error("Refusing a database outside the isolated Preview branch.");
  }
  return databaseUrl!;
}

export function assertPreviewPaymentKey(secret: string): void {
  if (!/^sk_test_[A-Za-z0-9]+$/.test(secret)) {
    throw new Error("Preview payments require a PayMongo test key. Live keys are refused.");
  }
}

/** Preview email is opt-in to exact tester addresses; an empty list sends nothing. */
export function previewRecipientAllowed(to: string, recipients: string | undefined): boolean {
  const address = to.trim().toLowerCase();
  return /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address) &&
    (recipients ?? "").split(",").some((value) => value.trim().toLowerCase() === address);
}
