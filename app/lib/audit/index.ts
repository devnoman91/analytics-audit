import { scanThemeAssets } from "./theme-scanner";
import { auditGA4 } from "./ga4";
import { auditMetaPixel } from "./meta-pixel";
import { auditWebPixels } from "./web-pixels";

export type Severity = "critical" | "warning" | "info";

export interface AuditIssue {
  id: string;
  tool: string;
  severity: Severity;
  title: string;
  description: string;
  fix: string;
}

export interface AuditResult {
  shop: string;
  themeName: string;
  score: number;
  issues: AuditIssue[];
  webPixelCount: number;
  scriptTagCount: number;
  ranAt: string;
}

function calculateScore(issues: AuditIssue[]): number {
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === "critical") penalty += 25;
    else if (issue.severity === "warning") penalty += 10;
    else penalty += 3;
  }
  return Math.max(0, 100 - penalty);
}

export async function runAudit(admin: any, shop: string): Promise<AuditResult> {
  const [themeResult, webPixelsResult] = await Promise.all([
    scanThemeAssets(admin),
    auditWebPixels(admin),
  ]);

  const ga4Issues = auditGA4(themeResult.assets);
  const metaIssues = auditMetaPixel(themeResult.assets);
  const allIssues = [...ga4Issues, ...metaIssues, ...webPixelsResult.issues];

  return {
    shop,
    themeName: themeResult.themeName,
    score: calculateScore(allIssues),
    issues: allIssues,
    webPixelCount: webPixelsResult.webPixels.length,
    scriptTagCount: webPixelsResult.scriptTags.length,
    ranAt: new Date().toISOString(),
  };
}
