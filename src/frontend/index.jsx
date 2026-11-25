import React, { useState } from 'react';
import ForgeReconciler, { Stack, Heading, Text, Textfield, Button, Code } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [key, setKey] = useState('');
  const [out, setOut] = useState('');
  const run = async (fn) => {
    setOut('Working…');
    try {
      setOut(JSON.stringify(await invoke(fn, { issueKey: key.trim().toUpperCase() }), null, 2));
    } catch (e) {
      setOut(String(e));
    }
  };
  return (
    <Stack space="space.200">
      <Heading as="h1">Walkdown spike</Heading>
      <Text>Enter a work item key, then trace it through Jira or Teamwork Graph.</Text>
      <Textfield name="key" placeholder="GLU-1" onChange={(e) => setKey(e.target.value)} />
      <Button onClick={() => run('trace')}>Trace via Jira</Button>
      <Button onClick={() => run('twgProbe')}>Probe Teamwork Graph</Button>
      {out ? <Code>{out}</Code> : null}
    </Stack>
  );
};

ForgeReconciler.render(<App />);
