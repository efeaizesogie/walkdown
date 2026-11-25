// Builds the GlucoLoop sample project on the current site: Jira project, link types,
// release, user needs, requirements, tests, risk file, links, Confluence design pages
// and sample development information. Runs in a queue consumer (up to 15 minutes).

const api = require('@forge/api');
const { route } = api;
const C = require('../collect/conventions');
const G = require('./glucoloop');

const PROJECT_KEY = 'GLU';
const PROJECT_NAME = 'GlucoLoop';
const SPACE_KEY = 'GLUCO';

const H = { Accept: 'application/json', 'Content-Type': 'application/json' };
const app = () => api.asApp();

async function call(fn, r, init = {}) {
  const res = await fn(r, { headers: H, ...init });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = text;
  }
  return { status: res.status, body };
}
const jira = (r, init) => call((x, i) => app().requestJira(x, i), r, init);
const conf = (r, init) => call((x, i) => app().requestConfluence(x, i), r, init);

function fail(step, res) {
  const detail = res.body && (res.body.errorMessages || res.body.errors || res.body.message || res.body);
  const e = new Error(`${step} failed (${res.status}): ${JSON.stringify(detail).slice(0, 300)}`);
  e.status = res.status;
  return e;
}

const adf = (...paras) => ({
  type: 'doc',
  version: 1,
  content: paras.map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })),
});

async function ensureProject(leadAccountId, log) {
  const existing = await jira(route`/rest/api/3/project/${PROJECT_KEY}`);
  if (existing.status === 200) {
    log(`Using existing project ${PROJECT_KEY}.`);
    return existing.body;
  }
  const created = await jira(route`/rest/api/3/project`, {
    method: 'POST',
    body: JSON.stringify({
      key: PROJECT_KEY,
      name: PROJECT_NAME,
      projectTypeKey: 'software',
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-kanban-template',
      leadAccountId,
      assigneeType: 'UNASSIGNED',
      description: 'Walkdown sample: a fictional insulin-dosing companion app (IEC 62304 Class C).',
    }),
  });
  if (created.status !== 201) {
    const e = fail('Creating the GlucoLoop project', created);
    e.hint = `Create a company-managed software project with key ${PROJECT_KEY} yourself, then load again.`;
    throw e;
  }
  log(`Created project ${PROJECT_KEY}.`);
  const p = await jira(route`/rest/api/3/project/${PROJECT_KEY}`);
  return p.body;
}

async function ensureLinkTypes(log) {
  const res = await jira(route`/rest/api/3/issueLinkType`);
  const have = new Set(((res.body && res.body.issueLinkTypes) || []).map((t) => t.name));
  for (const t of Object.values(C.linkTypes)) {
    if (have.has(t.name)) continue;
    const r = await jira(route`/rest/api/3/issueLinkType`, {
      method: 'POST',
      body: JSON.stringify({ name: t.name, inward: t.inward, outward: t.outward }),
    });
    if (r.status !== 201) throw fail(`Creating link type "${t.name}"`, r);
    log(`Created link type "${t.name}".`);
  }
}

async function ensureVersion(project, log) {
  const res = await jira(route`/rest/api/3/project/${PROJECT_KEY}/versions`);
  if ((res.body || []).some((v) => v.name === G.RELEASE)) return;
  const r = await jira(route`/rest/api/3/version`, {
    method: 'POST',
    body: JSON.stringify({ projectId: Number(project.id), name: G.RELEASE, released: false }),
  });
  if (r.status !== 201) throw fail('Creating the release', r);
  log(`Created release ${G.RELEASE}.`);
}

function issueTypeIds(project) {
  const byName = {};
  for (const t of project.issueTypes || []) byName[t.name.toLowerCase()] = t.id;
  const pick = (...names) => names.map((n) => byName[n]).find(Boolean);
  return {
    epic: pick('epic'),
    story: pick('story', 'task'),
    task: pick('task', 'story'),
  };
}

async function bulkCreate(updates) {
  const keys = [];
  for (let i = 0; i < updates.length; i += 50) {
    const r = await jira(route`/rest/api/3/issue/bulk`, {
      method: 'POST',
      body: JSON.stringify({ issueUpdates: updates.slice(i, i + 50) }),
    });
    if (r.status !== 201) throw fail('Creating work items', r);
    if (r.body.errors && r.body.errors.length) throw fail('Creating work items', { status: 400, body: r.body.errors });
    keys.push(...r.body.issues.map((x) => x.key));
  }
  return keys;
}

async function link(typeName, inwardKey, outwardKey) {
  // Jira reads this as: <inwardIssue> <outward phrase> <outwardIssue>, e.g. "TC-1 verifies GLU-2".
  const r = await jira(route`/rest/api/3/issueLink`, {
    method: 'POST',
    body: JSON.stringify({ type: { name: typeName }, inwardIssue: { key: inwardKey }, outwardIssue: { key: outwardKey } }),
  });
  if (r.status !== 201) throw fail(`Linking ${inwardKey} to ${outwardKey}`, r);
}

async function ensureSpace(log) {
  const found = await conf(route`/wiki/api/v2/spaces?keys=${SPACE_KEY}`);
  if (found.status === 200 && found.body.results && found.body.results.length) return found.body.results[0];
  let r = await conf(route`/wiki/api/v2/spaces`, {
    method: 'POST',
    body: JSON.stringify({ key: SPACE_KEY, name: 'GlucoLoop design history file' }),
  });
  if (r.status >= 300) {
    // Older endpoint, still widely available.
    r = await conf(route`/wiki/rest/api/space`, {
      method: 'POST',
      body: JSON.stringify({ key: SPACE_KEY, name: 'GlucoLoop design history file' }),
    });
  }
  if (r.status >= 300) throw fail('Creating the Confluence space', r);
  log(`Created Confluence space ${SPACE_KEY}.`);
  const again = await conf(route`/wiki/api/v2/spaces?keys=${SPACE_KEY}`);
  return again.body.results[0];
}

async function ensurePages(space, siteUrl, log) {
  const pages = {};
  for (const d of G.designs) {
    const found = await conf(route`/wiki/api/v2/spaces/${space.id}/pages?title=${d.title}`);
    let page = found.status === 200 && found.body.results && found.body.results[0];
    if (!page) {
      const r = await conf(route`/wiki/api/v2/pages`, {
        method: 'POST',
        body: JSON.stringify({
          spaceId: String(space.id),
          status: 'current',
          title: d.title,
          body: { representation: 'storage', value: `<p>${d.body}</p><p><em>Walkdown sample data.</em></p>` },
        }),
      });
      if (r.status >= 300) throw fail(`Creating page "${d.title}"`, r);
      page = r.body;
    }
    pages[d.id] = { id: page.id, title: d.title, url: `${siteUrl}/wiki/pages/viewpage.action?pageId=${page.id}` };
  }
  log(`Design pages ready in ${SPACE_KEY}.`);
  return pages;
}

async function remoteLink(key, page) {
  const r = await jira(route`/rest/api/3/issue/${key}/remotelink`, {
    method: 'POST',
    body: JSON.stringify({
      globalId: `walkdown-design-${page.id}`,
      application: { type: 'com.atlassian.confluence', name: 'Confluence' },
      relationship: 'Design record',
      object: { url: page.url, title: page.title },
    }),
  });
  if (r.status >= 300) throw fail(`Linking design to ${key}`, r);
}

// Sample commits through Jira development information, so they show in each work
// item's Development panel (and, where supported, in Teamwork Graph).
async function storeDevInfo(reqKeys, siteUrl, log) {
  const seq = Date.now();
  const repoUrl = `${siteUrl}/wiki/spaces/${SPACE_KEY}`;
  const commits = [];
  G.requirements.forEach((r, i) => {
    r.commits.forEach((message, j) => {
      const id = `${(0x9a3f00 + i * 16 + j).toString(16)}${'c0ffee'.repeat(5)}`.slice(0, 40);
      commits.push({
        id,
        issueKeys: [reqKeys[r.id]],
        message: `${reqKeys[r.id]} ${message}`,
        author: { name: 'GlucoLoop sample' },
        fileCount: 2 + (i % 4),
        url: repoUrl,
        displayId: id.slice(0, 7),
        updateSequenceId: seq,
        authorTimestamp: new Date(Date.now() - (40 - i) * 86400000).toISOString(),
      });
    });
  });
  const r = await jira(route`/rest/devinfo/0.10/bulk`, {
    method: 'POST',
    body: JSON.stringify({
      repositories: [{ id: 'glucoloop-sample', name: 'glucoloop (sample)', url: repoUrl, commits, updateSequenceId: seq }],
      preventTransitions: true,
    }),
  });
  if (r.status >= 300) {
    log(`Could not store sample commits (${r.status}). Implementation evidence will use code links instead.`);
    return false;
  }
  log(`Stored ${commits.length} sample commits.`);
  return true;
}

async function codeLinkFallback(reqKeys, siteUrl) {
  for (const r of G.requirements) {
    for (const message of r.commits) {
      await jira(route`/rest/api/3/issue/${reqKeys[r.id]}/remotelink`, {
        method: 'POST',
        body: JSON.stringify({
          globalId: `walkdown-commit-${r.id}-${message}`,
          application: { type: 'walkdown.sample', name: 'GlucoLoop sample repo' },
          relationship: 'Implemented by',
          object: { url: `${siteUrl}/wiki/spaces/${SPACE_KEY}#commits/${encodeURIComponent(message)}`, title: `commit: ${message}` },
        }),
      });
    }
  }
}

/**
 * Loads the sample. `log` receives progress lines. Returns a summary.
 */
async function loadSample({ leadAccountId, siteUrl, log = () => {} }) {
  const project = await ensureProject(leadAccountId, log);
  const already = await jira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    body: JSON.stringify({ jql: `project = ${PROJECT_KEY} AND labels = ${C.labels.requirement}`, maxResults: 1, fields: ['summary'] }),
  });
  if (already.body && already.body.issues && already.body.issues.length) {
    log('Sample requirements already exist, so nothing new was created.');
    return { projectKey: PROJECT_KEY, created: false };
  }
  await ensureLinkTypes(log);
  await ensureVersion(project, log);
  const types = issueTypeIds(project);

  // 1. User needs (epics)
  const needKeys = {};
  const nk = await bulkCreate(
    G.userNeeds.map((n) => ({
      fields: { project: { key: PROJECT_KEY }, issuetype: { id: types.epic || types.task }, summary: `User need: ${n.summary}`, labels: ['wd-user-need'] },
    }))
  );
  G.userNeeds.forEach((n, i) => (needKeys[n.id] = nk[i]));
  log(`Created ${nk.length} user needs.`);

  // 2. Requirements
  const reqKeys = {};
  const rk = await bulkCreate(
    G.requirements.map((r) => {
      const labels = [C.labels.requirement, `${C.labels.classPrefix}${r.safetyClass.toLowerCase()}`];
      if (r.safety) labels.push(C.labels.safety);
      if (r.changed) labels.push(C.labels.changed);
      const fields = {
        project: { key: PROJECT_KEY },
        issuetype: { id: types.story },
        summary: r.summary,
        labels,
        description: adf(`Software requirement ${r.id}. IEC 62304 Class ${r.safetyClass}.`, 'Walkdown sample data.'),
      };
      if (r.release !== false) fields.fixVersions = [{ name: G.RELEASE }];
      if (types.epic && needKeys[r.need]) fields.parent = { key: needKeys[r.need] };
      return { fields };
    })
  );
  G.requirements.forEach((r, i) => (reqKeys[r.id] = rk[i]));
  log(`Created ${rk.length} requirements.`);

  // 3. Verification tests (one per requirement)
  const tk = await bulkCreate(
    G.requirements.map((r) => ({
      fields: {
        project: { key: PROJECT_KEY },
        issuetype: { id: types.task },
        summary: `Verify: ${r.summary}`,
        labels: [C.labels.test, `${C.labels.resultPrefix}${r.test}`],
      },
    }))
  );
  log(`Created ${tk.length} verification tests.`);

  // 4. Risk file
  const riskKeys = {};
  const hk = await bulkCreate(
    G.risks.map((h) => {
      const labels = [C.labels.risk];
      if (h.controlVerified) labels.push(C.labels.controlVerified);
      return {
        fields: {
          project: { key: PROJECT_KEY },
          issuetype: { id: types.task },
          summary: `Hazard ${h.id}: ${h.hazard}`,
          labels,
          description: adf(`Risk control: ${h.control}.`, h.controlVerified ? 'Control verified as effective.' : 'Control effectiveness not yet verified.'),
        },
      };
    })
  );
  G.risks.forEach((h, i) => (riskKeys[h.id] = hk[i]));
  log(`Created ${hk.length} hazards in the risk file.`);

  // 5. Links
  for (let i = 0; i < G.requirements.length; i++) {
    const r = G.requirements[i];
    await link(C.linkTypes.verifies.name, tk[i], reqKeys[r.id]);
    for (const h of r.risks) await link(C.linkTypes.riskControl.name, reqKeys[r.id], riskKeys[h]);
  }
  log('Linked tests and risk controls.');

  // 6. Design pages in Confluence
  let pages = null;
  try {
    const space = await ensureSpace(log);
    pages = await ensurePages(space, siteUrl, log);
  } catch (e) {
    log(`Skipped Confluence design pages: ${e.message}`);
  }
  if (pages)
    for (const r of G.requirements) if (r.design) await remoteLink(reqKeys[r.id], pages[r.design]);

  // 7. Implementation evidence
  const ok = await storeDevInfo(reqKeys, siteUrl, log);
  if (!ok) await codeLinkFallback(reqKeys, siteUrl);

  log('GlucoLoop sample is ready.');
  return { projectKey: PROJECT_KEY, created: true, requirements: rk.length };
}

module.exports = { loadSample, PROJECT_KEY };
