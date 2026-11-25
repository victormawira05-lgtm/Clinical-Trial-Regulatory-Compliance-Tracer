export type GapType =
  | "ORPHAN_REQUIREMENT"
  | "ORPHAN_ISSUE_OR_CODE"
  | "UNTESTED_CHANGE";

export interface ComplianceGap {
  gapType: GapType;
  severity: "HIGH" | "MEDIUM";
  entityId: string;
  entityTitle: string;
  details: string;
}

export interface RequirementNode {
  pageId: string;
  title: string;
  url?: string;
  linkedIssueKeys: string[];
}

export interface WorkItemNode {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  hasTestEvidence: boolean;
  linkedRequirementIds: string[];
  prReferences: string[];
}

export interface TraceabilityReport {
  generatedAt: string;
  projectKey: string;
  requirements: RequirementNode[];
  workItems: WorkItemNode[];
  gaps: ComplianceGap[];
  summary: {
    totalRequirements: number;
    totalWorkItems: number;
    compliantItems: number;
    gapCount: number;
  };
}
