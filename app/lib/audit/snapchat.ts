import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const SNAP_PATTERNS = {
  script: /sc-static\.net\/scevent\.min\.js|tr\.snapchat\.com\/p\.js/gi,
  init: /snaptr\s*\(\s*['"]init['"]\s*,\s*['"]([a-f0-9-]{36})['"]/gi,
  purchase: /snaptr\s*\(\s*['"]track['"]\s*,\s*['"]PURCHASE['"]/g,
  addToCart: /snaptr\s*\(\s*['"]track['"]\s*,\s*['"]ADD_CART['"]/g,
  viewContent: /snaptr\s*\(\s*['"]track['"]\s*,\s*['"]VIEW_CONTENT['"]/g,
  startCheckout: /snaptr\s*\(\s*['"]track['"]\s*,\s*['"]START_CHECKOUT['"]/g,
};

export function auditSnapchat(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const scriptCheck = searchAssets(assets, [SNAP_PATTERNS.script]);
  if (!scriptCheck.found) {
    issues.push({
      id: "snapchat-not-found",
      tool: "Snapchat Pixel",
      severity: "info",
      title: "Snapchat Pixel not detected",
      description: "No Snapchat Pixel base code found. If you run Snapchat ads, conversion tracking is missing.",
      fix: "Add the Snapchat Pixel base code to theme.liquid <head>. Get your Pixel ID from Snapchat Ads Manager → Events Manager.",
    });
    return issues;
  }

  const pixelIds = assets.flatMap((a) =>
    [...a.value.matchAll(/snaptr\s*\(\s*['"]init['"]\s*,\s*['"]([a-f0-9-]{36})['"]/gi)].map((m) => m[1])
  );
  const uniqueIds = [...new Set(pixelIds)];

  if (uniqueIds.length === 0) {
    issues.push({
      id: "snapchat-no-id",
      tool: "Snapchat Pixel",
      severity: "critical",
      title: "Snapchat Pixel script found but no Pixel ID initialized",
      description: "The Snapchat pixel script is present but snaptr('init', 'PIXEL_ID') was not found. The pixel is not active.",
      fix: "Add snaptr('init', 'YOUR_PIXEL_ID') immediately after loading the Snapchat pixel script.",
    });
  } else if (uniqueIds.length > 1) {
    issues.push({
      id: "snapchat-duplicate",
      tool: "Snapchat Pixel",
      severity: "warning",
      title: "Multiple Snapchat Pixel IDs detected",
      description: `Found ${uniqueIds.length} pixel IDs: ${uniqueIds.join(", ")}. This causes duplicate events.`,
      fix: "Remove duplicate snaptr('init') calls. Only initialize one Pixel ID per page.",
    });
  }

  const purchaseCheck = searchAssets(assets, [SNAP_PATTERNS.purchase]);
  if (!purchaseCheck.found) {
    issues.push({
      id: "snapchat-purchase-missing",
      tool: "Snapchat Pixel",
      severity: "critical",
      title: "Snapchat PURCHASE event not found",
      description: "No snaptr('track', 'PURCHASE') event detected. Snapchat Ads can't report purchase conversions.",
      fix: "Add snaptr('track', 'PURCHASE', { price, currency, transaction_id, item_ids }) on the order confirmation page.",
    });
  }

  const cartCheck = searchAssets(assets, [SNAP_PATTERNS.addToCart]);
  if (!cartCheck.found) {
    issues.push({
      id: "snapchat-add-to-cart-missing",
      tool: "Snapchat Pixel",
      severity: "warning",
      title: "Snapchat ADD_CART event not found",
      description: "No ADD_CART event detected. You're missing funnel data for Snapchat campaign optimization.",
      fix: "Fire snaptr('track', 'ADD_CART', { item_ids, price, currency }) when a product is added to cart.",
    });
  }

  const checkoutCheck = searchAssets(assets, [SNAP_PATTERNS.startCheckout]);
  if (!checkoutCheck.found) {
    issues.push({
      id: "snapchat-checkout-missing",
      tool: "Snapchat Pixel",
      severity: "info",
      title: "Snapchat START_CHECKOUT event not found",
      description: "No START_CHECKOUT event detected. Your Snapchat funnel reports will be incomplete.",
      fix: "Add snaptr('track', 'START_CHECKOUT') when customers reach the checkout page.",
    });
  }

  return issues;
}
