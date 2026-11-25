# Walkdown

**A mock auditor you assign a ticket to.** Walkdown rehearses a medical-device software audit inside Jira. It samples requirements the way an auditor does (weighted by IEC 62304 safety class, safety relevance and recent change), walks each trace end to end, and stops at the first broken link:

> design → code → verification → risk control → release

Each gap is graded the way auditors grade it (major nonconformity, minor nonconformity, observation), with clause references (IEC 62304, ISO 14971, ISO 13485, 21 CFR 820.30) and the question an auditor would ask. A readiness score rises as gaps are fixed.

Built on Atlassian Forge for Codegeist 2026 (Apps for Specialized Industries). It runs on Atlassian: no external services, no data leaves the site.

## Try it in five minutes (for judges)

1. **Install** Walkdown with the install link from the submission. Choose your site, and install it in **Jira and Confluence**.
2. In Jira, open **Apps → Walkdown** and click **Load the GlucoLoop sample**. In about a minute it creates:
   - **GlucoLoop:** a fictional insulin-dosing app (project key `GLU`) with 4 user needs, 20 requirements, 20 verification tests and a 9-hazard risk file;
   - a release, and a Confluence space with design pages;
   - sample commits, which also flow into Teamwork Graph.

   A few traces are broken on purpose.
3. Click **Run rehearsal**. Watch the walk, then read the auditor's log. The hero finding is **bolus rounding**: a Class C, safety-related requirement whose over-delivery hazard is in the risk file, but with no risk control linked.
4. Open that requirement (the **Open** button) and look at the **Walkdown trace** panel in the ticket's sidebar.
5. **Assign the auditor to a ticket.** Either:
   - create a work item in `GLU` called `Audit rehearsal: Class C, 8 samples`, and Walkdown replies on the ticket and raises its questions on each affected requirement; or
   - on any ticket, open **Agents → Walkdown Auditor**, which runs an agent session on that work item.
6. **Ask Rovo.** In Rovo chat, choose **Walkdown Auditor** and try *"Run an audit rehearsal on GLU, 10 samples"* or *"Trace GLU-6 like an auditor would"*.

### Optional admin steps

- **Block releases with a broken trace.** Go to Jira settings → Work items → Workflows, find *Software Simplified Workflow for Project GLU*, and select **Edit**. Select the transition into **Done**, then Rules → **Validate details** → **Walkdown trace check**, and **Update workflow**. Moving GLU-6 to Done is then refused with the ISO 14971 reason.
- **Use Walkdown from Claude, Cursor or any MCP client.**
  1. Go to Atlassian Administration → your site → **Connected apps** → Walkdown → Details. Click **Enable tools** under *Expose tools to MCP-compatible apps*. Do this for **both** the Jira and the Confluence installation, or the client can't list the tools.
  2. Add the remote MCP server `https://mcp.atlassian.com/forge/b76b5155-9742-4c85-b2ec-10bf789babad` to your client and approve the Atlassian sign-in.
  3. Tools available: `run-rehearsal`, `get-findings`, `get-readiness`, `trace-requirement`.

## How it works

| Piece | Forge module | What it does |
|---|---|---|
| Audit engine | plain functions | Risk-weighted sampling (seeded, reproducible), trace walk, auditor grading, readiness score. **No AI in the grading:** the same data always gives the same findings. |
| Walkdown Auditor | `rovo:agent` + 5 `action`s + `rovo:skill` | Runs rehearsals, traces requirements, explains findings, posts auditor questions (with Rovo's review step before writing). |
| Assignable auditor | `rovo:agent` in the work item's Agents menu | Starts an agent session on the ticket. |
| "Audit rehearsal" tickets | `trigger` + `consumer` queue | A rehearsal requested as a ticket runs in the background and answers on the ticket. |
| MCP server | `rovo:mcp` | The same actions, exposed to external AI clients through Atlassian's MCP server. |
| Release gate | `jira:workflowValidator` | Refuses to release a requirement whose trace is broken, and says why. |
| Main page and ticket panel | `jira:globalPage`, `jira:issueContext` (Custom UI, Atlassian Design System tokens) | The verdict, the walk, the auditor's log, the sampling ledger. |
| Evidence | Jira links, Confluence links, **Teamwork Graph** | Design: Confluence pages linked to the requirement. Code: commits and pull requests linked to the work item, read from Teamwork Graph (persisted Cypher and curated queries), falling back to Jira development information and code links. Tests and risks: Jira links. |

### Use it on your own project

Walkdown reads ordinary Jira data, using these conventions (the sample uses them too):

| What | How Walkdown recognises it |
|---|---|
| Requirement | label `wd-requirement` |
| Safety class | label `iec62304-class-a`, `-b` or `-c` |
| Safety-related | label `safety-related`; recent change: `changed-since-release` |
| Verification test | label `wd-test`, linked with **Verifies** (test *verifies* requirement); result label `result-pass`, `result-fail` or `result-not-run`, or Done status = pass |
| Risk / hazard | label `wd-risk`, linked with **Risk control** (requirement *mitigates* hazard); label `control-verified` when effectiveness is verified |
| Design | a Confluence page linked to the requirement |
| Code | commits or PRs linked to the work item (Bitbucket, GitHub or GitLab through Jira development information and Teamwork Graph), or code links |
| Release | Fix version |

The sample loader creates the two link types if they are missing.

## Privacy, data and cost

- **Runs on Atlassian.** Forge compute and Forge storage only, no egress. Rehearsal history (scores and findings) is kept in the app's Forge storage on your site.
- **Permissions.** Walkdown reads Jira work items, links and Confluence page links, and reads Teamwork Graph as the signed-in user, so it only sees what that user can see. It writes comments (auditor questions), and, only when you click *Load the GlucoLoop sample*, a project, link types, a release, a Confluence space and sample development information.
- **AI and cost.** Walkdown does not call an LLM. Rovo features use your organisation's Rovo allowance, like any Rovo agent.

## Limitations

- It is a rehearsal, not a formal audit opinion.
- Teamwork Graph queries run as the user, so rehearsals started from a ticket (which run as the app) read code evidence from Jira development information instead.
- The first page load after an update can take a few seconds while Atlassian warms the app.

## Development

```bash
npm install && (cd ui && npm install)
npm test            # engine and collector tests (node:test)
npm run build       # builds the Custom UI into ui/dist
forge deploy && forge install
```

- `src/engine`: sampling, walking, grading and scoring (pure, tested).
- `src/collect`: reads Jira, Confluence links, Teamwork Graph and development information.
- `src/sample`: the GlucoLoop dataset and loader.
- `src/rehearsal.js`: runs a rehearsal and keeps history.
- `src/index.js`: handlers for every Forge module.
- `ui/`: Custom UI (React and Vite).
- `skills/`: the Rovo skill.
- `prompts/`: the agent prompt.

Design notes: [DESIGN.md](DESIGN.md).
