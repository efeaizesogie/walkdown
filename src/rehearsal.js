// Runs a rehearsal against live data and keeps run history in Forge storage.

const api = require('@forge/api');
const { kvs } = require('@forge/kvs');
const engine = require('./engine/engine');
const fetch = require('./collect/fetch');

const DEFAULT_PROJECT = 'GLU';
const HISTORY_KEY = (p) => `runs:${p}`;
const MAX_HISTORY = 30;

// Parses "Audit rehearsal: Class B, 10 samples" style text.
function parseRequest(text = '') {
  const size = Number((text.match(/(\d+)\s*(samples?|requirements?|items?)/i) || [])[1]) || 10;
  const cls = (text.match(/class\s*([abc])\b/i) || [])[1];
  return { size: Math.min(Math.max(size, 1), 50), minClass: cls ? cls.toUpperCase() : undefined };
}

async function siteInfo() {
  // Base URL for links; cloudId comes from the invocation context where available.
  const res = await api.asApp().requestJira(api.route`/rest/api/3/serverInfo`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { baseUrl: body.baseUrl };
}

/**
 * opts: { projectKey, size, minClass, seed, asUser, cloudId, requestedBy, source }
 */
async function runRehearsal(opts = {}) {
  const projectKey = (opts.projectKey || DEFAULT_PROJECT).toUpperCase();
  const requester = opts.asUser ? api.asUser() : api.asApp();
  const { baseUrl } = await siteInfo();
  const population = await fetch.loadRequirements(requester, projectKey);
  if (!population.length) {
    return { error: `No requirements labelled "wd-requirement" were found in ${projectKey}. Load the sample project or label your requirements.` };
  }
  const seed = opts.seed || `${projectKey}-${Date.now()}`;
  const picked = engine.sample(population, opts.size || 10, seed, { minClass: opts.minClass });
  const { inputs, notes } = await fetch.loadEvidence(
    requester,
    picked.map((r) => r.key),
    { baseUrl, cloudId: opts.cloudId, useGraph: !!opts.asUser && !!opts.cloudId }
  );
  // Score exactly the sampled set (sampling already applied).
  const result = engine.rehearse(inputs, { size: inputs.length, seed: 'fixed' });
  const reasons = new Map(picked.map((p) => [p.key, p.reason]));
  result.sample = result.sample.map((s) => ({ ...s, reason: reasons.get(s.key) || s.reason }));
  result.population = population.length;

  const run = {
    id: seed,
    projectKey,
    at: new Date().toISOString(),
    requestedBy: opts.requestedBy || null,
    source: opts.source || 'app',
    minClass: opts.minClass || null,
    baseUrl,
    notes,
    ...result,
  };
  await saveRun(run);
  return run;
}

async function saveRun(run) {
  const key = HISTORY_KEY(run.projectKey);
  const history = (await kvs.get(key)) || [];
  // Keep a compact history for the trend; full detail only for the latest few.
  history.unshift({ id: run.id, at: run.at, readiness: run.readiness, counts: run.counts, sampleSize: run.sampleSize, source: run.source });
  await kvs.set(key, history.slice(0, MAX_HISTORY));
  await kvs.set(`run:${run.id}`, run);
  await kvs.set(`latest:${run.projectKey}`, run.id);
}

async function latestRun(projectKey = DEFAULT_PROJECT) {
  const id = await kvs.get(`latest:${projectKey.toUpperCase()}`);
  return id ? kvs.get(`run:${id}`) : null;
}

async function history(projectKey = DEFAULT_PROJECT) {
  return (await kvs.get(HISTORY_KEY(projectKey.toUpperCase()))) || [];
}

// If the project has been deleted, its saved rehearsals describe work items that no
// longer exist: forget them so the page shows a clean start.
async function forgetIfProjectGone(projectKey = DEFAULT_PROJECT) {
  const key = projectKey.toUpperCase();
  const res = await api.asApp().requestJira(api.route`/rest/api/3/project/${key}`, { headers: { Accept: 'application/json' } });
  if (res.status !== 404) return false;
  await kvs.delete(`latest:${key}`);
  await kvs.delete(HISTORY_KEY(key));
  return true;
}

// One requirement's full trace, for the agent, MCP and the issue panel.
async function traceOne(issueKey, { asUser, cloudId } = {}) {
  const requester = asUser ? api.asUser() : api.asApp();
  const { baseUrl } = await siteInfo();
  const { inputs, notes } = await fetch.loadEvidence(requester, [issueKey.toUpperCase()], {
    baseUrl,
    cloudId,
    useGraph: !!asUser && !!cloudId,
  });
  if (!inputs.length) return { error: `${issueKey} was not found.` };
  const input = inputs[0];
  const trace = engine.walk(input);
  return { ...trace, safetyClass: input.safetyClass, safetyRelated: input.safetyRelated, finding: engine.grade(input, trace), notes };
}

module.exports = { runRehearsal, latestRun, history, traceOne, parseRequest, forgetIfProjectGone, DEFAULT_PROJECT };
