// Walkdown: handlers for every Forge module.
const api = require('@forge/api');
const { route } = api;
const Resolver = require('@forge/resolver').default;
const { Queue } = require('@forge/events');
const { kvs } = require('@forge/kvs');
const R = require('./rehearsal');
const { loadSample } = require('./sample/loader');
const C = require('./collect/conventions');

const sampleQueue = new Queue({ key: 'walkdown-sample' });
const rehearsalQueue = new Queue({ key: 'walkdown-rehearsal' });

const adf = (...paras) => ({
  type: 'doc',
  version: 1,
  content: paras.filter(Boolean).map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })),
});

async function comment(key, ...paras) {
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${key}/comment`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: adf(...paras) }),
  });
  return res.status;
}

const cloudIdOf = (context, payload) =>
  (context && context.cloudId) || (payload && payload.context && payload.context.cloudId) || undefined;

// Try as the user (enables Teamwork Graph), fall back to the app.
async function withUserFallback(fn) {
  try {
    return await fn(true);
  } catch (e) {
    console.warn('asUser failed, using asApp:', String(e && e.message));
    return fn(false);
  }
}

// Compact summaries keep agent and MCP responses small and readable.
function summarizeRun(run) {
  if (!run || run.error) return run;
  return {
    project: run.projectKey,
    readiness: run.readiness,
    sampled: `${run.sampleSize} of ${run.population} requirements`,
    counts: run.counts,
    findings: run.findings.map((f) => ({
      key: f.key,
      severity: f.severity,
      brokenLink: f.stepLabel,
      gap: f.gap,
      clauses: f.clauses,
      auditorQuestion: f.question,
    })),
    clean: run.traces.filter((t) => !t.brokenAt).map((t) => t.key),
    notes: run.notes,
  };
}

// ---------- Rovo actions / MCP tools ----------

exports.traceRequirement = async (payload, context) => {
  const key = String(payload.issueKey || '').trim().toUpperCase();
  return withUserFallback((asUser) => R.traceOne(key, { asUser, cloudId: cloudIdOf(context, payload) }));
};

exports.runRehearsalAction = async (payload, context) => {
  const run = await withUserFallback((asUser) =>
    R.runRehearsal({
      projectKey: payload.projectKey,
      size: Number(payload.samples) || 10,
      minClass: payload.safetyClass ? String(payload.safetyClass).toUpperCase().replace(/[^ABC]/g, '') || undefined : undefined,
      asUser,
      cloudId: cloudIdOf(context, payload),
      source: 'rovo',
    })
  );
  return summarizeRun(run);
};

exports.getFindings = async (payload) => summarizeRun(await R.latestRun(payload.projectKey || R.DEFAULT_PROJECT)) || { message: 'No rehearsal has run yet.' };

exports.getReadiness = async (payload) => {
  const h = await R.history(payload.projectKey || R.DEFAULT_PROJECT);
  return { project: (payload.projectKey || R.DEFAULT_PROJECT).toUpperCase(), trend: h.slice(0, 10).reverse().map((x) => ({ at: x.at, readiness: x.readiness, counts: x.counts })) };
};

exports.postAuditorQuestion = async (payload) => {
  const key = String(payload.issueKey || '').trim().toUpperCase();
  const status = await comment(key, `Walkdown auditor: ${payload.question}`);
  return { posted: status === 201, status };
};

// ---------- Trigger: "Audit rehearsal" work item ----------

exports.onIssueCreated = async (event) => {
  const issue = event.issue || {};
  const summary = (issue.fields && issue.fields.summary) || '';
  if (!/^audit rehearsal/i.test(summary)) return;
  const req = R.parseRequest(summary);
  const projectKey = (summary.match(/\bproject\s+([A-Z][A-Z0-9]+)/i) || [])[1] || R.DEFAULT_PROJECT;
  await comment(issue.key, `Walkdown auditor: rehearsal received. Sampling ${req.size} requirements${req.minClass ? ` of Class ${req.minClass} or higher` : ''} from ${projectKey}.`);
  await rehearsalQueue.push({ body: { issueKey: issue.key, projectKey, size: req.size, minClass: req.minClass || null } });
};

// Long-running part of a work-item rehearsal (queue consumer, up to 15 minutes).
exports.rehearsalConsumer = async (event) => {
  const b = (event && event.body) || event || {};
  const run = await R.runRehearsal({ projectKey: b.projectKey, size: b.size, minClass: b.minClass || undefined, source: 'work item', requestedBy: b.issueKey });
  if (run.error) return comment(b.issueKey, `Walkdown auditor: ${run.error}`);
  const c = run.counts;
  await comment(
    b.issueKey,
    `Walkdown auditor: rehearsal complete. Readiness ${run.readiness}/100.`,
    `Sampled ${run.sampleSize} of ${run.population}: ${run.sample.map((s) => s.key).join(', ')}.`,
    `${c.major} major nonconformities, ${c.minor} minor, ${c.observation} observations.`,
    run.findings.length ? 'I have asked for evidence on each affected requirement.' : 'Every sampled trace was complete.'
  );
  for (const f of run.findings) {
    await comment(f.key, `Walkdown auditor (${f.severity}): ${f.question}`, `Broken link: ${f.stepLabel}. ${f.gap}`, `Ref: ${f.clauses.join('; ')}`);
  }
};

// ---------- Workflow validator ----------

exports.validateTrace = async (event) => {
  const key = event.issue && event.issue.key;
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${key}?fields=labels`, { headers: { Accept: 'application/json' } });
  const issue = await res.json();
  if (!(issue.fields.labels || []).includes(C.labels.requirement)) return { result: true };
  const t = await R.traceOne(key, { asUser: false });
  if (t.error || !t.brokenAt || t.brokenAt === 'release') return { result: true };
  return {
    result: false,
    errorMessage: `Walkdown: ${key} can't be released. ${t.finding.stepLabel} link is broken: ${t.finding.gap} (${t.finding.clauses[0]})`,
  };
};

// ---------- Sample loader (queue consumer) ----------

async function setStatus(s) {
  await kvs.set('sample:status', { ...s, updatedAt: new Date().toISOString() });
}

exports.sampleConsumer = async (event) => {
  const body = (event && event.body) || event || {};
  const lines = [];
  // Progress writes are chained so a late "running" write can never overwrite "done".
  let writes = Promise.resolve();
  const log = (line) => {
    lines.push(line);
    console.log('sample:', line);
    const snapshot = [...lines];
    writes = writes.then(() => setStatus({ state: 'running', lines: snapshot })).catch(() => {});
  };
  try {
    const out = await loadSample({ leadAccountId: body.accountId, siteUrl: body.siteUrl, log });
    await writes;
    await setStatus({ state: 'done', lines, result: out });
  } catch (e) {
    console.error('sample failed', e);
    await writes;
    await setStatus({ state: 'failed', lines, error: e.message, hint: e.hint });
  }
};

// ---------- UI resolvers ----------

const resolver = new Resolver();

resolver.define('loadSample', async ({ context }) => {
  const res = await api.asApp().requestJira(route`/rest/api/3/serverInfo`, { headers: { Accept: 'application/json' } });
  const { baseUrl } = await res.json();
  await setStatus({ state: 'queued', lines: ['Queued.'] });
  await sampleQueue.push({ body: { accountId: context.accountId, siteUrl: baseUrl } });
  return { queued: true };
});

resolver.define('sampleStatus', async () => {
  const s = (await kvs.get('sample:status')) || { state: 'idle' };
  // A load can't run longer than the 15-minute consumer limit; anything older is stale.
  const age = s.updatedAt ? Date.now() - Date.parse(s.updatedAt) : 0;
  if ((s.state === 'running' || s.state === 'queued') && age > 16 * 60 * 1000) return { state: 'idle' };
  return s;
});

resolver.define('runRehearsal', async ({ payload, context }) =>
  R.runRehearsal({
    projectKey: payload.projectKey,
    size: payload.size,
    minClass: payload.minClass || undefined,
    asUser: true,
    cloudId: context.cloudId,
    source: 'app',
  })
);

resolver.define('askOnTicket', async ({ payload }) => {
  const key = String(payload.issueKey || '').trim().toUpperCase();
  const sev = payload.severity ? ` (${payload.severity})` : '';
  const status = await comment(key, `Walkdown auditor${sev}: ${payload.question}`);
  return { posted: status === 201, status };
});

resolver.define('latest', async ({ payload }) => R.latestRun(payload.projectKey || R.DEFAULT_PROJECT));
resolver.define('history', async ({ payload }) => R.history(payload.projectKey || R.DEFAULT_PROJECT));
resolver.define('trace', async ({ payload, context }) => R.traceOne(payload.issueKey, { asUser: true, cloudId: context.cloudId }));

exports.resolver = resolver.getDefinitions();
