import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Stack, Box, SectionMessage } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    invoke('getTraceability', {}).then(setData);
  }, []);

  if (!data) return <Text>Loading Compliance Traceability...</Text>;

  return (
    <Stack space="space.200">
      <Text>Compliance Coverage: {data.coverage}%</Text>
      <Text>Orphans Found: {data.orphans}</Text>
      {data.requirements.map((r) => (
        <Box key={r.id}>
          <Text>{r.id} - {r.title} [{r.standard}]</Text>
          <Text>{r.status}</Text>
        </Box>
      ))}
      {data.orphans > 0 && (
        <SectionMessage title="Audit Risk" appearance="warning">
          <Text>{data.orphans} requirements have broken traceability chains.</Text>
        </SectionMessage>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
