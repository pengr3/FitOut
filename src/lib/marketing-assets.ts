import manifest from "../../public/marketing/screenshots/manifest.json";
import { absoluteMarketingUrl } from "@/lib/app-origins";

export const marketingSearchImage = {
  url: absoluteMarketingUrl("/marketing/screenshots/search.png"),
  width: manifest.captures.search.width,
  height: manifest.captures.search.height,
  alt: "FitOut search showing five photographed spaces and activity, location and group controls.",
};
