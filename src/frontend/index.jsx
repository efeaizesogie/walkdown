// Functional page for the build phase. The polished design pass comes later.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Stack, Inline, Heading, Text, Button, Lozenge, SectionMessage, Select, Textfield, DynamicTable, Box, Strong,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const SEVERITY = { major: 'removed', minor: 'moved', observation: 'default' };
const CLASS_OPTIONS = [
  { label: 'Any class', value: '' },
  { label: 'Class B and up', value: 'B' },
  { label: 'Class C only', value: 'C' },
];

const App = () => {
  const [project, setProject] = useState('GLU');
  const [size, setSize] = useState('10');
  const [minClass, setMinClass] = useState(CLASS_OPTIONS[0]);
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sample, setSample] = useState({ state: 'idle' });

  const refresh = async () => {
    setRun(await invoke('latest', { projectKey: project }));
    setHistory(await invoke('history', { projectKey: project }));
  };

  useEffect(() => {
    refresh();
    invoke('sampleStatus').then(setSample);
  }, []);

  useEffect(() => {
    if (sample.state !== 'queued' && sample.state !== 'running') return undefined;
    const t = setTimeout(() => invoke('sampleStatus').then(setSample), 3000);
    return () => clearTimeout(t);
  }, [sample]);

  const rehearse = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await invoke('runRehearsal', { projectKey: project, size: Number(size) || 10, minClass: minClass.value });
      if (r.error) setError(r.error);
      else setRun(r);
      setHistory(await invoke('history', { projectKey: project }));
    } catch (e) {
      setError(String(e.message || e));
    }
    setBusy(false);
  };

  const loadSample = async () => {
    await invoke('loadSample');
    setSample({ state: 'queued', lines: ['Queued.'] });
  };

  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Heading as="h1">Walkdown</Heading>
        <Text>A mock auditor for medical-device software. It samples requirements by risk, walks each trace and grades the gaps.</Text>
      </Stack>

      <Box>
        <Inline space="space.200" alignBlock="end">
          <Textfield name="project" label="Project" defaultValue={project} onChange={(e) => setProject(e.target.value.toUpperCase())} />
          <Textfield name="size" label="Samples" defaultValue={size} onChange={(e) => setSize(e.target.value)} />
          <Select name="class" options={CLASS_OPTIONS} value={minClass} onChange={setMinClass} />
          <Button appearance="primary" onClick={rehearse} isDisabled={busy}>{busy ? 'Walking the traces…' : 'Run rehearsal'}</Button>
          <Button onClick={loadSample} isDisabled={sample.state === 'queued' || sample.state === 'running'}>Load GlucoLoop sample</Button>
        </Inline>
      </Box>

      {sample.state !== 'idle' ? (
        <SectionMessage appearance={sample.state === 'failed' ? 'error' : sample.state === 'done' ? 'success' : 'information'} title={`Sample project: ${sample.state}`}>
          {(sample.lines || []).slice(-6).map((l, i) => <Text key={i}>{l}</Text>)}
          {sample.error ? <Text>{sample.error}</Text> : null}
          {sample.hint ? <Text>{sample.hint}</Text> : null}
        </SectionMessage>
      ) : null}

      {error ? <SectionMessage appearance="warning"><Text>{error}</Text></SectionMessage> : null}

      {run && !run.error ? (
        <Stack space="space.200">
          <Inline space="space.300" alignBlock="center">
            <Heading as="h2">Readiness {run.readiness}/100</Heading>
            <Lozenge appearance="removed">{run.counts.major} major</Lozenge>
            <Lozenge appearance="moved">{run.counts.minor} minor</Lozenge>
            <Lozenge>{run.counts.observation} observations</Lozenge>
          </Inline>
          <Text>
            Sampled {run.sampleSize} of {run.population} requirements in {run.projectKey}. Trend:{' '}
            <Strong>{history.slice(0, 8).reverse().map((h) => h.readiness).join(' → ') || '–'}</Strong>
          </Text>
          {(run.notes || []).map((n, i) => <SectionMessage key={i} appearance="information"><Text>{n}</Text></SectionMessage>)}
          <DynamicTable
            head={{ cells: [{ content: 'Requirement' }, { content: 'Severity' }, { content: 'Broken link' }, { content: 'Auditor asks' }, { content: 'Clause' }] }}
            rows={run.findings.map((f) => ({
              key: f.key,
              cells: [
                { content: f.key },
                { content: <Lozenge appearance={SEVERITY[f.severity]}>{f.severity}</Lozenge> },
                { content: f.stepLabel },
                { content: f.question },
                { content: f.clauses[0] },
              ],
            }))}
            emptyView="Every sampled trace is complete."
          />
          <DynamicTable
            head={{ cells: [{ content: 'Sampled' }, { content: 'Why' }, { content: 'Design' }, { content: 'Code' }, { content: 'Test' }, { content: 'Risk' }, { content: 'Release' }] }}
            rows={run.traces.map((t) => ({
              key: t.key,
              cells: [
                { content: t.key },
                { content: (run.sample.find((s) => s.key === t.key) || {}).reason || '' },
                ...t.steps.map((s) => ({ content: s.status === 'ok' ? '✓' : s.status === 'broken' ? '✗' : s.status === 'n/a' ? 'n/a' : '·' })),
              ],
            }))}
          />
        </Stack>
      ) : (
        <Text>No rehearsal yet. Load the sample project, then run a rehearsal.</Text>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<App />);
