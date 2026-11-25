import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Stack, Box, Heading, SectionMessage } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [data, setData] = useState(null);
  useEffect(() => { invoke('getTraceability').then(setData); }, []);
  if (!data) return <Text>Loading Traceability Matrix...</Text>;

  return (
    <Stack space="space.200">
      <Heading size="medium">Compliance Traceability Matrix</Heading>
      <Text>Coverage: {data.coverage}% | Orphans: {data.orphans}</Text>
      {data.requirements.map((r) => (
        <Box key={r.id}>
          <Text>{r.id} — {r.title} [{r.standard}]</Text>
          <Text>Epic: {r.epic || 'NONE'} | Stories: {r.stories} | PRs: {r.prs} | Tests: {r.tests}</Text>
          <Text>{r.status}</Text>
        </Box>
      ))}
      {data.orphans > 0 && (
        <SectionMessage title="Audit Risk" appearance="warning">
          <Text>{data.orphans} requirements have broken chains: Confluence → Jira → PR → Test</Text>
        </SectionMessage>
      )}
    </Stack>
  );
};
ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
