import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Stack, Badge, Box } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [data, setData] = useState(null);
  useEffect(() => { invoke('getTraceability').then(setData); }, []);
  if (!data) return <Text>Loading Compliance Badge...</Text>;

  const orphanCount = data.orphans;
  return (
    <Stack space="space.100">
      <Text>Compliance Traceability</Text>
      <Box>
        <Badge text={`Coverage: ${data.coverage}%`} appearance={data.coverage > 80 ? 'added' : 'removed'} />
        <Badge text={`Orphans: ${orphanCount}`} appearance={orphanCount > 0 ? 'removed' : 'added'} />
      </Box>
      {orphanCount > 0 && <Text>⚠️ Audit risk: {orphanCount} orphan requirements</Text>}
    </Stack>
  );
};
ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
