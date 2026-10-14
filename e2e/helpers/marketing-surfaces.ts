// Public documents are addressed through their marketing host, not the blocked namespace.
// The route-specific h1 proves each scan reached its own page rather than a redirect/404.
export const MARKETING_ORIGIN = "http://marketing.localhost:3000";
export const MARKETING_SURFACES = [
  { file: "src/app/marketing/page.tsx", path: "/", tell: "h1#home-heading" },
  { file: "src/app/marketing/hosts/page.tsx", path: "/hosts", tell: "h1#hosts-heading" },
  { file: "src/app/marketing/players/page.tsx", path: "/players", tell: "h1#players-heading" },
  { file: "src/app/marketing/about/page.tsx", path: "/about", tell: "h1#about-heading" },
  { file: "src/app/marketing/faq/page.tsx", path: "/faq", tell: "h1#faq-heading" },
  { file: "src/app/marketing/contact/page.tsx", path: "/contact", tell: "h1#contact-heading" },
] as const;
