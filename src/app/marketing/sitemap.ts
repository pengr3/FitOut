import type { MetadataRoute } from "next";
import { absoluteMarketingUrl } from "@/lib/app-origins";
import { MARKETING_PAGES } from "@/lib/host-route-policy";

export default function sitemap(): MetadataRoute.Sitemap {
  return [...MARKETING_PAGES].map((path) => ({ url: absoluteMarketingUrl(path as `/${string}`) }));
}
