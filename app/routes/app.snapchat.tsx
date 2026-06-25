import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { scanThemeAssets } from "../lib/audit/theme-scanner";
import { auditSnapchat } from "../lib/audit/snapchat";
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

export default function SnapchatPage() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  return (
    <s-page heading="Snapchat Pixel Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run Snapchat Audit"}
      </s-button>

      {!result && !isLoading && (
        <s-section heading="What we check">
          <s-paragraph>Scans <strong>{shop}</strong> for Snapchat Pixel setup issues.</s-paragraph>
          <s-unordered-list>
            <s-list-item>Snapchat Pixel base code (sc-static.net)</s-list-item>
            <s-list-item>Pixel ID via snaptr('init')</s-list-item>
            <s-list-item>Duplicate Pixel IDs</s-list-item>
            <s-list-item>PURCHASE event on order confirmation</s-list-item>
            <s-list-item>ADD_CART event</s-list-item>
            <s-list-item>START_CHECKOUT event</s-list-item>
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
