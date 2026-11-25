const test = require('node:test');
const assert = require('node:assert/strict');
const { toTraceInput } = require('../src/collect/collector');
const { walk, grade } = require('../src/engine/engine');

const issue = (key, labels, links = [], extra = {}) => ({
  key,
  fields: { summary: `${key} summary`, labels, issuelinks: links, fixVersions: [], status: { statusCategory: { key: 'new' } }, ...extra },
});

test('maps labels, links and remote links to engine input', () => {
  const req = issue('GLU-2', ['wd-requirement', 'iec62304-class-c', 'safety-related'], [
    { type: { name: 'Verifies' }, inwardIssue: { key: 'GLU-30' } },
    { type: { name: 'Relates' }, outwardIssue: { key: 'GLU-99' } },
  ], { fixVersions: [{ name: 'GlucoLoop 2.4.0' }] });
  const details = new Map([['GLU-30', issue('GLU-30', ['wd-test', 'result-pass'])]]);
  const input = toTraceInput(req, {
    baseUrl: 'https://x.atlassian.net',
    details,
    remoteLinks: [{ application: { type: 'com.atlassian.confluence', name: 'Confluence' }, object: { title: 'SDD-01', url: 'https://x.atlassian.net/wiki/spaces/GLU/pages/1' } }],
    twg: { pullRequests: [{ label: 'PR #12', url: 'https://bitbucket.org/x/pr/12' }] },
  });
  assert.equal(input.safetyClass, 'C');
  assert.equal(input.safetyRelated, true);
  assert.deepEqual(input.tests.map((t) => [t.key, t.result]), [['GLU-30', 'pass']]);
  assert.equal(input.designs.length, 1);
  assert.equal(input.implementations[0].source, 'teamwork-graph');
  assert.deepEqual(input.fixVersions, ['GlucoLoop 2.4.0']);
  // No risk control linked on a Class C safety requirement -> major.
  const f = grade(input, walk(input));
  assert.equal(f.step, 'riskControl');
  assert.equal(f.severity, 'major');
});

test('test with done status and no result label counts as pass; unverified control is caught', () => {
  const req = issue('GLU-6', ['iec62304-class-c', 'safety-related'], [
    { type: { name: 'Verifies' }, inwardIssue: { key: 'GLU-31' } },
    { type: { name: 'Risk control' }, outwardIssue: { key: 'GLU-40' } },
  ], { fixVersions: [{ name: 'v' }] });
  const details = new Map([
    ['GLU-31', issue('GLU-31', ['wd-test'], [], { status: { statusCategory: { key: 'done' } } })],
    ['GLU-40', issue('GLU-40', ['wd-risk'])],
  ]);
  const input = toTraceInput(req, {
    details,
    remoteLinks: [{ object: { title: 'SDD', url: 'https://x/wiki/p' } }],
    twg: { commits: [{ label: 'abc123' }] },
  });
  assert.equal(input.tests[0].result, 'pass');
  assert.equal(input.risks[0].controlVerified, false);
  assert.equal(grade(input, walk(input)).step, 'riskControl');
});
