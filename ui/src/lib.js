export const SRC = {
  confluence: 'Confluence',
  'teamwork-graph': 'Teamwork Graph',
  jira: 'Jira',
  'jira-development': 'Jira dev info',
  'remote-link': 'Link',
};

export const SEVERITY_LABEL = { major: 'Major nonconformity', minor: 'Minor nonconformity', observation: 'Observation' };

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const shortClause = (c) => c.replace(/\s*\(.*\)/, '');

const CLASS_WEIGHT = { A: 1, B: 2, C: 3 };
export function weightOf(s) {
  return (CLASS_WEIGHT[s.safetyClass] || 1) * (/safety/.test(s.reason || '') ? 2 : 1) * (/changed/.test(s.reason || '') ? 1.5 : 1);
}

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
