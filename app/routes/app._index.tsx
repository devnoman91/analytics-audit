import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { runAudit } from "../lib/audit/index";
import type { AuditResult } from "../lib/audit/index";
import { ScoreCircle, StatsRow, IssueCard } from "../components/audit-ui";

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
  { name: "GA4",          desc: "Measurement ID, purchase & cart events",     href: "/app/ga4",        color: "#E8710A" },
  { name: "Meta Pixel",   desc: "Purchase, AddToCart, InitiateCheckout",       href: "/app/meta",       color: "#1877F2" },
  { name: "TikTok Pixel", desc: "CompletePayment, AddToCart events",           href: "/app/tiktok",     color: "#2D2D2D" },
  { name: "Snapchat",     desc: "PURCHASE, ADD_CART, START_CHECKOUT events",   href: "/app/snapchat",   color: "#FFFC00", text: "#111" },
  { name: "Pinterest",    desc: "checkout, addtocart, pagevisit events",       href: "/app/pinterest",  color: "#E60023" },
  { name: "Google Ads",   desc: "Conversion ID (AW-) and conversion events",   href: "/app/google-ads", color: "#4285F4" },
  { name: "Klaviyo",      desc: "On-site script, identify & track events",     href: "/app/klaviyo",    color: "#006DFF" },
];

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const result: AuditResult | null = fetcher.data?.result ?? null;

  const criticalIssues = result?.issues.filter((i) => i.severity === "critical") ?? [];
  const warningIssues  = result?.issues.filter((i) => i.severity === "warning")  ?? [];
  const infoIssues     = result?.issues.filter((i) => i.severity === "info")     ?? [];

  return (
    <s-page heading="Analytics Audit">
      <s-button
        slot="primary-action"
        onClick={() => fetcher.submit({}, { method: "POST" })}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : "Run Full Audit"}
      </s-button>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "8px 0 48px" }}>

        {/* Platform grid */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
            Audit by Platform
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
            {PLATFORMS.map((p) => (
              <a key={p.name} href={p.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderTop: `3px solid ${p.color}`,
                    borderRadius: 10,
                    padding: "16px 16px 14px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "box-shadow 0.15s, transform 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 12 }}>{p.desc}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Audit →
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #E2E8F0", marginBottom: 28 }} />

        {/* Full audit CTA (pre-scan) */}
        {!result && !isLoading && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "28px 24px",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Run Full Audit</div>
            <div style={{ fontSize: 13, color: "#64748B", maxWidth: 400, margin: "0 auto 20px" }}>
              Scans all platforms at once — GA4, Meta, TikTok, Snapchat, Pinterest, Google Ads, and Klaviyo for <strong>{shop}</strong>.
            </div>
            <button
              onClick={() => fetcher.submit({}, { method: "POST" })}
              style={{
                background: "#0F172A",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Run Full Audit
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "40px 24px",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid #E2E8F0",
                borderTop: "3px solid #0F172A",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Scanning all platforms…</div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{shop}</div>
          </div>
        )}

        {/* Full audit results */}
        {result && !isLoading && (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "8px 24px 24px",
                marginBottom: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <ScoreCircle score={result.score} />
              <div style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginBottom: 20 }}>
                Theme: <strong style={{ color: "#64748B" }}>{result.themeName}</strong>
                &ensp;·&ensp;
                {new Date(result.ranAt).toLocaleString()}
              </div>
              <StatsRow result={result} />
            </div>

            {result.issues.length === 0 && (
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 12,
                  padding: "24px",
                  textAlign: "center",
                  color: "#166534",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                All checks passed across all platforms.
              </div>
            )}

            {[
              { label: "Critical Issues",  items: criticalIssues },
              { label: "Warnings",         items: warningIssues  },
              { label: "Recommendations",  items: infoIssues     },
            ].filter((g) => g.items.length > 0).map((g) => (
              <div key={g.label} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                  {g.label} ({g.items.length})
                </div>
                {g.items.map((i) => <IssueCard key={i.id} issue={i} />)}
              </div>
            ))}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
