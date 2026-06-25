import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { runAudit } from "../lib/audit/index";
import type { AuditResult, AuditIssue, Severity } from "../lib/audit/index";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const result = await runAudit(admin, session.shop);
  return { result };
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#D72C0D",
  warning: "#B98900",
  info: "#0070F0",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "#FFF4F4",
  warning: "#FFFBE6",
  info: "#EBF5FF",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

function scoreColor(score: number) {
  if (score >= 80) return "#008060";
  if (score >= 50) return "#B98900";
  return "#D72C0D";
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: SEVERITY_BG[issue.severity],
        border: `1px solid ${SEVERITY_COLOR[issue.severity]}33`,
        borderLeft: `4px solid ${SEVERITY_COLOR[issue.severity]}`,
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          style={{
            background: SEVERITY_COLOR[issue.severity],
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 12,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {SEVERITY_LABEL[issue.severity]}
        </span>
        <span
          style={{
            background: "#fff",
            color: "#6B7280",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
          }}
        >
          {issue.tool}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 4 }}>
        {issue.title}
      </div>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: open ? 10 : 0, whiteSpace: "pre-wrap" }}>
        {issue.description}
      </div>
      {open && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 13,
            color: "#065F46",
          }}
        >
          <strong>How to fix:</strong> {issue.fix}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          marginTop: 8,
          background: "none",
          border: "none",
          color: SEVERITY_COLOR[issue.severity],
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? "Hide fix ▲" : "How to fix ▼"}
      </button>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = scoreColor(score);
  const label = score >= 80 ? "Healthy" : score >= 50 ? "Issues Found" : "Broken";
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `6px solid ${color}`,
          fontSize: 36,
          fontWeight: 800,
          color,
          background: "#fff",
          marginBottom: 8,
        }}
      >
        {score}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{label}</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Analytics Health Score</div>
    </div>
  );
}

function SummaryStats({ result }: { result: AuditResult }) {
  const critical = result.issues.filter((i) => i.severity === "critical").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const info = result.issues.filter((i) => i.severity === "info").length;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      {[
        { label: "Critical", value: critical, color: "#D72C0D" },
        { label: "Warnings", value: warnings, color: "#B98900" },
        { label: "Info", value: info, color: "#0070F0" },
        { label: "Web Pixels", value: result.webPixelCount, color: "#008060" },
      ].map((stat) => (
        <div
          key={stat.label}
          style={{
            flex: "1 1 80px",
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            padding: "12px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  const criticalIssues = result?.issues.filter((i) => i.severity === "critical") ?? [];
  const warningIssues = result?.issues.filter((i) => i.severity === "warning") ?? [];
  const infoIssues = result?.issues.filter((i) => i.severity === "info") ?? [];

  return (
    <s-page heading="Analytics Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run Audit"}
      </s-button>

      {!result && !isLoading && (
        <s-section heading="How it works">
          <s-paragraph>
            This tool scans your Shopify store&apos;s active theme and checks for properly configured
            GA4 and Meta Pixel tracking. It identifies missing purchase events, broken conversion
            tracking, and common setup mistakes.
          </s-paragraph>
          <s-paragraph>
            Click <strong>Run Audit</strong> to scan <strong>{shop}</strong>.
          </s-paragraph>

          <s-section heading="What we check">
            <s-unordered-list>
              <s-list-item>GA4 install and Measurement ID</s-list-item>
              <s-list-item>GA4 purchase, add_to_cart, begin_checkout events</s-list-item>
              <s-list-item>Meta Pixel install and Pixel ID</s-list-item>
              <s-list-item>Meta Pixel Purchase, AddToCart, InitiateCheckout events</s-list-item>
              <s-list-item>Shopify Web Pixels and ScriptTags</s-list-item>
              <s-list-item>Duplicate tags and broken initializations</s-list-item>
            </s-unordered-list>
          </s-section>
        </s-section>
      )}

      {isLoading && (
        <s-section heading="Scanning...">
          <s-paragraph>Reading theme assets and checking tracking setup for {shop}.</s-paragraph>
        </s-section>
      )}

      {result && !isLoading && (
        <>
          {/* Score */}
          <s-section heading="Results">
            <ScoreCircle score={result.score} />
            <s-paragraph>
              Scanned theme: <strong>{result.themeName}</strong> &mdash; {new Date(result.ranAt).toLocaleString()}
            </s-paragraph>

            <SummaryStats result={result} />
          </s-section>

          {/* No issues */}
          {result.issues.length === 0 && (
            <s-section heading="All checks passed">
              <s-paragraph>
                No issues found. Your GA4 and Meta Pixel tracking appears to be correctly configured.
              </s-paragraph>
            </s-section>
          )}

          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <s-section heading={`Critical Issues (${criticalIssues.length})`}>
              <div>
                {criticalIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </s-section>
          )}

          {/* Warnings */}
          {warningIssues.length > 0 && (
            <s-section heading={`Warnings (${warningIssues.length})`}>
              <div>
                {warningIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </s-section>
          )}

          {/* Info */}
          {infoIssues.length > 0 && (
            <s-section heading={`Recommendations (${infoIssues.length})`}>
              <div>
                {infoIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
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
