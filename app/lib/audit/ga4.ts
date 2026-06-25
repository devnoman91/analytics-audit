import type { ThemeAsset } from "./theme-scanner";
import { searchAssets } from "./theme-scanner";
import type { AuditIssue } from "./index";

const GA4_PATTERNS = {
  measurementId: /G-[A-Z0-9]{8,10}/g,
  gtagScript: /googletagmanager\.com\/gtag\/js/g,
  gtmScript: /googletagmanager\.com\/gtm\.js/g,
  gtmId: /GTM-[A-Z0-9]{6,8}/g,
  purchaseEvent: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]purchase['"]/g,
  addToCartEvent: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]add_to_cart['"]/g,
  beginCheckout: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]begin_checkout['"]/g,
  viewItem: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]view_item['"]/g,
  dataLayer: /dataLayer\.push\s*\(\s*\{[^}]*['"]purchase['"]/g,
  dataLayerAddToCart: /dataLayer\.push\s*\(\s*\{[^}]*['"]add_to_cart['"]/g,
};

export function auditGA4(assets: ThemeAsset[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const ga4Installed = searchAssets(assets, [GA4_PATTERNS.gtagScript, GA4_PATTERNS.measurementId]);
  const gtmInstalled = searchAssets(assets, [GA4_PATTERNS.gtmScript, GA4_PATTERNS.gtmId]);
  const hasGA4Base = ga4Installed.found || gtmInstalled.found;

  if (!hasGA4Base) {
    issues.push({
      id: "ga4-not-found",
      tool: "GA4",
      severity: "critical",
      title: "GA4 not detected in theme",
      description: "No Google Analytics 4 tag or Google Tag Manager found in your theme. All conversion data is being lost.",
      fix: "Install GA4 via Google Tag Manager or add the gtag.js snippet to your theme.liquid <head> section. Use your GA4 Measurement ID (G-XXXXXXXX).",
    });
    return issues;
  }

  // Check for GTM but warn that we can't verify what's inside
  if (gtmInstalled.found && !ga4Installed.found) {
    issues.push({
      id: "ga4-via-gtm-unverifiable",
      tool: "GA4",
      severity: "warning",
      title: "GA4 loaded via GTM — events can't be verified from theme",
      description: `Google Tag Manager (${gtmInstalled.matches[0] ?? ""}) is present. GA4 may be configured inside GTM but we can't verify events from theme code alone.`,
      fix: "Open GTM → check that a GA4 Configuration tag exists and a Purchase trigger fires on the order confirmation page (event: purchase with transaction_id, value, currency, items).",
    });
    return issues;
  }

  // Check measurement ID
  const measurementIds = ga4Installed.matches.filter((m) => m.startsWith("G-"));
  if (measurementIds.length > 1) {
    issues.push({
      id: "ga4-duplicate-ids",
      tool: "GA4",
      severity: "warning",
      title: "Multiple GA4 Measurement IDs detected",
      description: `Found ${measurementIds.length} GA4 IDs: ${measurementIds.join(", ")}. This causes duplicate events and inflated data.`,
      fix: "Remove all but one GA4 tag. Keep only the primary measurement ID.",
    });
  }

  // Check purchase event
  const purchaseCheck = searchAssets(assets, [GA4_PATTERNS.purchaseEvent, GA4_PATTERNS.dataLayer]);
  if (!purchaseCheck.found) {
    issues.push({
      id: "ga4-purchase-missing",
      tool: "GA4",
      severity: "critical",
      title: "GA4 purchase event not found",
      description: "GA4 is installed but no purchase event was detected. Orders are not being tracked — your ROAS data is broken.",
      fix: "Add a gtag('event', 'purchase', { transaction_id, value, currency, items }) call to your order confirmation page (checkout.liquid or order-status page extension).",
    });
  }

  // Check add_to_cart
  const cartCheck = searchAssets(assets, [GA4_PATTERNS.addToCartEvent, GA4_PATTERNS.dataLayerAddToCart]);
  if (!cartCheck.found) {
    issues.push({
      id: "ga4-add-to-cart-missing",
      tool: "GA4",
      severity: "warning",
      title: "GA4 add_to_cart event not found",
      description: "No add_to_cart event detected. You're missing funnel data and can't build add-to-cart audiences in GA4.",
      fix: "Fire gtag('event', 'add_to_cart', { currency, value, items }) when a customer adds a product to cart.",
    });
  }

  // Check begin_checkout
  const checkoutCheck = searchAssets(assets, [GA4_PATTERNS.beginCheckout]);
  if (!checkoutCheck.found) {
    issues.push({
      id: "ga4-begin-checkout-missing",
      tool: "GA4",
      severity: "info",
      title: "GA4 begin_checkout event not found",
      description: "No begin_checkout event detected. Your checkout funnel reports in GA4 will be incomplete.",
      fix: "Add gtag('event', 'begin_checkout', { currency, value, items }) when customers reach the checkout page.",
    });
  }

  return issues;
}
