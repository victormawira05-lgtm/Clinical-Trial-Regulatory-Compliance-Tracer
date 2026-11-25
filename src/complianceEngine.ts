import api, { route, storage } from "@forge/api";
import {
  ComplianceGap,
  RequirementNode,
  TraceabilityReport,
  WorkItemNode,
} from "./types";

const TEST_ISSUE_TYPES = new Set(["Test", "Test Execution", "QA Verification"]);
const DONE_STATUSES = new Set(["Done", "Closed", "Released", "Approved"]);

/**
 * Fetch Confluence pages tagged as regulatory/clinical requirements.
 */
async function fetchRequirementPages(
  label = "compliance-req"
): Promise<RequirementNode[]> {
  const cql = encodeURIComponent(`type = "page" AND label = "${label}"`);
  const res = await api
    .asApp()
    .requestConfluence(
      route`/wiki/rest/api/content/search?cql=${cql}&expand=metadata.labels,version`
    );

  if (!res.ok) {
    throw new Error(`Confluence search failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const results: any[] = data.results ?? [];

  return results.map((page) => ({
    pageId: String(page.id),
    title: page.title ?? `Page ${page.id}`,
    url: page._links?.webui ? `${data._links?.base ?? ""}${page._links.webui}` : undefined,
    linkedIssueKeys: [],
  }));
}

/**
 * Fetch Jira issues and extract linked requirement IDs, test evidence, and PR/code keys.
 */
async function fetchJiraWorkItems(
  projectKey: string
): Promise<WorkItemNode[]> {
  const jql = `project = "${projectKey}" ORDER BY updated DESC`;
  const res = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jql,
      maxResults: 100,
      fields: ["summary", "status", "issuetype", "issuelinks", "description"],
    }),
  });

  if (!res.ok) {
    throw new Error(`Jira search failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const issues: any[] = data.issues ?? [];
  const items: WorkItemNode[] = [];

  for (const issue of issues) {
    const key: string = issue.key;
    const summary: string = issue.fields?.summary ?? key;
    const status: string = issue.fields?.status?.name ?? "Unknown";
    const issueType: string = issue.fields?.issuetype?.name ?? "Task";
    const links: any[] = issue.fields?.issuelinks ?? [];

    let hasTestEvidence = TEST_ISSUE_TYPES.has(issueType);
    const linkedRequirementIds: string[] = [];
    const prReferences: string[] = [];

    // Inspect linked Jira issues for test/verification links
    for (const link of links) {
      const inward = link.inwardIssue;
      const outward = link.outwardIssue;
      const neighbor = inward ?? outward;
      if (!neighbor) continue;

      const neighborType = neighbor.fields?.issuetype?.name ?? "";
      if (TEST_ISSUE_TYPES.has(neighborType)) {
        hasTestEvidence = true;
      }
    }

    // Check remote links (Confluence requirement pages or Bitbucket PRs)
    const remoteRes = await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${key}/remotelink`);

    if (remoteRes.ok) {
      const remoteLinks: any[] = await remoteRes.json();
      for (const rLink of remoteLinks) {
        const url: string = rLink.object?.url ?? "";
        const title: string = rLink.object?.title ?? "";

        // Match Confluence page IDs in linked URLs (e.g., /pages/123456/)
        const pageMatch = url.match(/\/pages\/(\d+)/);
        if (pageMatch?.[1]) {
          linkedRequirementIds.push(pageMatch[1]);
        }

        // Match Bitbucket PR / commit references
        if (url.includes("bitbucket") || /PR[-_ ]?#?\d+/i.test(title)) {
          prReferences.push(title || url);
        }
      }
    }

    items.push({
      key,
      summary,
      status,
      issueType,
      hasTestEvidence,
      linkedRequirementIds,
      prReferences,
    });
  }

  return items;
}

/**
 * Traverse requirement -> issue/PR/test relationships and detect compliance gaps.
 */
export async function buildTraceabilityReport(
  projectKey: string,
  requirementLabel = "compliance-req"
): Promise<TraceabilityReport> {
  const requirements = await fetchRequirementPages(requirementLabel);
  const workItems = await fetchJiraWorkItems(projectKey);

  const reqById = new Map<string, RequirementNode>();
  for (const req of requirements) {
    reqById.set(req.pageId, req);
  }

  // Link work items back to requirement nodes
  for (const item of workItems) {
    for (const reqId of item.linkedRequirementIds) {
      const reqNode = reqById.get(reqId);
      if (reqNode && !reqNode.linkedIssueKeys.includes(item.key)) {
        reqNode.linkedIssueKeys.push(item.key);
      }
    }
  }

  const gaps: ComplianceGap[] = [];

  // 1. Orphan Requirements: Confluence requirement with no linked Jira work item
  for (const req of requirements) {
    if (req.linkedIssueKeys.length === 0) {
      gaps.push({
        gapType: "ORPHAN_REQUIREMENT",
        severity: "HIGH",
        entityId: req.pageId,
        entityTitle: req.title,
        details: `Requirement "${req.title}" (Confluence #${req.pageId}) has no linked Jira Epic, Story, or task.`,
      });
    }
  }

  // 2. Orphan Issues/PRs & 3. Untested Changes
  let compliantItems = 0;

  for (const item of workItems) {
    // Skip test execution issues themselves when checking requirement coverage
    if (TEST_ISSUE_TYPES.has(item.issueType)) {
      compliantItems += 1;
      continue;
    }

    const hasRequirementLink = item.linkedRequirementIds.length > 0;
    const isCompletedOrHasCode =
      DONE_STATUSES.has(item.status) || item.prReferences.length > 0;

    let itemHasGap = false;

    if (!hasRequirementLink && isCompletedOrHasCode) {
      itemHasGap = true;
      gaps.push({
        gapType: "ORPHAN_ISSUE_OR_CODE",
        severity: "HIGH",
        entityId: item.key,
        entityTitle: item.summary,
        details: `${item.key} (${item.status}) has code/completion activity but no link to a Confluence requirement.`,
      });
    }

    if (hasRequirementLink && !item.hasTestEvidence) {
      itemHasGap = true;
      gaps.push({
        gapType: "UNTESTED_CHANGE",
        severity: "MEDIUM",
        entityId: item.key,
        entityTitle: item.summary,
        details: `${item.key} traces to requirement(s) [${item.linkedRequirementIds.join(
          ", "
        )}] but lacks linked test or QA verification evidence.`,
      });
    }

    if (!itemHasGap) {
      compliantItems += 1;
    }
  }

  const report: TraceabilityReport = {
    generatedAt: new Date().toISOString(),
    projectKey,
    requirements,
    workItems,
    gaps,
    summary: {
      totalRequirements: requirements.length,
      totalWorkItems: workItems.length,
      compliantItems,
      gapCount: gaps.length,
    },
  };

  // Persist latest report snapshot in Forge Storage for fast UI & audit lookups
  await storage.set(`trace-report:${projectKey}`, report);

  return report;
}
