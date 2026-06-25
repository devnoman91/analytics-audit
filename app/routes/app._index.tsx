import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { runAudit } from "../lib/audit/index";
import type { AuditResult } from "../lib/audit/index";
import { ScoreCircle, SummaryStats, IssueCard } from "../components/audit-ui";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const result = await runAudit(admin, session.shop);
  return { result };
};

const PLATFORMS = [
  {
    name: "GA4",
    description: "Google Analytics 4 — purchase, add_to_cart, begin_checkout events",
    href: "/app/ga4",
    color: "#E8710A",
  },
  {
    name: "Meta Pixel",
    description: "Facebook/Instagram ads — Purchase, AddToCart, InitiateCheckout events",
    href: "/app/meta",
    color: "#1877F2",
  },
  {
    name: "TikTok Pixel",
    description: "TikTok ads — CompletePayment, AddToCart, InitiateCheckout events",
    href: "/app/tiktok",
    color: "#010101",
  },
  {
    name: "Snapchat Pixel",
    description: "Snapchat ads — PURCHASE, ADD_CART, START_CHECKOUT events",
    href: "/app/snapchat",
    color: "#FFFC00",
    textColor: "#111",
  },
  {
    name: "Pinterest Tag",
    description: "Pinterest ads — checkout, addtocart, pagevisit events",
    href: "/app/pinterest",
    color: "#E60023",
  },
  {
    name: "Google Ads",
    description: "Google Ads conversion tracking — AW-XXXXXXXXXX conversion events",
    href: "/app/google-ads",
    color: "#4285F4",
  },
  {
    name: "Klaviyo",
    description: "Email/SMS flows — on-site tracking, identify and track events",
    href: "/app/klaviyo",
    color: "#006DFF",
  },
];

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  const criticalIssues = result?.issues.filter((i) => i.severity === "critical") ?? [];
  const warningIssues = result?.issues.filter((i) => i.severity === "warning") ?? [];
  const infoIssues = result?.issues.filter((i) => i.severity === "info") ?? [];

  return (
    <s-page heading="Analytics Audit Dashboard">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning all..." : "Run Full Audit"}
      </s-button>

      {/* Platform cards — always visible */}
      <s-section heading="Audit by Platform">
        <s-paragraph>
          Select a platform below to run a focused audit, or click <strong>Run Full Audit</strong> to check all platforms at once.
        </s-paragraph>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          {PLATFORMS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderTop: `4px solid ${p.color}`,
                  borderRadius: 8,
                  padding: "16px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 6 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                  {p.description}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: p.color }}>
                  Audit →
                </div>
              </div>
            </a>
          ))}
        </div>
      </s-section>

      {isLoading && (
        <s-section heading="Scanning all platforms...">
          <s-paragraph>Reading theme assets for {shop}. This may take a moment.</s-paragraph>
        </s-section>
      )}

      {result && !isLoading && (
        <>
          <s-section heading="Full Audit Results">
            <ScoreCircle score={result.score} />
            <s-paragraph>
              Theme: <strong>{result.themeName}</strong> &mdash; {new Date(result.ranAt).toLocaleString()}
            </s-paragraph>
            <SummaryStats result={result} />
          </s-section>

          {result.issues.length === 0 && (
            <s-section heading="All checks passed">
              <s-paragraph>No issues found across all platforms.</s-paragraph>
            </s-section>
          )}

          {criticalIssues.length > 0 && (
            <s-section heading={`Critical Issues (${criticalIssues.length})`}>
              <div>{criticalIssues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
            </s-section>
          )}

          {warningIssues.length > 0 && (
            <s-section heading={`Warnings (${warningIssues.length})`}>
              <div>{warningIssues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
            </s-section>
          )}

          {infoIssues.length > 0 && (
            <s-section heading={`Recommendations (${infoIssues.length})`}>
              <div>{infoIssues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
            </s-section>
          )}
        </>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
