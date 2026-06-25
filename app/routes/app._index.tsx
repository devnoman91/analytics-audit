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
  { name: "GA4",          short: "Google Analytics 4",  href: "/app/ga4",        color: "#E8710A", checks: 6 },
  { name: "Meta Pixel",   short: "Facebook / Instagram", href: "/app/meta",       color: "#1877F2", checks: 6 },
  { name: "TikTok Pixel", short: "TikTok Ads",          href: "/app/tiktok",     color: "#2D2D2D", checks: 6 },
  { name: "Snapchat",     short: "Snapchat Ads",        href: "/app/snapchat",   color: "#FFCD00", checks: 6 },
  { name: "Pinterest",    short: "Pinterest Ads",       href: "/app/pinterest",  color: "#E60023", checks: 6 },
  { name: "Google Ads",   short: "Conversion Tracking", href: "/app/google-ads", color: "#4285F4", checks: 4 },
  { name: "Klaviyo",      short: "Email & SMS Flows",   href: "/app/klaviyo",    color: "#006DFF", checks: 4 },
];

function PlatformInitial({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}18`,
        border: `1.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 800,
        color,
        flexShrink: 0,
      }}
    >
      {name[0]}
    </div>
  );
}

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
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "4px 0 56px" }}>

        {/* ── Hero CTA ─────────────────────────────────────────── */}
        {!result && !isLoading && (
          <div
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
              borderRadius: 16,
              padding: "36px 32px",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Check your entire tracking setup
              </div>
              <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, maxWidth: 380 }}>
                Scan GA4, Meta, TikTok, Snapchat, Pinterest, Google Ads &amp; Klaviyo
                on <strong style={{ color: "#CBD5E1" }}>{shop}</strong> — all at once.
              </div>
            </div>
            <button
              onClick={() => fetcher.submit({}, { method: "POST" })}
              style={{
                background: "#fff",
                color: "#0F172A",
                border: "none",
                borderRadius: 10,
                padding: "13px 28px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              }}
            >
              Run Full Audit
            </button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
              borderRadius: 16,
              padding: "44px 32px",
              marginBottom: 28,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid rgba(255,255,255,0.2)",
                borderTop: "3px solid #fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Scanning all platforms…</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>{shop}</div>
          </div>
        )}

        {/* ── Results summary ──────────────────────────────────── */}
        {result && !isLoading && (
          <div
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
              borderRadius: 16,
              padding: "28px 32px",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            {/* Score */}
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  border: `6px solid ${result.score >= 80 ? "#34D399" : result.score >= 50 ? "#FBBF24" : "#F87171"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                  margin: "0 auto 8px",
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{result.score}</span>
                <span style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>/100</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6 }}>
                Health Score
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, flex: 1, flexWrap: "wrap" }}>
              {[
                { label: "Critical", count: criticalIssues.length, color: "#F87171" },
                { label: "Warnings", count: warningIssues.length,  color: "#FBBF24" },
                { label: "Info",     count: infoIssues.length,     color: "#60A5FA" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Meta + re-run */}
            <div style={{ textAlign: "right", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                {result.themeName}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>
                {new Date(result.ranAt).toLocaleString()}
              </div>
              <button
                onClick={() => fetcher.submit({}, { method: "POST" })}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Run Again
              </button>
            </div>
          </div>
        )}

        {/* ── Platform list ────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Audit by Platform</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>7 platforms</div>
          </div>

          {PLATFORMS.map((p, i) => (
            <a
              key={p.name}
              href={p.href}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 20px",
                  borderBottom: i < PLATFORMS.length - 1 ? "1px solid #F8FAFC" : "none",
                  transition: "background 0.12s",
                  borderLeft: `3px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F8FAFC";
                  e.currentTarget.style.borderLeftColor = p.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }}
              >
                <PlatformInitial name={p.name} color={p.color} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{p.short}</div>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.checks} checks
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: p.color,
                    fontWeight: 700,
                    marginLeft: 8,
                  }}
                >
                  →
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* ── Full audit issues ────────────────────────────────── */}
        {result && !isLoading && result.issues.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>
              All Issues
            </div>
            {[
              { label: "Critical Issues",  items: criticalIssues, color: "#E53E3E" },
              { label: "Warnings",         items: warningIssues,  color: "#D69E2E" },
              { label: "Recommendations",  items: infoIssues,     color: "#3182CE" },
            ].filter((g) => g.items.length > 0).map((g) => (
              <div key={g.label} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: g.color,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  {g.label} ({g.items.length})
                </div>
                {g.items.map((i) => <IssueCard key={i.id} issue={i} />)}
              </div>
            ))}
          </div>
        )}

        {result && result.issues.length === 0 && (
          <div
            style={{
              marginTop: 24,
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
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
