// Live data access for a rehearsal. Samples first on cheap fields, then fetches
// full evidence only for the sampled requirements.

const api = require('@forge/api');
const { route } = api;
const C = require('./conventions');
const { ISSUE_FIELDS, toTraceInput, safetyClass } = require('./collector');

async function json(res) {
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (res.status >= 400) {
    const msg = body && (body.errorMessages || body.message || JSON.stringify(body.errors || body));
    throw new Error(`Jira ${res.status}: ${msg}`);
  }
  return body;
}

async function search(requester, jql, fields = ISSUE_FIELDS, max = 500) {
  const out = [];
  let nextPageToken;
  do {
    const res = await requester.requestJira(route`/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, fields: fields.split(','), maxResults: 100, nextPageToken }),
    });
    const page = await json(res);
    out.push(...(page.issues || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken && out.length < max);
  return out;
}

async function remoteLinks(requester, key) {
  const res = await requester.requestJira(route`/rest/api/3/issue/${key}/remotelink`, {
    headers: { Accept: 'application/json' },
  });
  return (await json(res)) || [];
}

// Teamwork Graph (Preview): runs as the user. Returns [] on any failure so a
// rehearsal still works, and reports the problem in `notes`.
const TWG_PRS = `query walkdown_issuePullRequests($id: ID!) {
  jiraWorkItemLinkedExternalPullRequests(id: $id, first: 25) {
    edges { node { __typename ... on ExternalPullRequest { id displayName url } } }
  }
}`;

async function twgPullRequests(cloudId, issueId, notes) {
  try {
    const res = await api.asUser().requestTeamworkGraph(TWG_PRS, { id: `ari:cloud:jira:${cloudId}:issue/${issueId}` });
    const body = typeof res.json === 'function' ? await res.json() : res;
    if (body.errors && body.errors.length) {
      notes.add(`Teamwork Graph: ${body.errors[0].message}`);
      return [];
    }
    const conn = body.data && body.data.jiraWorkItemLinkedExternalPullRequests;
    return ((conn && conn.edges) || []).map((e) => ({
      label: e.node.displayName || 'Pull request',
      url: e.node.url,
    }));
  } catch (e) {
    notes.add(`Teamwork Graph unavailable: ${String(e.message || e)}`);
    return [];
  }
}

// Commits Walkdown stored as Jira development information (the sample repository).
// Real repositories reach Walkdown through Teamwork Graph or code links instead.
const SAMPLE_REPO = 'glucoloop-sample';
async function devInfoCommits() {
  const byIssue = new Map();
  try {
    const res = await api.asApp().requestJira(route`/rest/devinfo/0.10/repository/${SAMPLE_REPO}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status !== 200) return byIssue;
    const repo = await res.json();
    for (const c of repo.commits || [])
      for (const k of c.issueKeys || []) {
        if (!byIssue.has(k)) byIssue.set(k, []);
        byIssue.get(k).push({ label: `${c.displayId} ${c.message}`, url: c.url });
      }
  } catch (e) {
    console.warn('dev info read failed', String(e && e.message));
  }
  return byIssue;
}

// Persisted Cypher query (registered for this app):
// MATCH (i:JiraWorkItem {ari: $id})-[:jira_work_item_links_external_commit]->(c:ExternalCommit)
// RETURN collect(distinct c) as commits
const COMMITS_QUERY_KEY = '297814b9-30f1-45bd-abed-c613e39f8b60';
const commitsQuery = (fields) => `query walkdown_issueCommits($queryKey: String!, $queryParams: CypherRequestParams) {
  customQuery(queryKey: $queryKey, queryParams: $queryParams, first: 25) {
    edges { node { columns { key value { __typename
      ... on CypherQueryResultListNode { nodes { id data { __typename ${fields} } } }
      ... on CypherQueryResultNode { id data { __typename ${fields} } }
    } } } }
  }
}`;

async function twgCommits(cloudId, issueId, notes) {
  const vars = { queryKey: COMMITS_QUERY_KEY, queryParams: { id: `ari:cloud:jira:${cloudId}:issue/${issueId}` } };
  for (const fields of ['... on ExternalCommit { displayName url }', '']) {
    try {
      const res = await api.asUser().requestTeamworkGraph(commitsQuery(fields), vars);
      const body = typeof res.json === 'function' ? await res.json() : res;
      if (body.errors && body.errors.length) {
        if (fields) continue; // retry without optional fields
        notes.add(`Teamwork Graph commits: ${body.errors[0].message}`);
        return [];
      }
      const out = [];
      for (const edge of (body.data && body.data.customQuery && body.data.customQuery.edges) || [])
        for (const col of edge.node.columns || []) {
          const v = col.value || {};
          for (const n of v.nodes || (v.id ? [v] : [])) {
            const d = n.data || {};
            out.push({ label: d.displayName || `Commit ${String(n.id).split('/').pop().slice(0, 12)}`, url: d.url });
          }
        }
      return out;
    } catch (e) {
      if (fields) continue;
      notes.add(`Teamwork Graph commits unavailable: ${String(e.message || e)}`);
      return [];
    }
  }
  return [];
}

/**
 * Loads requirements for a project. Light: only what sampling needs.
 */
async function loadRequirements(requester, projectKey) {
  const issues = await search(
    requester,
    `project = "${projectKey}" AND labels = "${C.labels.requirement}" ORDER BY key`,
    'summary,labels'
  );
  return issues.map((i) => ({
    key: i.key,
    id: i.id,
    summary: i.fields.summary,
    safetyClass: safetyClass(i),
    safetyRelated: (i.fields.labels || []).includes(C.labels.safety),
    changedSinceLastRelease: (i.fields.labels || []).includes(C.labels.changed),
  }));
}

/**
 * Full evidence for chosen requirement keys, mapped to engine input.
 * opts: { cloudId, baseUrl, useGraph }
 */
async function loadEvidence(requester, keys, opts) {
  const notes = new Set();
  if (!keys.length) return { inputs: [], notes: [] };
  const reqs = await search(requester, `key in (${keys.join(',')})`);
  const relatedKeys = new Set();
  for (const r of reqs)
    for (const l of r.fields.issuelinks || []) {
      const other = l.inwardIssue || l.outwardIssue;
      if (other) relatedKeys.add(other.key);
    }
  const related = relatedKeys.size ? await search(requester, `key in (${[...relatedKeys].join(',')})`, 'summary,labels,status') : [];
  const details = new Map(related.map((i) => [i.key, i]));

  const devInfo = await devInfoCommits();

  const inputs = await Promise.all(
    reqs.map(async (r) => {
      const [rl, prs, commits] = await Promise.all([
        remoteLinks(requester, r.key),
        opts.useGraph ? twgPullRequests(opts.cloudId, r.id, notes) : Promise.resolve([]),
        opts.useGraph ? twgCommits(opts.cloudId, r.id, notes) : Promise.resolve([]),
      ]);
      // Prefer the graph; fall back to development information when the graph has nothing.
      const fromGraph = prs.length + commits.length > 0;
      return toTraceInput(r, {
        baseUrl: opts.baseUrl,
        details,
        remoteLinks: rl,
        twg: { pullRequests: prs, commits },
        devInfo: fromGraph ? [] : devInfo.get(r.key) || [],
      });
    })
  );
  // Keep the caller's order.
  inputs.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  return { inputs, notes: [...notes] };
}

module.exports = { search, loadRequirements, loadEvidence, json };
