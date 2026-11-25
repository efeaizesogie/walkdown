// Collects trace evidence for requirements from Jira, Confluence links and Teamwork Graph,
// and maps it to the engine's input shape. Fetching is injected so mapping is testable.

const C = require('./conventions');

const ISSUE_FIELDS = 'summary,status,labels,issuelinks,fixVersions,issuetype';

function hasLabel(issue, l) {
  return (issue.fields.labels || []).includes(l);
}

function safetyClass(issue) {
  const l = (issue.fields.labels || []).find((x) => x.startsWith(C.labels.classPrefix));
  return l ? l.slice(C.labels.classPrefix.length).toUpperCase() : 'A';
}

function testResult(issue) {
  const l = (issue.fields.labels || []).find((x) => x.startsWith(C.labels.resultPrefix));
  if (l) return l.slice(C.labels.resultPrefix.length);
  return issue.fields.status && issue.fields.status.statusCategory && issue.fields.status.statusCategory.key === 'done'
    ? 'pass'
    : 'not-run';
}

// Links of a given type in a given direction, from the requirement's point of view.
function linked(issue, typeName, dir) {
  return (issue.fields.issuelinks || [])
    .filter((l) => l.type && l.type.name === typeName)
    .map((l) => (dir === 'inward' ? l.inwardIssue : l.outwardIssue))
    .filter(Boolean);
}

function isConfluenceLink(rl) {
  const app = rl.application || {};
  const url = (rl.object && rl.object.url) || '';
  return /confluence/i.test(app.type || '') || /confluence/i.test(app.name || '') || /\/wiki\//.test(url);
}

function isCodeLink(rl) {
  const app = (rl.application && (rl.application.name || rl.application.type)) || '';
  const url = (rl.object && rl.object.url) || '';
  return /bitbucket|github|gitlab/i.test(app) || /\/(commits?|pull-requests|pull|merge_requests)\//.test(url);
}

/**
 * Maps one requirement plus its related data to the engine input.
 * @param {object} issue Jira issue (fields: summary, labels, issuelinks, fixVersions)
 * @param {object} ctx  { baseUrl, details: Map<key, issue>, remoteLinks: [], twg: { pullRequests: [], commits: [] } }
 */
function toTraceInput(issue, ctx) {
  const url = (k) => (ctx.baseUrl ? `${ctx.baseUrl}/browse/${k}` : undefined);
  const detail = (stub) => (ctx.details && ctx.details.get(stub.key)) || stub;

  // "Test X verifies requirement": the requirement sees an inward "is verified by" link.
  const tests = linked(issue, C.linkTypes.verifies.name, 'inward').map((stub) => {
    const t = detail(stub);
    return { key: t.key, result: t.fields && t.fields.labels ? testResult(t) : 'not-run', url: url(t.key), source: 'jira' };
  });

  // "Requirement mitigates risk": outward link to a risk item.
  const risks = linked(issue, C.linkTypes.riskControl.name, 'outward').map((stub) => {
    const r = detail(stub);
    return {
      key: r.key,
      hazard: (r.fields && r.fields.summary) || r.key,
      controlVerified: r.fields && r.fields.labels ? hasLabel(r, C.labels.controlVerified) : false,
      url: url(r.key),
      source: 'jira',
    };
  });

  const designs = (ctx.remoteLinks || []).filter(isConfluenceLink).map((rl) => ({
    title: rl.object.title,
    url: rl.object.url,
    source: 'confluence',
  }));

  const twg = ctx.twg || {};
  const implementations = [
    ...(twg.pullRequests || []).map((p) => ({ label: p.label || 'Pull request', url: p.url, source: 'teamwork-graph' })),
    ...(twg.commits || []).map((c) => ({ label: c.label || 'Commit', url: c.url, source: 'teamwork-graph' })),
    ...(ctx.devInfo || []).map((c) => ({ label: c.label, url: c.url, source: 'jira-development' })),
    ...(ctx.remoteLinks || []).filter(isCodeLink).map((rl) => ({ label: rl.object.title, url: rl.object.url, source: 'remote-link' })),
  ];

  return {
    key: issue.key,
    summary: issue.fields.summary,
    safetyClass: safetyClass(issue),
    safetyRelated: hasLabel(issue, C.labels.safety),
    changedSinceLastRelease: hasLabel(issue, C.labels.changed),
    designs,
    implementations,
    tests,
    risks,
    fixVersions: (issue.fields.fixVersions || []).map((v) => v.name),
  };
}

module.exports = { ISSUE_FIELDS, toTraceInput, safetyClass, testResult, isConfluenceLink, isCodeLink };
