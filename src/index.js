import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getTraceability', async ({ payload }) => {
  // MVP: return mock data so deploy passes, we wire real Jira/Confluence next
  return {
    requirements: [
      {
        id: 'REQ-001',
        title: 'Patient data must be encrypted at rest',
        standard: 'FDA 21 CFR Part 11',
        epic: 'EPIC-101',
        stories: 3,
        prs: 2,
        tests: 2,
        status: 'COMPLETE',
        orphan: false
      },
      {
        id: 'REQ-002',
        title: 'Audit trail for consent changes',
        standard: 'ISO 13485',
        epic: 'EPIC-102',
        stories: 1,
        prs: 0,
        tests: 0,
        status: 'ORPHAN - No PR / No Test',
        orphan: true
      },
      {
        id: 'REQ-003',
        title: 'Clinical trial data retention 15 years',
        standard: 'SOC 2',
        epic: null,
        stories: 0,
        prs: 0,
        tests: 0,
        status: 'ORPHAN - No Epic',
        orphan: true
      }
    ],
    coverage: 33,
    orphans: 2
  };
});

resolver.define('getOrphans', async () => {
  return [
    { type: 'PR without Jira', id: 'PR-452', link: 'bitbucket.org/.../pull-requests/452' },
    { type: 'Story without Test', id: 'STORY-88', link: 'jira/.../STORY-88' }
  ];
});

export const handler = resolver.getDefinitions();
