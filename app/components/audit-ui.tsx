import { useState } from "react";
import type { AuditIssue, AuditResult, Severity } from "../lib/audit/index";

const SEV = {
  critical: { accent: "#E53E3E", bg: "#FFF5F5", badge: "#E53E3E", label: "Critical" },
  warning:  { accent: "#D69E2E", bg: "#FFFFF0", badge: "#D69E2E", label: "Warning"  },
  info:     { accent: "#3182CE", bg: "#EBF8FF", badge: "#3182CE", label: "Info"     },
} satisfies Record<Severity, { accent: string; bg: string; badge: string; label: string }>;

function scoreColor(s: number) {
  return s >= 80 ? "#38A169" : s >= 50 ? "#D69E2E" : "#E53E3E";
}

function scoreLabel(s: number) {
  return s >= 80 ? "Healthy" : s >= 50 ? "Issues Found" : "Broken";
}

export function ScoreCircle({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "32px 0 24px" }}>
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: "50%",
          border: `8px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          boxShadow: `0 0 0 4px ${color}22`,
        }}
      >
        <span style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginTop: 2 }}>/100</span>
      </div>
      <div>
        <span
          style={{
            display: "inline-block",
            background: `${color}18`,
            color,
            fontWeight: 700,
            fontSize: 13,
            padding: "4px 14px",
            borderRadius: 20,
            border: `1px solid ${color}44`,
          }}
        >
          {scoreLabel(score)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>Analytics Health Score</div>
    </div>
  );
}

export function StatsRow({ result }: { result: AuditResult }) {
  const critical = result.issues.filter((i) => i.severity === "critical").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const info = result.issues.filter((i) => i.severity === "info").length;

  const stats = [
    { label: "Critical", value: critical, color: "#E53E3E" },
    { label: "Warnings", value: warnings, color: "#D69E2E" },
    { label: "Info",     value: info,     color: "#3182CE" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderTop: `3px solid ${s.color}`,
            borderRadius: 10,
            padding: "14px 16px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function IssueCard({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(false);
  const sev = SEV[issue.severity];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderLeft: `4px solid ${sev.accent}`,
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            background: sev.badge,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {sev.label}
        </span>
        <span
          style={{
            background: "#F1F5F9",
            color: "#475569",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 20,
          }}
        >
          {issue.tool}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 6 }}>
        {issue.title}
      </div>
      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {issue.description}
      </div>

      {open && (
        <div
          style={{
            marginTop: 12,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 13,
            color: "#166534",
            lineHeight: 1.6,
          }}
        >
          <strong>How to fix:</strong> {issue.fix}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          marginTop: 10,
          background: "none",
          border: "none",
          color: sev.accent,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
          letterSpacing: 0.3,
        }}
      >
        {open ? "▲ Hide fix" : "▼ How to fix"}
      </button>
    </div>
  );
}

export function IssueList({ issues }: { issues: AuditIssue[] }) {
  const groups: { label: string; sev: Severity; items: AuditIssue[] }[] = [
    { label: "Critical Issues",   sev: "critical", items: issues.filter((i) => i.severity === "critical") },
    { label: "Warnings",          sev: "warning",  items: issues.filter((i) => i.severity === "warning")  },
    { label: "Recommendations",   sev: "info",     items: issues.filter((i) => i.severity === "info")     },
  ];

  if (issues.length === 0) {
    return (
      <div
        style={{
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: 12,
          padding: "24px 20px",
          textAlign: "center",
          color: "#166534",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        All checks passed — no issues found.
      </div>
    );
  }

  return (
    <>
      {groups.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.sev} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: SEV[g.sev].accent,
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
    </>
  );
}

interface PlatformPageLayoutProps {
  heading: string;
  color: string;
  buttonLabel: string;
  checks: string[];
  shop: string;
  isLoading: boolean;
  result: AuditResult | null;
  onRun: () => void;
}

export function PlatformPageLayout({
  heading, color, buttonLabel, checks, shop, isLoading, result, onRun,
}: PlatformPageLayoutProps) {
  return (
    <s-page heading={heading}>
      <s-button
        slot="primary-action"
        onClick={onRun}
        {...(isLoading ? { loading: true } : {})}
      >
        {isLoading ? "Scanning..." : buttonLabel}
      </s-button>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 0 40px" }}>

        {/* Pre-scan state */}
        {!result && !isLoading && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "28px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Scans <strong style={{ color: "#0F172A" }}>{shop}</strong> for setup issues.
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>
              What we check
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: `${color}18`,
                      border: `1.5px solid ${color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#374151" }}>{c}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onRun}
              style={{
                marginTop: 24,
                background: color,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {buttonLabel}
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
                border: `3px solid ${color}33`,
                borderTop: `3px solid ${color}`,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Scanning theme assets…</div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{shop}</div>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <>
            {/* Score + meta */}
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

            {/* Issues */}
            <IssueList issues={result.issues} />

            {/* Re-run */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                onClick={onRun}
                style={{
                  background: "none",
                  border: `1.5px solid ${color}`,
                  color,
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Run Again
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </s-page>
  );
}
