// Stand-in for @forge/bridge, used only by the screenshot preview build (vite --mode shots).
// It serves real engine output from window.__WALKDOWN_PREVIEW__ instead of calling Jira.
const data = () => window.__WALKDOWN_PREVIEW__ || {};

export async function invoke(name, payload) {
  const d = data();
  switch (name) {
    case 'latest':
      return d.run;
    case 'history':
      return d.history;
    case 'sampleStatus':
      return { state: 'idle' };
    case 'trace':
      return d.traces && d.traces[payload.issueKey];
    case 'runRehearsal':
      return d.run;
    case 'askOnTicket':
      return { posted: true };
    default:
      return null;
  }
}

export const router = { open: () => {} };

export const view = {
  theme: { enable: async () => {} },
  getContext: async () => {
    const issueKey = new URLSearchParams(location.search).get('panel');
    return issueKey ? { moduleKey: 'walkdown-issue-panel', extension: { issue: { key: issueKey } } } : { moduleKey: 'walkdown-home' };
  },
};
