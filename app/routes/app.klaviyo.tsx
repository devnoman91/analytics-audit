import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { scanThemeAssets } from "../lib/audit/theme-scanner";
import { auditKlaviyo } from "../lib/audit/klaviyo";
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
  const issues = auditKlaviyo(themeResult.assets);
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

export default function KlaviyoPage() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  return (
    <s-page heading="Klaviyo Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run Klaviyo Audit"}
      </s-button>

      {!result && !isLoading && (
        <s-section heading="What we check">
          <s-paragraph>Scans <strong>{shop}</strong> for Klaviyo on-site tracking issues.</s-paragraph>
          <s-unordered-list>
            <s-list-item>Klaviyo on-site JavaScript (static.klaviyo.com)</s-list-item>
            <s-list-item>Company ID / Public API Key</s-list-item>
            <s-list-item>Duplicate Company IDs</s-list-item>
            <s-list-item>identify and track event calls</s-list-item>
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
