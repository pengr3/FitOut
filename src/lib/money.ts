// Shared currency formatter (IN-02). ONE definition imported by every surface that renders a price —
// the host "Your listings" card, the public listing page, and the booker availability calendar — so the
// formatting rules can never drift between them. Integer MINOR units (cents) → a localized currency
// string; falls back to a plain fixed-2 decimal when Intl doesn't recognize the currency code.
//
// Pure/isomorphic: no "use client"/"use server" directive, so both Server Components and Client
// Components can import it. Behavior is byte-identical to the three local copies it replaces.

// Booker-facing display currency (D-46). ONE shared source so every Phase-4 price surface — search
// cards, the reserve price breakdown, the confirmation page — renders PHP identically and can never
// drift. The listing page keeps its own local `DISPLAY_CURRENCY` until Plan 07 swaps it for this import.
export const DISPLAY_CURRENCY = "php";

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
}
