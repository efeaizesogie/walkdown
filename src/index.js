// Walkdown spike: one handler per module, to prove each platform feature works.
const api = require('@forge/api');
const { route } = api;
const Resolver = require('@forge/resolver').default;

const adfText = (text) => ({
  type: 'doc',
  version: 1,
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

async function jiraJson(asWho, r, init) {
  const res = await asWho.requestJira(r, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...init,
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body };
}

// Reads the trace evidence Jira itself holds for one requirement.
async function readTrace(issueKey) {
  const app = api.asApp();
  const issue = await jiraJson(
    app,
    route`/rest/api/3/issue/${issueKey}?fields=summary,issuetype,issuelinks,fixVersions,labels,status`
  );
  if (issue.status !== 200) return { issueKey, error: `Jira returned ${issue.status}` };
  const remote = await jiraJson(app, route`/rest/api/3/issue/${issueKey}/remotelink`);
  const f = issue.body.fields;
  return {
    issueKey,
    summary: f.summary,
    type: f.issuetype && f.issuetype.name,
    status: f.status && f.status.name,
    links: (f.issuelinks || []).map((l) => ({
      type: l.type.name,
      direction: l.outwardIssue ? l.type.outward : l.type.inward,
      key: (l.outwardIssue || l.inwardIssue).key,
    })),
    remoteLinks: (remote.body || []).map((r) => ({
      title: r.object && r.object.title,
      url: r.object && r.object.url,
      app: r.application && r.application.name,
    })),
    fixVersions: (f.fixVersions || []).map((v) => v.name),
    source: 'jira-rest',
  };
}

exports.traceRequirement = async (payload, context) => {
  const issueKey = String(payload.issueKey || '').trim().toUpperCase();
  console.log('trace-requirement', issueKey, context && context.principal);
  return readTrace(issueKey);
};

exports.postAuditorQuestion = async (payload) => {
  const issueKey = String(payload.issueKey || '').trim().toUpperCase();
  const res = await jiraJson(api.asApp(), route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body: adfText(`Walkdown auditor: ${payload.question}`) }),
  });
  console.log('post-auditor-question', issueKey, res.status);
  return { posted: res.status === 201, status: res.status };
};

exports.validateTrace = async (event) => {
  const key = event.issue && event.issue.key;
  console.log('validator', key, JSON.stringify(event.transition || {}));
  const t = await readTrace(key);
  const verified = (t.links || []).some((l) => /test|verif/i.test(l.direction + ' ' + l.type));
  return verified
    ? { result: true }
    : { result: false, errorMessage: `Walkdown: ${key} has no linked verification test, so it can't be released.` };
};

exports.onIssueCreated = async (event) => {
  const issue = event.issue || {};
  const summary = (issue.fields && issue.fields.summary) || '';
  console.log('trigger created', issue.key, summary);
  if (!/^audit rehearsal/i.test(summary)) return;
  await jiraJson(api.asApp(), route`/rest/api/3/issue/${issue.key}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body: adfText('Walkdown auditor: rehearsal received. Sampling requirements now.') }),
  });
};

const resolver = new Resolver();
resolver.define('trace', ({ payload }) => readTrace(payload.issueKey));
// Teamwork Graph (Preview): curated queries, run as the current user.
const TWG_PRS = `query walkdown_issuePullRequests($id: ID!) {
  jiraWorkItemLinkedExternalPullRequests(id: $id, first: 25) {
    edges { node { __typename ... on ExternalPullRequest { id } } }
  }
}`;
const TWG_DEPLOYS = `query walkdown_issueDeployments($id: ID!) {
  jiraWorkItemLinkedExternalDeployments(id: $id, first: 25) {
    edges { node { __typename ... on ExternalDeployment { id } } }
  }
}`;

async function twg(query, variables) {
  const res = await api.asUser().requestTeamworkGraph(query, variables);
  const json = typeof res.json === 'function' ? await res.json() : res;
  return json;
}

resolver.define('twgProbe', async ({ payload, context }) => {
  const key = String(payload.issueKey || '').trim().toUpperCase();
  const issue = await jiraJson(api.asUser(), route`/rest/api/3/issue/${key}?fields=summary`);
  if (issue.status !== 200) return { error: `Jira returned ${issue.status}` };
  const ari = `ari:cloud:jira:${context.cloudId}:issue/${issue.body.id}`;
  const out = { ari };
  for (const [name, q] of [['pullRequests', TWG_PRS], ['deployments', TWG_DEPLOYS]]) {
    try {
      out[name] = await twg(q, { id: ari });
    } catch (e) {
      out[name] = { thrown: String(e) };
    }
  }
  return out;
});
exports.resolver = resolver.getDefinitions();
