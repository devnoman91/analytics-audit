import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const KLAVIYO_PATTERNS = {
  script: /static\.klaviyo\.com\/onsite\/js\/klaviyo\.js|a\.klaviyo\.com\/media\/js/gi,
  companyId: /klaviyo\.init\s*\(\s*\{[^}]*['"]company_id['"]\s*:\s*['"]([A-Z0-9]{6})['"]/gi,
  legacyAccount: /_learnq\.push\s*\(\s*\[\s*['"]account['"]\s*,\s*['"]([A-Z0-9]{6})['"]/gi,
  identify: /_learnq\.push\s*\(\s*\[\s*['"]identify['"]/g,
  trackEvent: /_learnq\.push\s*\(\s*\[\s*['"]track['"]/g,
  klaviyoJs: /klaviyo\.js/gi,
};

export function auditKlaviyo(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const scriptCheck = searchAssets(assets, [KLAVIYO_PATTERNS.script, KLAVIYO_PATTERNS.klaviyoJs]);
  if (!scriptCheck.found) {
    issues.push({
      id: "klaviyo-not-found",
      tool: "Klaviyo",
      severity: "info",
      title: "Klaviyo not detected in theme",
      description: "No Klaviyo tracking script found in your theme. On-site tracking and browse abandonment flows won't work.",
      fix: "Install Klaviyo via the Klaviyo Shopify app (recommended) or add the Klaviyo on-site JavaScript to theme.liquid. Your Public API Key is in Klaviyo → Settings → API Keys.",
    });
    return issues;
  }

  // Check for company/account ID
  const companyIds = assets.flatMap((a) => [
    ...[...a.value.matchAll(/klaviyo\.init\s*\(\s*\{[^}]*['"]company_id['"]\s*:\s*['"]([A-Z0-9]{6})['"]/gi)].map((m) => m[1]),
    ...[...a.value.matchAll(/_learnq\.push\s*\(\s*\[\s*['"]account['"]\s*,\s*['"]([A-Z0-9]{6})['"]/gi)].map((m) => m[1]),
    ...[...a.value.matchAll(/klaviyo\.js\?company_id=([A-Z0-9]{6})/gi)].map((m) => m[1]),
  ]);
  const uniqueIds = [...new Set(companyIds)];

  if (uniqueIds.length === 0) {
    issues.push({
      id: "klaviyo-no-id",
      tool: "Klaviyo",
      severity: "critical",
      title: "Klaviyo script found but no Company ID detected",
      description: "The Klaviyo script is loaded but no Public API Key / Company ID was found. Klaviyo tracking is not active.",
      fix: "Ensure your Klaviyo script URL includes your Company ID: ?company_id=XXXXXX. Find your Public API Key in Klaviyo → Settings → API Keys.",
    });
  } else if (uniqueIds.length > 1) {
    issues.push({
      id: "klaviyo-duplicate",
      tool: "Klaviyo",
      severity: "warning",
      title: "Multiple Klaviyo Company IDs detected",
      description: `Found ${uniqueIds.length} company IDs: ${uniqueIds.join(", ")}. This can cause duplicate profile tracking.`,
      fix: "Remove duplicate Klaviyo scripts. Only one Company ID should be initialized per page.",
    });
  }

  // Check for active tracking events
  const trackCheck = searchAssets(assets, [KLAVIYO_PATTERNS.trackEvent, KLAVIYO_PATTERNS.identify]);
  if (!trackCheck.found) {
    issues.push({
      id: "klaviyo-no-events",
      tool: "Klaviyo",
      severity: "warning",
      title: "Klaviyo loaded but no tracking events found",
      description: "Klaviyo is installed but no identify or track calls were detected. Browse abandonment and on-site flows may not work correctly.",
      fix: "Add _learnq.push(['identify', { $email: customerEmail }]) when a customer is logged in or submits a form. Add _learnq.push(['track', 'Viewed Product', { ...productData }]) on product pages.",
    });
  }

  return issues;
}
