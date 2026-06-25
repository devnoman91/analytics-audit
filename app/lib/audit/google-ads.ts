import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const GADS_PATTERNS = {
  conversionId: /AW-\d{9,11}/g,
  conversionEvent: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]conversion['"]/g,
  remarketingEvent: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]page_view['"]/g,
  sendTo: /['"]send_to['"]\s*:\s*['"]AW-/g,
  gtagScript: /googletagmanager\.com\/gtag\/js/g,
};

export function auditGoogleAds(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const conversionIdCheck = searchAssets(assets, [GADS_PATTERNS.conversionId]);
  if (!conversionIdCheck.found) {
    issues.push({
      id: "gads-not-found",
      tool: "Google Ads",
      severity: "info",
      title: "Google Ads conversion tag not detected",
      description: "No Google Ads Conversion ID (AW-XXXXXXXXXX) found in your theme. If you run Google Ads, conversion tracking is missing.",
      fix: "Add your Google Ads conversion tag to theme.liquid or configure it in Google Tag Manager. Your Conversion ID is found in Google Ads → Tools → Conversions.",
    });
    return issues;
  }

  const conversionIds = [...new Set(conversionIdCheck.matches)];
  if (conversionIds.length > 1) {
    issues.push({
      id: "gads-duplicate-ids",
      tool: "Google Ads",
      severity: "warning",
      title: "Multiple Google Ads Conversion IDs detected",
      description: `Found ${conversionIds.length} conversion IDs: ${conversionIds.join(", ")}. Multiple IDs can cause duplicate conversion reporting.`,
      fix: "Verify each AW-ID belongs to an active Google Ads account. Remove any that are unused or belong to old accounts.",
    });
  }

  const conversionCheck = searchAssets(assets, [GADS_PATTERNS.conversionEvent, GADS_PATTERNS.sendTo]);
  if (!conversionCheck.found) {
    issues.push({
      id: "gads-conversion-event-missing",
      tool: "Google Ads",
      severity: "critical",
      title: "Google Ads conversion event not found",
      description: `Google Ads ID found (${conversionIds[0]}) but no conversion event detected. Your Google Ads campaign can't optimize for purchases.`,
      fix: "Add gtag('event', 'conversion', { send_to: 'AW-XXXXX/YYYYY', value, currency, transaction_id }) on the order confirmation page.",
    });
  }

  const gtagCheck = searchAssets(assets, [GADS_PATTERNS.gtagScript]);
  if (conversionIdCheck.found && !gtagCheck.found) {
    issues.push({
      id: "gads-gtag-missing",
      tool: "Google Ads",
      severity: "warning",
      title: "Google Ads ID found but gtag.js not loaded",
      description: "A Google Ads conversion ID is referenced but the gtag.js script was not detected in your theme.",
      fix: "Ensure gtag.js is loaded in your <head> with your AW-XXXXXXXXXX ID: <script async src=\"https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXXX\">",
    });
  }

  return issues;
}
