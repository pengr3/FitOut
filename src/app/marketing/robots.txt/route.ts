import robots from "../robots";

// Installed Next recognizes robots.ts only at app root. Keep the purpose-specific
// resource in this namespace and serialize it through a real Route Handler.
export async function GET() {
  const data = await robots();
  const rules = Array.isArray(data.rules) ? data.rules : [data.rules];
  const lines: string[] = [];
  for (const rule of rules) {
    if (!rule) continue;
    for (const agent of Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent]) lines.push(`User-Agent: ${agent}`);
    for (const [label, value] of [["Allow", rule.allow], ["Disallow", rule.disallow]] as const) {
      for (const path of Array.isArray(value) ? value : value ? [value] : []) lines.push(`${label}: ${path}`);
    }
  }
  for (const url of Array.isArray(data.sitemap) ? data.sitemap : data.sitemap ? [data.sitemap] : []) lines.push(`Sitemap: ${url}`);
  return new Response(`${lines.join("\n")}\n`, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "private, no-store",
    Vary: "Host",
  } });
}
