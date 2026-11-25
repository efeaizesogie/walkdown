// Functional page for the build phase. The polished design pass comes later.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Stack, Inline, Heading, Text, Button, Lozenge, SectionMessage, Select, Textfield, DynamicTable, Strong, Label,
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
    const latest = await invoke('latest', { projectKey: project });
    setRun(latest && latest.counts ? latest : null);
    const h = await invoke('history', { projectKey: project });
    setHistory(Array.isArray(h) ? h : []);
  };

  useEffect(() => {
    refresh();
    invoke('sampleStatus').then((s) => setSample(s && s.state ? s : { state: 'idle' }));
  }, []);

  useEffect(() => {
    if (sample.state !== 'queued' && sample.state !== 'running') return undefined;
    const t = setTimeout(() => invoke('sampleStatus').then((s) => setSample(s && s.state ? s : { state: 'idle' })), 3000);
    return () => clearTimeout(t);
  }, [sample]);

  const rehearse = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await invoke('runRehearsal', { projectKey: project, size: Number(size) || 10, minClass: minClass.value });
      if (r && r.error) setError(r.error);
      else if (r && r.counts) setRun(r);
      const h = await invoke('history', { projectKey: project });
      setHistory(Array.isArray(h) ? h : []);
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

      <Stack space="space.100">
        <Inline space="space.200" alignBlock="end">
          <Stack space="space.050">
            <Label labelFor="project">Project</Label>
            <Textfield id="project" name="project" defaultValue={project} onChange={(e) => setProject(e.target.value.toUpperCase())} />
          </Stack>
          <Stack space="space.050">
            <Label labelFor="size">Samples</Label>
            <Textfield id="size" name="size" defaultValue={size} onChange={(e) => setSize(e.target.value)} />
          </Stack>
          <Stack space="space.050">
            <Label labelFor="cls">Safety class</Label>
            <Select inputId="cls" name="cls" options={CLASS_OPTIONS} value={minClass} onChange={setMinClass} />
          </Stack>
          <Button appearance="primary" onClick={rehearse} isDisabled={busy}>{busy ? 'Walking the traces…' : 'Run rehearsal'}</Button>
          <Button onClick={loadSample} isDisabled={sample.state === 'queued' || sample.state === 'running'}>Load GlucoLoop sample</Button>
        </Inline>
      </Stack>

      {sample.state !== 'idle' ? (
        <SectionMessage appearance={sample.state === 'failed' ? 'error' : sample.state === 'done' ? 'success' : 'information'} title={`Sample project: ${sample.state}`}>
          {(sample.lines || []).slice(-6).map((l, i) => <Text key={i}>{l}</Text>)}
          {sample.error ? <Text>{sample.error}</Text> : null}
          {sample.hint ? <Text>{sample.hint}</Text> : null}
        </SectionMessage>
      ) : null}

      {error ? <SectionMessage appearance="warning"><Text>{error}</Text></SectionMessage> : null}

      {run && run.counts ? (
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

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <SectionMessage appearance="error" title="Walkdown hit an error">
          <Text>{String(this.state.error && (this.state.error.stack || this.state.error.message || this.state.error)).slice(0, 600)}</Text>
        </SectionMessage>
      );
    return this.props.children;
  }
}

ForgeReconciler.render(
  <Boundary>
    <App />
  </Boundary>
);
