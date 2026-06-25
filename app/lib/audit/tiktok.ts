import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const TIKTOK_PATTERNS = {
  script: /analytics\.tiktok\.com\/i18n\/pixel\/events\.js|static\.tiktok\.com\/pixel/gi,
  load: /ttq\.load\s*\(\s*['"]([A-Z0-9]{20,})['"]/g,
  purchase: /ttq\.track\s*\(\s*['"]CompletePayment['"]/g,
  addToCart: /ttq\.track\s*\(\s*['"]AddToCart['"]/g,
  viewContent: /ttq\.track\s*\(\s*['"]ViewContent['"]/g,
  initiateCheckout: /ttq\.track\s*\(\s*['"]InitiateCheckout['"]/g,
};

export function auditTikTok(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const scriptCheck = searchAssets(assets, [TIKTOK_PATTERNS.script]);
  if (!scriptCheck.found) {
    issues.push({
      id: "tiktok-not-found",
      tool: "TikTok Pixel",
      severity: "info",
      title: "TikTok Pixel not detected",
      description: "No TikTok Pixel base code found in your theme. If you run TikTok ads, conversion tracking is missing.",
      fix: "Add the TikTok Pixel base code to theme.liquid <head>. Get your Pixel ID from TikTok Ads Manager → Assets → Events.",
    });
    return issues;
  }

  const pixelIds = assets.flatMap((a) =>
    [...a.value.matchAll(/ttq\.load\s*\(\s*['"]([A-Z0-9]{20,})['"]/g)].map((m) => m[1])
  );
  const uniqueIds = [...new Set(pixelIds)];

  if (uniqueIds.length === 0) {
    issues.push({
      id: "tiktok-no-id",
      tool: "TikTok Pixel",
      severity: "critical",
      title: "TikTok Pixel script found but no Pixel ID loaded",
      description: "The TikTok pixel script is present but ttq.load('PIXEL_ID') was not found. The pixel is not active.",
      fix: "Add ttq.load('YOUR_PIXEL_ID') immediately after the TikTok pixel base script.",
    });
  } else if (uniqueIds.length > 1) {
    issues.push({
      id: "tiktok-duplicate",
      tool: "TikTok Pixel",
      severity: "warning",
      title: "Multiple TikTok Pixel IDs detected",
      description: `Found ${uniqueIds.length} pixel IDs: ${uniqueIds.join(", ")}. This causes duplicate events.`,
      fix: "Remove duplicate ttq.load() calls. Only load one TikTok Pixel ID per page.",
    });
  }

  const purchaseCheck = searchAssets(assets, [TIKTOK_PATTERNS.purchase]);
  if (!purchaseCheck.found) {
    issues.push({
      id: "tiktok-purchase-missing",
      tool: "TikTok Pixel",
      severity: "critical",
      title: "TikTok CompletePayment event not found",
      description: "No ttq.track('CompletePayment') event detected. TikTok Ads can't report purchase conversions.",
      fix: "Add ttq.track('CompletePayment', { content_id, content_type, currency, value }) on the order confirmation page.",
    });
  }

  const cartCheck = searchAssets(assets, [TIKTOK_PATTERNS.addToCart]);
  if (!cartCheck.found) {
    issues.push({
      id: "tiktok-add-to-cart-missing",
      tool: "TikTok Pixel",
      severity: "warning",
      title: "TikTok AddToCart event not found",
      description: "No AddToCart event detected. You're missing funnel data for TikTok campaign optimization.",
      fix: "Fire ttq.track('AddToCart', { content_id, content_type, currency, value }) when a product is added to cart.",
    });
  }

  const checkoutCheck = searchAssets(assets, [TIKTOK_PATTERNS.initiateCheckout]);
  if (!checkoutCheck.found) {
    issues.push({
      id: "tiktok-checkout-missing",
      tool: "TikTok Pixel",
      severity: "info",
      title: "TikTok InitiateCheckout event not found",
      description: "No InitiateCheckout event detected. Your TikTok funnel data will be incomplete.",
      fix: "Add ttq.track('InitiateCheckout') when customers reach the checkout page.",
    });
  }

  return issues;
}
