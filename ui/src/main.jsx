import React from 'react';
import { createRoot } from 'react-dom/client';
import { view } from '@forge/bridge';
import App from './App';
import IssuePanel from './IssuePanel';
import './styles.css';

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) return <div className="notice error">Walkdown hit an error: {String(this.state.error.message || this.state.error)}</div>;
    return this.props.children;
  }
}

(async () => {
  // ADS tokens: colours, type and spacing follow Jira's light or dark theme.
  try {
    await view.theme.enable();
  } catch (e) {
    /* outside Jira (local preview) the fallbacks in styles.css apply */
  }
  let context = {};
  try {
    context = await view.getContext();
  } catch (e) {
    /* local preview */
  }
  const issueKey = context.extension && context.extension.issue && context.extension.issue.key;
  createRoot(document.getElementById('root')).render(
    <Boundary>{context.moduleKey === 'walkdown-issue-panel' && issueKey ? <IssuePanel issueKey={issueKey} /> : <App />}</Boundary>
  );
})();
