import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const META_PATTERNS = {
  pixelScript: /connect\.facebook\.net\/[a-z_]+\/fbevents\.js/gi,
  pixelInit: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{10,20})['"]/g,
  purchaseEvent: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]Purchase['"]/g,
  addToCartEvent: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]AddToCart['"]/g,
  viewContent: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]ViewContent['"]/g,
  initiateCheckout: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]InitiateCheckout['"]/g,
  pageView: /fbq\s*\(\s*['"]track['"]\s*,\s*['"]PageView['"]/g,
};

export function auditMetaPixel(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const pixelInstalled = searchAssets(assets, [META_PATTERNS.pixelScript]);

  if (!pixelInstalled.found) {
    issues.push({
      id: "meta-pixel-not-found",
      tool: "Meta Pixel",
      severity: "critical",
      title: "Meta Pixel not detected in theme",
      description: "No Meta (Facebook) Pixel base code found. Your Meta/Facebook/Instagram ads can't track conversions.",
      fix: "Add the Meta Pixel base code to your theme.liquid <head>. You can also install it via the Meta Sales Channel app in Shopify.",
    });
    return issues;
  }

  // Check for multiple pixel inits
  const initMatches = searchAssets(assets, [META_PATTERNS.pixelInit]);
  const pixelIds = [...new Set(
    assets.flatMap((a) => [...a.value.matchAll(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{10,20})['"]/g)].map((m) => m[1]))
  )];

  if (pixelIds.length === 0) {
    issues.push({
      id: "meta-pixel-no-id",
      tool: "Meta Pixel",
      severity: "critical",
      title: "Meta Pixel script found but no Pixel ID initialized",
      description: "The fbevents.js script is loaded but fbq('init', 'PIXEL_ID') was not found. The pixel is not active.",
      fix: "Add fbq('init', 'YOUR_PIXEL_ID') immediately after loading fbevents.js. Replace YOUR_PIXEL_ID with your actual Meta Pixel ID from Events Manager.",
    });
  } else if (pixelIds.length > 1) {
    issues.push({
      id: "meta-pixel-duplicate",
      tool: "Meta Pixel",
      severity: "warning",
      title: "Multiple Meta Pixel IDs detected",
      description: `Found ${pixelIds.length} pixel IDs: ${pixelIds.join(", ")}. This causes duplicate conversion events and inflated ad data.`,
      fix: "Remove duplicate pixel code. Only initialize one pixel ID per page. If you have multiple pixels, use the same base code and add secondary IDs with fbq('init', 'SECOND_ID').",
    });
  }

  // Check purchase event
  const purchaseCheck = searchAssets(assets, [META_PATTERNS.purchaseEvent]);
  if (!purchaseCheck.found) {
    issues.push({
      id: "meta-purchase-missing",
      tool: "Meta Pixel",
      severity: "critical",
      title: "Meta Pixel Purchase event not found",
      description: "No fbq('track', 'Purchase') event detected. Meta Ads Manager can't report on purchase conversions — your campaign ROAS is wrong.",
      fix: "Add fbq('track', 'Purchase', { value: orderTotal, currency: 'USD', content_ids: [...], content_type: 'product' }) on your order confirmation page.",
    });
  }

  // Check AddToCart
  const cartCheck = searchAssets(assets, [META_PATTERNS.addToCartEvent]);
  if (!cartCheck.found) {
    issues.push({
      id: "meta-add-to-cart-missing",
      tool: "Meta Pixel",
      severity: "warning",
      title: "Meta Pixel AddToCart event not found",
      description: "No AddToCart event detected. You can't run add-to-cart retargeting campaigns or build these audiences.",
      fix: "Fire fbq('track', 'AddToCart', { content_ids: [productId], content_type: 'product', value, currency }) when a customer adds to cart.",
    });
  }

  // Check InitiateCheckout
  const checkoutCheck = searchAssets(assets, [META_PATTERNS.initiateCheckout]);
  if (!checkoutCheck.found) {
    issues.push({
      id: "meta-initiate-checkout-missing",
      tool: "Meta Pixel",
      severity: "info",
      title: "Meta Pixel InitiateCheckout event not found",
      description: "No InitiateCheckout event detected. Missing this event limits your checkout abandonment campaigns.",
      fix: "Add fbq('track', 'InitiateCheckout') when customers reach the checkout page.",
    });
  }

  return issues;
}
