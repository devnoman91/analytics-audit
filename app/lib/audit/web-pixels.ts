import type { AuditIssue } from "./index";

interface WebPixel {
  id: string;
}

interface ScriptTag {
  id: string;
  src: string;
}

export async function auditWebPixels(admin: any): Promise<{ issues: AuditIssue[]; webPixels: WebPixel[]; scriptTags: ScriptTag[] }> {
  const issues: AuditIssue[] = [];

  const webPixels: WebPixel[] = [];

  // Query script tags (legacy tracking)
  const scriptsRes = await admin.graphql(`#graphql
    query getScriptTags {
      scriptTags(first: 50) {
        nodes {
          id
          src
        }
      }
    }
  `);
  const scriptsData = await scriptsRes.json();
  const scriptTags: ScriptTag[] = scriptsData.data?.scriptTags?.nodes ?? [];

  // Check for analytics-related script tags (not recommended — they don't fire in checkout)
  const analyticsScripts = scriptTags.filter((s) =>
    s.src.includes("googletagmanager") ||
    s.src.includes("google-analytics") ||
    s.src.includes("facebook") ||
    s.src.includes("fbevents") ||
    s.src.includes("tiktok") ||
    s.src.includes("snap") ||
    s.src.includes("klaviyo")
  );

  if (analyticsScripts.length > 0) {
    issues.push({
      id: "script-tags-analytics",
      tool: "ScriptTags",
      severity: "warning",
      title: "Analytics loaded via ScriptTags API (won't fire in checkout)",
      description: `${analyticsScripts.length} analytics script(s) loaded as Shopify ScriptTags. ScriptTags don't run on the checkout or order status page — purchase events won't fire.\n\nAffected: ${analyticsScripts.map((s) => s.src).join(", ")}`,
      fix: "Migrate tracking from ScriptTags to Shopify Web Pixels API or theme.liquid. Web Pixels are the only way to track checkout events reliably.",
    });
  }

  // Note: Admin API only exposes the current app's own web pixel.
  // We check script tags to identify analytics loaded via legacy method.

  return { issues, webPixels, scriptTags };
}
