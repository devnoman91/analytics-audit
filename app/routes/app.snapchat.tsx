import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { scanThemeAssets } from "../lib/audit/theme-scanner";
import { auditSnapchat } from "../lib/audit/snapchat";
import { calculateScore } from "../lib/audit/index";
import type { AuditResult } from "../lib/audit/index";
import { PlatformPageLayout } from "../components/audit-ui";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const themeResult = await scanThemeAssets(admin);
  const issues = auditSnapchat(themeResult.assets);
  const result: AuditResult = {
    shop: session.shop,
    themeName: themeResult.themeName,
    score: calculateScore(issues),
    issues,
    webPixelCount: 0,
    scriptTagCount: 0,
    ranAt: new Date().toISOString(),
  };
  return { result };
};

const CHECKS = [
  "Snapchat Pixel base code (sc-static.net)",
  "Pixel ID via snaptr('init')",
  "Duplicate Pixel IDs",
  "PURCHASE event on order confirmation",
  "ADD_CART event",
  "START_CHECKOUT event",
];

export default function SnapchatPage() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";

  return (
    <PlatformPageLayout
      heading="Snapchat Pixel Audit"
      color="#FFCD00"
      buttonLabel="Run Snapchat Audit"
      checks={CHECKS}
      shop={shop}
      isLoading={isLoading}
      result={fetcher.data?.result ?? null}
      onRun={() => fetcher.submit({}, { method: "POST" })}
    />
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
