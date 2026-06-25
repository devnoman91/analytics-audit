import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const PINTEREST_PATTERNS = {
  script: /s\.pinimg\.com\/ct\/core\.js|pintrk/gi,
  load: /pintrk\s*\(\s*['"]load['"]\s*,\s*['"](\d{13,})['"]/g,
  pageVisit: /pintrk\s*\(\s*['"]track['"]\s*,\s*['"]pagevisit['"]/gi,
  checkout: /pintrk\s*\(\s*['"]track['"]\s*,\s*['"]checkout['"]/gi,
  addToCart: /pintrk\s*\(\s*['"]track['"]\s*,\s*['"]addtocart['"]/gi,
  viewCategory: /pintrk\s*\(\s*['"]track['"]\s*,\s*['"]viewcategory['"]/gi,
};

export function auditPinterest(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const scriptCheck = searchAssets(assets, [PINTEREST_PATTERNS.script]);
  if (!scriptCheck.found) {
    issues.push({
      id: "pinterest-not-found",
      tool: "Pinterest Tag",
      severity: "info",
      title: "Pinterest Tag not detected",
      description: "No Pinterest Tag found in your theme. If you run Pinterest ads, conversion tracking is missing.",
      fix: "Add the Pinterest Tag base code to theme.liquid <head>. Get your Tag ID from Pinterest Ads → Conversions.",
    });
    return issues;
  }

  const tagIds = assets.flatMap((a) =>
    [...a.value.matchAll(/pintrk\s*\(\s*['"]load['"]\s*,\s*['"](\d{13,})['"]/g)].map((m) => m[1])
  );
  const uniqueIds = [...new Set(tagIds)];

  if (uniqueIds.length === 0) {
    issues.push({
      id: "pinterest-no-id",
      tool: "Pinterest Tag",
      severity: "critical",
      title: "Pinterest Tag script found but no Tag ID loaded",
      description: "The Pinterest tag script is present but pintrk('load', 'TAG_ID') was not found. The tag is not active.",
      fix: "Add pintrk('load', 'YOUR_TAG_ID') immediately after loading the Pinterest tag script.",
    });
  } else if (uniqueIds.length > 1) {
    issues.push({
      id: "pinterest-duplicate",
      tool: "Pinterest Tag",
      severity: "warning",
      title: "Multiple Pinterest Tag IDs detected",
      description: `Found ${uniqueIds.length} tag IDs: ${uniqueIds.join(", ")}. This causes duplicate events.`,
      fix: "Remove duplicate pintrk('load') calls. Only load one Pinterest Tag ID per page.",
    });
  }

  const checkoutCheck = searchAssets(assets, [PINTEREST_PATTERNS.checkout]);
  if (!checkoutCheck.found) {
    issues.push({
      id: "pinterest-checkout-missing",
      tool: "Pinterest Tag",
      severity: "critical",
      title: "Pinterest checkout event not found",
      description: "No pintrk('track', 'checkout') event detected. Pinterest Ads can't report purchase conversions.",
      fix: "Add pintrk('track', 'checkout', { value, order_quantity, currency, line_items }) on the order confirmation page.",
    });
  }

  const cartCheck = searchAssets(assets, [PINTEREST_PATTERNS.addToCart]);
  if (!cartCheck.found) {
    issues.push({
      id: "pinterest-add-to-cart-missing",
      tool: "Pinterest Tag",
      severity: "warning",
      title: "Pinterest addtocart event not found",
      description: "No addtocart event detected. You're missing funnel data for Pinterest campaign optimization.",
      fix: "Fire pintrk('track', 'addtocart', { value, currency, line_items }) when a product is added to cart.",
    });
  }

  const pageVisitCheck = searchAssets(assets, [PINTEREST_PATTERNS.pageVisit]);
  if (!pageVisitCheck.found) {
    issues.push({
      id: "pinterest-pagevisit-missing",
      tool: "Pinterest Tag",
      severity: "info",
      title: "Pinterest pagevisit event not found",
      description: "No pagevisit event detected. This event is needed to build retargeting audiences in Pinterest.",
      fix: "Add pintrk('track', 'pagevisit') on every page load after your pintrk('load') call.",
    });
  }

  return issues;
}
