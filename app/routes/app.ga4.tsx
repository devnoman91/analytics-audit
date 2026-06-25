import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { scanThemeAssets } from "../lib/audit/theme-scanner";
import { auditGA4 } from "../lib/audit/ga4";
import { calculateScore } from "../lib/audit/index";
import type { AuditIssue } from "../lib/audit/index";
import { ScoreCircle, SummaryStats, IssueList } from "../components/audit-ui";
import type { AuditResult } from "../lib/audit/index";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const themeResult = await scanThemeAssets(admin);
  const issues = auditGA4(themeResult.assets);
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

export default function GA4Page() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  return (
    <s-page heading="GA4 Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run GA4 Audit"}
      </s-button>

      {!result && !isLoading && (
        <s-section heading="What we check">
          <s-paragraph>Scans <strong>{shop}</strong> for GA4 setup issues.</s-paragraph>
          <s-unordered-list>
            <s-list-item>GA4 Measurement ID (G-XXXXXXXX) present</s-list-item>
            <s-list-item>Google Tag Manager detection</s-list-item>
            <s-list-item>Duplicate GA4 tags</s-list-item>
            <s-list-item>purchase event on order confirmation</s-list-item>
            <s-list-item>add_to_cart event</s-list-item>
            <s-list-item>begin_checkout event</s-list-item>
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
