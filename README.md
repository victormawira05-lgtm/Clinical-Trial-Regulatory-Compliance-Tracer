# Clinical Trial & Regulatory Compliance Tracer

**Continuous FDA 21 CFR Part 11 & IEC 62304 traceability powered by Atlassian Forge, Rovo, and the Teamwork Graph.**

## Inspiration
In clinical trials and Software as a Medical Device (SaMD), regulatory auditors require strict bidirectional proof that every system requirement was implemented, reviewed, and verified before release. Today, quality and engineering teams spend weeks manually cross-checking Confluence specs, Jira tickets, pull requests, and QA runs in brittle spreadsheets.

## What It Does
- **Cross-Product Graph Traversal:** Connects Confluence requirement pages (`compliance-req`), Jira work items, Bitbucket PR/code references, and QA Test issues into a live traceability graph.
- **Automated Gap Detection:**
  - `ORPHAN_REQUIREMENT`: Confluence requirements with zero linked Jira work items.
  - `ORPHAN_ISSUE_OR_CODE`: Completed Jira issues or PRs with no link back to an approved requirement.
  - `UNTESTED_CHANGE`: Requirement-linked changes missing linked test verification evidence.
- **Inline Confluence Trace Badge (`confluence:macro`):** Displays real-time compliance status and linked Jira keys directly inside regulatory requirement pages.
- **Jira Compliance Traceability Matrix (`jira:projectPage`):** Gives QA leads a live project-wide dashboard with one-click gap flagging and **CSV audit export**.
- **Rovo Compliance Trace Auditor (`rovo:agent` + `rovo:action`):** Audits issues on demand, explains regulatory blockers, applies the `compliance-gap` label, posts audit comments, and creates remediation subtasks.

## Architecture
- **Frontend:** Atlassian Forge UI Kit (`@forge/react`) for the Confluence Macro and Jira Project Page.
- **Backend:** Forge Functions (`@forge/api`, `@forge/resolver`) traversing Jira REST/JQL APIs, Jira Remote Links, and Confluence CQL Search.
- **State & Caching:** Forge Storage (`storage`) caching per-project traceability snapshots.
- **AI & Automation:** Event trigger (`avi:jira:updated:issue`) + Rovo Agent (`compliance-auditor-agent`) paired with custom action (`flag-compliance-gap`).

## Setup & Local Testing
1. Install dependencies:
   ```bash
   npm install
