import { useState } from "react";
import type { AuditIssue, AuditResult, Severity } from "../lib/audit/index";

export const SEVERITY_COLOR: Record<Severity, string> = {
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

export function scoreColor(score: number) {
  if (score >= 80) return "#008060";
  if (score >= 50) return "#B98900";
  return "#D72C0D";
}

export function IssueCard({ issue }: { issue: AuditIssue }) {
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

export function ScoreCircle({ score }: { score: number }) {
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

export function SummaryStats({ result }: { result: AuditResult }) {
  const critical = result.issues.filter((i) => i.severity === "critical").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const info = result.issues.filter((i) => i.severity === "info").length;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      {[
        { label: "Critical", value: critical, color: "#D72C0D" },
        { label: "Warnings", value: warnings, color: "#B98900" },
        { label: "Info", value: info, color: "#0070F0" },
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

export function IssueList({ issues }: { issues: AuditIssue[] }) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  return (
    <>
      {critical.length > 0 && (
        <s-section heading={`Critical Issues (${critical.length})`}>
          <div>{critical.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
        </s-section>
      )}
      {warnings.length > 0 && (
        <s-section heading={`Warnings (${warnings.length})`}>
          <div>{warnings.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
        </s-section>
      )}
      {info.length > 0 && (
        <s-section heading={`Recommendations (${info.length})`}>
          <div>{info.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
        </s-section>
      )}
      {issues.length === 0 && (
        <s-section heading="All checks passed">
          <s-paragraph>No issues found. This platform appears to be correctly configured.</s-paragraph>
        </s-section>
      )}
    </>
  );
}
