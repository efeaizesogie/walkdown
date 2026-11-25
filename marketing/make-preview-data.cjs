// Real engine output for the screenshot preview, keyed the way the loader keys the demo
// site: user needs GLU-1..4, requirements GLU-5..24, tests GLU-25..44, hazards GLU-45..53.
const fs = require('fs');
const path = require('path');
const engine = require('../src/engine/engine');
const G = require('../src/sample/glucoloop');

const reqKey = (i) => `GLU-${5 + i}`;
const testKey = (i) => `GLU-${25 + i}`;
const riskKey = (id) => `GLU-${45 + G.risks.findIndex((h) => h.id === id)}`;

const inputs = G.requirements.map((r, i) => ({
  key: reqKey(i),
  summary: r.summary,
  safetyClass: r.safetyClass,
  safetyRelated: r.safety,
  changedSinceLastRelease: !!r.changed,
  designs: r.design ? [{ title: G.designs.find((d) => d.id === r.design).title, source: 'confluence' }] : [],
  implementations: r.commits.map((m, j) => ({ label: `${(0x9a3f00 + i * 16 + j).toString(16)}c ${reqKey(i)} ${m}`, source: 'teamwork-graph' })),
  tests: [{ key: testKey(i), result: r.test, source: 'jira' }],
  risks: r.risks.map((id) => ({ key: riskKey(id), hazard: G.risks.find((h) => h.id === id).hazard, controlVerified: G.risks.find((h) => h.id === id).controlVerified, source: 'jira' })),
  fixVersions: r.release === false ? [] : [G.RELEASE],
}));

const seed = process.argv[2] || 'GLU-listing';
const picked = engine.sample(inputs, 10, seed);
const result = engine.rehearse(picked, { size: picked.length, seed: 'fixed' });
const reasons = new Map(picked.map((p) => [p.key, p.reason]));
result.sample = result.sample.map((s) => ({ ...s, reason: reasons.get(s.key) }));
const run = { id: seed, projectKey: 'GLU', population: inputs.length, notes: [], ...result };
run.population = inputs.length;

// Readiness values of the rehearsals actually run on the demo site on 25 Nov, oldest first.
const history = [69, 57, 67, run.readiness].reverse().map((readiness) => ({ readiness }));

const traces = {};
for (const input of inputs) {
  const t = engine.walk(input);
  traces[input.key] = { ...t, safetyClass: input.safetyClass, safetyRelated: input.safetyRelated, finding: engine.grade(input, t), notes: [] };
}

const out = path.join(__dirname, 'preview', 'data.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `window.__WALKDOWN_PREVIEW__ = ${JSON.stringify({ run, history, traces })};\n`);
console.log(seed, run.readiness, JSON.stringify(run.counts), run.sample.map((s) => s.key).join(' '));
