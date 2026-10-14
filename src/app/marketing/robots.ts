import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { isMarketingPreviewRequest } from "@/lib/host-route-policy";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isMarketingPreviewRequest((await headers()).get("host"))) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/marketing", "/api/"] },
    sitemap: absoluteMarketingUrl("/sitemap.xml"),
  };
}
