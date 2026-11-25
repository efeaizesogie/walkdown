import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import { Track } from './Rail';
import { SEVERITY_LABEL, SRC, shortClause } from './lib';

// Shown on a work item: its own trace, the finding an auditor would raise, and one action.
export default function IssuePanel({ issueKey }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  const [asked, setAsked] = useState('idle');

  useEffect(() => {
    invoke('trace', { issueKey })
      .then((r) => (r && r.steps ? setT(r) : setError((r && r.error) || 'No trace found.')))
      .catch((e) => setError(String(e.message || e)));
  }, [issueKey]);

  if (error) return <div className="panel notice">{error}</div>;
  if (!t) return <div className="panel loading">Walking the trace…</div>;

  const f = t.finding;
  const ask = async () => {
    setAsked('sending');
    const r = await invoke('askOnTicket', { issueKey, question: f.question, severity: f.severity }).catch(() => null);
    setAsked(r && r.posted ? 'sent' : 'failed');
  };

  return (
    <div className="panel">
      <div className="verdict-line">
        {f ? <span className={`tag ${f.severity}`}>{SEVERITY_LABEL[f.severity]}</span> : <span className="tag ok-tag">Trace complete</span>}
        <span className="label">
          Class {t.safetyClass}
          {t.safetyRelated ? ', safety-related' : ''}
        </span>
      </div>
      <div className="stations-head label">
        <span>Design</span>
        <span>Code</span>
        <span>Test</span>
        <span>Risk</span>
        <span>Release</span>
      </div>
      <Track trace={t} play={1} />
      {f ? (
        <>
          <blockquote>“{f.question}”</blockquote>
          <div className="row">
            <span className="mono label">{f.clauses.map(shortClause).join('; ')}</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn subtle" type="button" onClick={ask} disabled={asked === 'sending' || asked === 'sent'}>
              {asked === 'sending' ? 'Posting…' : asked === 'sent' ? 'Asked on this ticket' : 'Ask on this ticket'}
            </button>
            {asked === 'failed' ? <span className="label">Could not post the comment.</span> : null}
          </div>
        </>
      ) : null}
      <ul className="evid">
        {t.steps
          .filter((s) => s.status === 'ok' && s.evidence && s.evidence.length)
          .map((s) => (
            <li key={s.step}>
              {s.label}: {s.evidence.map((e) => e.label).join(', ')} <span className="label">({SRC[s.evidence[0].source] || s.evidence[0].source})</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
