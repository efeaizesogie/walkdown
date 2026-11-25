const test = require('node:test');
const assert = require('node:assert/strict');
const { rehearse, walk, grade, sample, score } = require('../src/engine/engine');
const glucoloop = require('../src/sample/glucoloop');

const reqs = glucoloop.asEngineInput();
const byKey = (k) => reqs.find((r) => r.key === k);

test('a complete trace has no finding', () => {
  const r = byKey('GLU-1');
  const t = walk(r);
  assert.equal(t.brokenAt, null);
  assert.equal(grade(r, t), null);
});

test('hero gap: GLU-2 rounding has no risk control -> major, ISO 14971', () => {
  const r = byKey('GLU-2');
  const t = walk(r);
  assert.equal(t.brokenAt, 'riskControl');
  const f = grade(r, t);
  assert.equal(f.severity, 'major');
  assert.match(f.clauses.join(' '), /ISO 14971/);
  assert.match(f.question, /GLU-2/);
});

test('failed verification on Class C -> major and stops the walk', () => {
  const t = walk(byKey('GLU-4'));
  assert.equal(t.brokenAt, 'verification');
  assert.equal(t.steps.find((s) => s.step === 'riskControl').status, 'not-reached');
  assert.equal(grade(byKey('GLU-4'), t).severity, 'major');
});

test('unverified risk control -> major', () => {
  const f = grade(byKey('GLU-6'), walk(byKey('GLU-6')));
  assert.equal(f.step, 'riskControl');
  assert.equal(f.severity, 'major');
  assert.match(f.question, /verified as effective/);
});

test('missing design on safety-related Class B -> minor', () => {
  const f = grade(byKey('GLU-9'), walk(byKey('GLU-9')));
  assert.equal(f.step, 'design');
  assert.equal(f.severity, 'minor');
});

test('test never run on Class B -> minor', () => {
  const f = grade(byKey('GLU-10'), walk(byKey('GLU-10')));
  assert.equal(f.severity, 'minor');
  assert.match(f.question, /executed verification record/);
});

test('Class A gaps are observations', () => {
  assert.equal(grade(byKey('GLU-12'), walk(byKey('GLU-12'))).severity, 'observation');
  assert.equal(grade(byKey('GLU-13'), walk(byKey('GLU-13'))).severity, 'observation');
});

test('risk control is not required for non-safety Class A/B', () => {
  const t = walk(byKey('GLU-14'));
  assert.equal(t.steps.find((s) => s.step === 'riskControl').status, 'n/a');
});

test('sampling is deterministic for a seed and favours Class C', () => {
  const a = sample(reqs, 8, 'seed-1').map((r) => r.key);
  const b = sample(reqs, 8, 'seed-1').map((r) => r.key);
  assert.deepEqual(a, b);
  // Over many seeds, Class C should be picked far more often than Class A.
  const hits = { A: 0, C: 0 };
  for (let i = 0; i < 300; i++) for (const r of sample(reqs, 5, `s${i}`)) if (hits[r.safetyClass] !== undefined) hits[r.safetyClass]++;
  const perC = hits.C / reqs.filter((r) => r.safetyClass === 'C').length;
  const perA = hits.A / reqs.filter((r) => r.safetyClass === 'A').length;
  assert.ok(perC > perA * 2, `Class C per-item rate ${perC} vs Class A ${perA}`);
});

test('minClass filter keeps only that class or higher', () => {
  const s = sample(reqs, 20, 'x', { minClass: 'C' });
  assert.ok(s.length > 0 && s.every((r) => r.safetyClass === 'C'));
});

test('full population rehearsal finds every planted gap', () => {
  const out = rehearse(reqs, { size: reqs.length, seed: 'all' });
  const keys = out.findings.map((f) => f.key).sort();
  assert.deepEqual(keys, ['GLU-10', 'GLU-12', 'GLU-13', 'GLU-2', 'GLU-4', 'GLU-6', 'GLU-9'].sort());
  assert.deepEqual(out.counts, { major: 3, minor: 2, observation: 2 });
  assert.equal(out.findings[0].severity, 'major');
  assert.ok(out.readiness > 0 && out.readiness < 100);
});

test('readiness rises as gaps are fixed', () => {
  const before = rehearse(reqs, { size: reqs.length, seed: 'all' }).readiness;
  const fixed = reqs.map((r) =>
    r.key === 'GLU-2'
      ? { ...r, risks: [{ key: 'H1', hazard: 'over-delivery', controlVerified: true, source: 'jira' }] }
      : r
  );
  const after = rehearse(fixed, { size: fixed.length, seed: 'all' }).readiness;
  assert.ok(after > before, `${after} should be > ${before}`);
  assert.equal(score([], 10), 100);
});
