import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";
import { buildTraceabilityReport } from "./complianceEngine";
import { TraceabilityReport } from "./types";

const resolver = new Resolver();

/**
 * Returns cached or freshly computed compliance traceability report.
 */
resolver.define("getTraceabilityReport", async (req) => {
  const projectKey: string = req.payload?.projectKey ?? "CLIN";
  const requirementLabel: string = req.payload?.requirementLabel ?? "compliance-req";
  const forceRefresh: boolean = Boolean(req.payload?.forceRefresh);

  if (!forceRefresh) {
    const cached = await storage.get<TraceabilityReport>(`trace-report:${projectKey}`);
    if (cached) {
      return cached;
    }
  }

  return buildTraceabilityReport(projectKey, requirementLabel);
});

/**
 * Returns compliance status for a single Confluence requirement page ID.
 */
resolver.define("getRequirementStatus", async (req) => {
  const pageId = String(req.payload?.pageId ?? "");
  const projectKey: string = req.payload?.projectKey ?? "CLIN";

  const report =
    (await storage.get<TraceabilityReport>(`trace-report:${projectKey}`)) ??
    (await buildTraceabilityReport(projectKey));

  const requirement = report.requirements.find((r) => r.pageId === pageId);
  const reqGaps = report.gaps.filter((g) => g.entityId === pageId);

  return {
    pageId,
    found: Boolean(requirement),
    title: requirement?.title ?? `Page ${pageId}`,
    linkedIssueKeys: requirement?.linkedIssueKeys ?? [],
    isCompliant: Boolean(requirement) && reqGaps.length === 0,
    gaps: reqGaps,
  };
});

export const runResolver = resolver.getDefinitions();

/**
 * Scheduled/event trigger handler: refreshes report and adds a compliance warning
 * comment if an issue is marked Done without test evidence.
 */
export async function runScan(event: any) {
  const issueKey: string | undefined = event?.issue?.key;
  const projectKey: string =
    event?.issue?.fields?.project?.key ?? process.env.DEFAULT_PROJECT_KEY ?? "CLIN";

  const report = await buildTraceabilityReport(projectKey);

  if (issueKey) {
    const issueGaps = report.gaps.filter((g) => g.entityId === issueKey);
    if (issueGaps.length > 0) {
      const summaryLines = issueGaps.map((g) => `- **${g.gapType}**: ${g.details}`).join("\n");
      await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `Compliance Traceability Alert (${issueGaps.length} gap detected):`,
                  },
                ],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: summaryLines }],
              },
            ],
          },
        }),
      });
    }
  }

  return { ok: true, gapCount: report.summary.gapCount };
}
