import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { scanThemeAssets } from "../lib/audit/theme-scanner";
import { auditGoogleAds } from "../lib/audit/google-ads";
import { calculateScore } from "../lib/audit/index";
import type { AuditResult } from "../lib/audit/index";
import { ScoreCircle, SummaryStats, IssueList } from "../components/audit-ui";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const themeResult = await scanThemeAssets(admin);
  const issues = auditGoogleAds(themeResult.assets);
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

export default function GoogleAdsPage() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  return (
    <s-page heading="Google Ads Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run Google Ads Audit"}
      </s-button>

      {!result && !isLoading && (
        <s-section heading="What we check">
          <s-paragraph>Scans <strong>{shop}</strong> for Google Ads conversion tracking issues.</s-paragraph>
          <s-unordered-list>
            <s-list-item>Google Ads Conversion ID (AW-XXXXXXXXXX)</s-list-item>
            <s-list-item>gtag.js script loaded</s-list-item>
            <s-list-item>Duplicate Conversion IDs</s-list-item>
            <s-list-item>Conversion event firing on purchase</s-list-item>
          </s-unordered-list>
        </s-section>
      )}

      {isLoading && (
        <s-section heading="Scanning...">
          <s-paragraph>Reading theme assets for {shop}.</s-paragraph>
        </s-section>
      )}

      {result && !isLoading && (
        <>
          <s-section heading="Results">
            <ScoreCircle score={result.score} />
            <s-paragraph>
              Theme: <strong>{result.themeName}</strong> &mdash; {new Date(result.ranAt).toLocaleString()}
            </s-paragraph>
            <SummaryStats result={result} />
          </s-section>
          <IssueList issues={result.issues} />
        </>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
