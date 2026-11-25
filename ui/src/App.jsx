import React, { useEffect, useMemo, useRef, useState } from 'react';
import { invoke, router } from '@forge/bridge';
import { Rail } from './Rail';
import { SEVERITY_LABEL, cap, shortClause, weightOf, reducedMotion } from './lib';

const CLASSES = [
  { value: '', label: 'Any' },
  { value: 'B', label: 'B and up' },
  { value: 'C', label: 'C only' },
];

const isRun = (r) => r && r.counts && Array.isArray(r.traces);
const openIssue = (key) => router.open(`/browse/${key}`);

function Score({ value, play }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reducedMotion()) return setShown(value);
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play]);
  return (
    <div className="score">
      {shown}
      <small> / 100</small>
    </div>
  );
}

function Trend({ history }) {
  const pts = history.slice(0, 8).reverse().map((h) => h.readiness);
  if (!pts.length) return null;
  const x = (i) => (pts.length === 1 ? 90 : (i * 170) / (pts.length - 1) + 5);
  const y = (v) => 50 - (v / 100) * 44;
  return (
    <svg viewBox="0 0 180 56" role="img" aria-label={`Readiness over the last runs: ${pts.join(', ')}`}>
      <line x1="0" x2="180" y1={y(100)} y2={y(100)} stroke="currentColor" strokeOpacity=".2" strokeDasharray="2 3" />
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 4 : 2.5} fill="currentColor" />
      ))}
    </svg>
  );
}

function Finding({ f, n }) {
  const [state, setState] = useState('idle');
  const ask = async () => {
    setState('sending');
    try {
      const r = await invoke('askOnTicket', { issueKey: f.key, question: f.question, severity: f.severity });
      setState(r && r.posted ? 'sent' : 'failed');
    } catch (e) {
      setState('failed');
    }
  };
  return (
    <article className={`nc ${f.severity}`}>
      <div className="num">NC-{String(n).padStart(2, '0')}</div>
      <div>
        <span className={`tag ${f.severity}`}>{SEVERITY_LABEL[f.severity]}</span>
        <h3>
          <button type="button" className="link" onClick={() => openIssue(f.key)}>
            {f.key}
          </button>{' '}
          {f.stepLabel.toLowerCase()} link broken
        </h3>
        <div className="where">
          {f.summary}. {f.gap}
        </div>
        <blockquote>“{f.question}”</blockquote>
        <div className="clauses">
          {f.clauses.map((c) => (
            <span key={c}>{shortClause(c)}</span>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="btn subtle" type="button" onClick={ask} disabled={state === 'sending' || state === 'sent'}>
          {state === 'sending' ? 'Posting…' : state === 'sent' ? 'Asked on ticket' : 'Ask on ticket'}
        </button>
        {state === 'failed' ? <span className="notice error">Could not post the comment.</span> : null}
        <button className="btn subtle" type="button" onClick={() => openIssue(f.key)}>
          Open {f.key}
        </button>
      </div>
    </article>
  );
}

function SampleStatus({ status }) {
  if (!status || !status.state || status.state === 'idle' || status.state === 'done') return null;
  const lines = (status.lines || []).slice(-4);
  const title = { queued: 'Loading the GlucoLoop sample…', running: 'Loading the GlucoLoop sample…', done: 'GlucoLoop sample is ready.', failed: 'The sample could not be loaded.' }[status.state];
  return (
    <div className={`notice${status.state === 'failed' ? ' error' : ''}`} role="status">
      <strong>{title}</strong>
      {status.state !== 'done' ? (
        <ul>
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          {status.error ? <li>{status.error}</li> : null}
          {status.hint ? <li>{status.hint}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

export default function App() {
  const [project, setProject] = useState('GLU');
  const [size, setSize] = useState(10);
  const [minClass, setMinClass] = useState('');
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sample, setSample] = useState(null);
  const [play, setPlay] = useState(0);
  const projectRef = useRef(project);
  projectRef.current = project;

  const loadHistory = async (p) => {
    const h = await invoke('history', { projectKey: p });
    setHistory(Array.isArray(h) ? h : []);
  };

  useEffect(() => {
    (async () => {
      try {
        const latest = await invoke('latest', { projectKey: project });
        if (isRun(latest)) setRun(latest);
        await loadHistory(project);
        const s = await invoke('sampleStatus');
        setSample(s && s.state ? s : null);
      } catch (e) {
        setError(String(e.message || e));
      }
      setLoading(false);
    })();
  }, []);

  // Poll while the sample loader runs.
  useEffect(() => {
    if (!sample || (sample.state !== 'queued' && sample.state !== 'running')) return undefined;
    const t = setTimeout(async () => {
      const s = await invoke('sampleStatus');
      setSample(s && s.state ? s : null);
    }, 2500);
    return () => clearTimeout(t);
  }, [sample]);

  const rehearse = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await invoke('runRehearsal', { projectKey: project.trim().toUpperCase(), size: Number(size) || 10, minClass });
      if (r && r.error) setError(r.error);
      else if (isRun(r)) {
        setRun(r);
        setPlay((p) => p + 1);
      }
      await loadHistory(project.trim().toUpperCase());
    } catch (err) {
      setError(String(err.message || err));
    }
    setBusy(false);
  };

  const loadSample = async () => {
    setError('');
    await invoke('loadSample');
    setSample({ state: 'queued', lines: ['Queued.'] });
  };

  const sampleRows = useMemo(() => {
    if (!isRun(run)) return [];
    const max = Math.max(1, ...run.sample.map(weightOf));
    return run.sample.map((s) => ({ ...s, w: weightOf(s) / max, finding: run.findings.find((f) => f.key === s.key) }));
  }, [run]);

  const loaderBusy = sample && (sample.state === 'queued' || sample.state === 'running');

  return (
    <div className="page">
      <header>
        <div>
          <h1 className="visually-hidden">Walkdown</h1>
          <p>Rehearse an IEC 62304 and ISO 14971 audit. Walkdown samples requirements the way an auditor would and stops at the first broken link.</p>
        </div>
        <form className="brief" onSubmit={rehearse}>
          <label className="field">
            <span className="label">Project</span>
            <input className="mono" value={project} onChange={(e) => setProject(e.target.value.toUpperCase())} aria-label="Project key" maxLength={12} />
          </label>
          <label className="field">
            <span className="label">Samples</span>
            <input type="number" min="1" max="50" value={size} onChange={(e) => setSize(e.target.value)} aria-label="Number of samples" style={{ width: 44 }} />
          </label>
          <label className="field">
            <span className="label">Class</span>
            <select value={minClass} onChange={(e) => setMinClass(e.target.value)} aria-label="Minimum safety class">
              {CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Walking the traces…' : 'Run rehearsal'}
          </button>
        </form>
      </header>

      <SampleStatus status={sample} />
      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <div className="loading">Loading the last rehearsal…</div> : null}

      {!loading && !isRun(run) ? (
        <section className="empty">
          <h2>No rehearsal yet</h2>
          <p>
            Walkdown reads requirements labelled <span className="mono">wd-requirement</span> with their links, tests, risks and design pages. To try it on a
            realistic project first, load the GlucoLoop sample: a fictional insulin-dosing app with a few traces broken on purpose.
          </p>
          <button className="btn subtle" type="button" onClick={loadSample} disabled={loaderBusy}>
            {loaderBusy ? 'Loading the sample…' : 'Load the GlucoLoop sample'}
          </button>
        </section>
      ) : null}

      {isRun(run) ? (
        <>
          <section className="verdict" aria-label="Verdict">
            <div>
              <div className="label">Readiness</div>
              <Score value={run.readiness} play={play} />
            </div>
            <div>
              <div className="counts">
                <div className="count major">
                  <span className="label">Major</span>
                  <b>{run.counts.major}</b>
                </div>
                <div className="count">
                  <span className="label">Minor</span>
                  <b>{run.counts.minor}</b>
                </div>
                <div className="count">
                  <span className="label">Observations</span>
                  <b>{run.counts.observation}</b>
                </div>
              </div>
              <div className="meta">
                Sampled {run.sampleSize} of {run.population} requirements in {run.projectKey}. {run.traces.filter((t) => !t.brokenAt).length} traces
                complete.
              </div>
            </div>
            <div className="trend">
              <div className="label">Last runs</div>
              <Trend history={history} />
            </div>
          </section>

          {(run.notes || []).length ? (
            <div className="notice">
              {run.notes.map((n, i) => (
                <div key={i}>{n}</div>
              ))}
            </div>
          ) : null}

          <section className="section" aria-labelledby="walk-h">
            <div className="section-head">
              <h2 id="walk-h">The walk</h2>
              <p>Each sampled requirement, traced from design to release. The marker stops at the first broken link.</p>
            </div>
            <div className="walk">
              <div className="rail-head">
                <span className="label">Requirement</span>
                <div className="stations-head label">
                  <span>Design</span>
                  <span>Code</span>
                  <span>Test</span>
                  <span>Risk control</span>
                  <span>Release</span>
                </div>
              </div>
              {run.traces.map((t, i) => (
                <Rail key={`${run.id}-${t.key}`} trace={t} play={play} delay={i * 70} onOpen={openIssue} />
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="log-h">
            <div className="section-head">
              <h2 id="log-h">Auditor's log</h2>
              <p>Graded as an auditor would. Major findings first.</p>
            </div>
            <div className="log">
              {run.findings.length ? run.findings.map((f, i) => <Finding key={f.key} f={f} n={i + 1} />) : <p>Every sampled trace is complete.</p>}
            </div>
          </section>

          <section className="section" aria-labelledby="ledger-h">
            <div className="section-head">
              <h2 id="ledger-h">Sampling ledger</h2>
              <p>Why each requirement was picked. Higher safety class and recent change raise the odds.</p>
            </div>
            <table className="ledger">
              <thead>
                <tr>
                  <th className="label">Requirement</th>
                  <th className="label">Reasons</th>
                  <th className="label w">Weight</th>
                  <th className="label">Result</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((s) => (
                  <tr key={s.key}>
                    <td>
                      <button type="button" className="link" onClick={() => openIssue(s.key)}>
                        {s.key}
                      </button>
                    </td>
                    <td className="chips">
                      {(s.reason || '').split(', ').map((r) => (
                        <span key={r}>{cap(r)}</span>
                      ))}
                    </td>
                    <td className="w">
                      <div className="weight">
                        <i style={{ width: `${s.w * 100}%` }} />
                      </div>
                    </td>
                    <td>{s.finding ? <span className={`tag ${s.finding.severity}`}>{cap(s.finding.severity)}</span> : <span className="label ok-text">Complete</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="section">
            <button className="btn subtle" type="button" onClick={loadSample} disabled={loaderBusy}>
              {loaderBusy ? 'Loading the sample…' : 'Load the GlucoLoop sample'}
            </button>
          </div>
        </>
      ) : null}

      <footer>Rehearsal, not a formal audit opinion. Grading is rule-based: the same data always gives the same result.</footer>
    </div>
  );
}
