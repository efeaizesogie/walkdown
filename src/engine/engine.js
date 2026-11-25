// Walkdown audit engine. Plain code, no AI: the same input always gives the same findings.
//
// A requirement's trace (IEC 62304 / ISO 14971 style):
//   design -> implementation -> verification -> risk control -> release
// An auditor samples requirements, walks each trace in that order and raises a
// finding at the first broken link.

const STEPS = ['design', 'implementation', 'verification', 'riskControl', 'release'];

const STEP_LABEL = {
  design: 'Design',
  implementation: 'Implementation',
  verification: 'Verification',
  riskControl: 'Risk control',
  release: 'Release',
};

// Clause references a medical-device software auditor would cite.
const CLAUSES = {
  design: ['IEC 62304 §5.3 (architectural design)', 'IEC 62304 §5.4 (detailed design)', 'ISO 13485 §7.3.3'],
  implementation: ['IEC 62304 §5.5 (unit implementation)', 'IEC 62304 §7.1 (traceability)'],
  verification: ['IEC 62304 §5.7 (software system testing)', 'ISO 13485 §7.3.6', '21 CFR 820.30(f)'],
  riskControl: ['ISO 14971 §7.1 (risk control option analysis)', 'ISO 14971 §7.2 (implementation of risk controls)', 'IEC 62304 §7.3'],
  release: ['IEC 62304 §5.8 (software release)', 'ISO 13485 §7.3.8'],
};

const CLASS_WEIGHT = { A: 1, B: 2, C: 3 };

// Small deterministic RNG (mulberry32) so a rehearsal can be replayed exactly.
function rng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How likely an auditor is to pick this requirement.
function samplingWeight(req) {
  let w = CLASS_WEIGHT[req.safetyClass] || 1;
  if (req.safetyRelated) w *= 2;
  if (req.changedSinceLastRelease) w *= 1.5;
  return w;
}

// Weighted sampling without replacement, highest-risk first in ties.
function sample(requirements, size, seed, opts = {}) {
  const minClass = opts.minClass ? CLASS_WEIGHT[opts.minClass] : 0;
  const pool = requirements.filter((r) => (CLASS_WEIGHT[r.safetyClass] || 1) >= minClass);
  const rand = rng(seed);
  // Efraimidis-Spirakis: key = u^(1/w), take the largest keys.
  const keyed = pool.map((r) => ({ r, k: Math.pow(rand(), 1 / samplingWeight(r)) }));
  keyed.sort((x, y) => y.k - x.k || x.r.key.localeCompare(y.r.key));
  return keyed.slice(0, Math.max(0, Math.min(size, keyed.length))).map((x) => ({
    ...x.r,
    weight: samplingWeight(x.r),
    reason: samplingReason(x.r),
  }));
}

function samplingReason(r) {
  const bits = [`Class ${r.safetyClass}`];
  if (r.safetyRelated) bits.push('safety-related');
  if (r.changedSinceLastRelease) bits.push('changed since last release');
  return bits.join(', ');
}

// Checks one step and returns { ok, evidence[], gap }.
function checkStep(step, req) {
  switch (step) {
    case 'design': {
      const ev = req.designs || [];
      return ev.length
        ? { ok: true, evidence: ev.map((d) => ({ label: d.title, url: d.url, source: d.source })) }
        : { ok: false, evidence: [], gap: 'No design record is linked.' };
    }
    case 'implementation': {
      const ev = req.implementations || [];
      return ev.length
        ? { ok: true, evidence: ev.map((c) => ({ label: c.label, url: c.url, source: c.source })) }
        : { ok: false, evidence: [], gap: 'No commit or pull request references this requirement.' };
    }
    case 'verification': {
      const tests = req.tests || [];
      if (!tests.length) return { ok: false, evidence: [], gap: 'No verification test is linked.' };
      const ev = tests.map((t) => ({ label: `${t.key} (${t.result})`, url: t.url, source: t.source }));
      const failed = tests.filter((t) => t.result === 'fail');
      if (failed.length)
        return { ok: false, evidence: ev, gap: `Linked test ${failed.map((t) => t.key).join(', ')} failed.`, kind: 'failed' };
      if (!tests.some((t) => t.result === 'pass'))
        return { ok: false, evidence: ev, gap: 'Linked tests have no recorded passing result.', kind: 'not-run' };
      return { ok: true, evidence: ev };
    }
    case 'riskControl': {
      if (!needsRiskControl(req)) return { ok: true, evidence: [], notApplicable: true };
      const risks = req.risks || [];
      if (!risks.length) return { ok: false, evidence: [], gap: 'Safety-related requirement with no linked risk control.' };
      const ev = risks.map((r) => ({ label: `${r.key}: ${r.hazard}`, url: r.url, source: r.source }));
      const unverified = risks.filter((r) => !r.controlVerified);
      if (unverified.length)
        return {
          ok: false,
          evidence: ev,
          gap: `Risk control for ${unverified.map((r) => r.key).join(', ')} has no verification evidence.`,
          kind: 'unverified',
        };
      return { ok: true, evidence: ev };
    }
    case 'release': {
      const v = req.fixVersions || [];
      return v.length
        ? { ok: true, evidence: v.map((name) => ({ label: name, source: 'jira' })) }
        : { ok: false, evidence: [], gap: 'Not assigned to a release.' };
    }
    default:
      throw new Error(`Unknown step ${step}`);
  }
}

function needsRiskControl(req) {
  return req.safetyRelated || req.safetyClass === 'C';
}

// Walks the trace in order and stops at the first broken link, like an auditor.
function walk(req) {
  const steps = [];
  let brokenAt = null;
  for (const step of STEPS) {
    if (brokenAt) {
      steps.push({ step, label: STEP_LABEL[step], status: 'not-reached' });
      continue;
    }
    const r = checkStep(step, req);
    const status = r.notApplicable ? 'n/a' : r.ok ? 'ok' : 'broken';
    steps.push({ step, label: STEP_LABEL[step], status, evidence: r.evidence, gap: r.gap, kind: r.kind });
    if (status === 'broken') brokenAt = step;
  }
  return { key: req.key, summary: req.summary, brokenAt, steps };
}

// Auditor grading. Major: the gap could let an unsafe or unverified function ship.
function grade(req, trace) {
  if (!trace.brokenAt) return null;
  const step = trace.steps.find((s) => s.step === trace.brokenAt);
  const critical = req.safetyClass === 'C' || req.safetyRelated;
  let severity;
  if (step.step === 'verification' || step.step === 'riskControl') {
    severity = critical ? 'major' : 'minor';
  } else if (step.step === 'design' || step.step === 'implementation') {
    severity = critical ? 'minor' : 'observation';
  } else {
    severity = 'observation';
  }
  return {
    key: req.key,
    summary: req.summary,
    step: step.step,
    stepLabel: step.label,
    severity,
    gap: step.gap,
    clauses: CLAUSES[step.step],
    question: auditorQuestion(req, step),
  };
}

function auditorQuestion(req, step) {
  switch (step.step) {
    case 'design':
      return `Show me where the design for ${req.key} is documented, and how it was reviewed.`;
    case 'implementation':
      return `Which commit or pull request implements ${req.key}? I'd like to see the change and its review.`;
    case 'verification':
      if (step.kind === 'failed') return `${req.key}'s verification test failed. Show me the anomaly record and how it was resolved before release.`;
      if (step.kind === 'not-run') return `Show me the executed verification record for ${req.key}, with the result and who signed it.`;
      return `Show me the verification record for ${req.key}.`;
    case 'riskControl':
      if (step.kind === 'unverified') return `The risk control for ${req.key} is in place, but where is the evidence that it was verified as effective?`;
      return `${req.key} is safety-related. Which hazard does it relate to, and where is the risk control that covers it?`;
    case 'release':
      return `Which release contains ${req.key}, and where are its release notes?`;
    default:
      return `Walk me through the evidence for ${req.key}.`;
  }
}

const PENALTY = { major: 20, minor: 7, observation: 2 };

// 100 = every sampled trace complete. Each finding costs points, scaled by sample size.
function score(findings, sampleSize) {
  if (!sampleSize) return 0;
  const lost = findings.reduce((n, f) => n + PENALTY[f.severity], 0);
  const max = sampleSize * PENALTY.major;
  return Math.max(0, Math.round(100 * (1 - lost / max)));
}

// Full rehearsal: sample, walk, grade, score.
function rehearse(requirements, { size = 10, seed = 'walkdown', minClass } = {}) {
  const picked = sample(requirements, size, seed, { minClass });
  const traces = picked.map(walk);
  const findings = picked.map((r, i) => grade(r, traces[i])).filter(Boolean);
  const order = { major: 0, minor: 1, observation: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.key.localeCompare(b.key));
  return {
    seed,
    sampleSize: picked.length,
    population: requirements.length,
    sample: picked.map((r) => ({ key: r.key, summary: r.summary, safetyClass: r.safetyClass, reason: r.reason })),
    traces,
    findings,
    counts: {
      major: findings.filter((f) => f.severity === 'major').length,
      minor: findings.filter((f) => f.severity === 'minor').length,
      observation: findings.filter((f) => f.severity === 'observation').length,
    },
    readiness: score(findings, picked.length),
  };
}

module.exports = { STEPS, CLAUSES, sample, samplingWeight, walk, grade, score, rehearse, needsRiskControl, rng };
