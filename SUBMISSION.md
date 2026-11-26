# Walkdown: Devpost submission draft (Codegeist 2026)

Draft for your review. Nothing has been submitted to Devpost. The install link is kept out of this public repo; paste it from the private notes.

---

## Submission form fields

| Field | Value |
|---|---|
| Project name | Walkdown |
| Tagline | A mock auditor you assign a ticket to: rehearse your medical-device software audit inside Jira |
| Category | **Apps for Specialized Industries** |
| Bonus prizes | Best Agents (Rovo/Assignable agents); Best app with Atlassian MCP; Best apps with Teamwork Graph integration; Best Marketplace published app |
| Installation link | *(paste the judge install link)* |
| Demo video | https://youtu.be/g3VZY6gBIk4 (2:55, 4K) |
| Code | https://github.com/efeaizesogie/walkdown |
| Docs | https://efeaizesogie.github.io/walkdown/ |
| Marketplace | *(listing link or review ticket link, once Atlassian sends it)* |
| Built with | Atlassian Forge, Rovo agents, Rovo actions, Rovo skills, Rovo MCP, Teamwork Graph, Jira, Confluence, Forge Custom UI, Atlassian Design System tokens, React, Vite, Node.js, Forge KVS, Forge async events |

---

## Inspiration

Medical-device software teams live by IEC 62304, ISO 14971 and ISO 13485, and they dread audits. An auditor doesn't read everything. They **sample** a few requirements, favouring the risky ones, and **walk each trace end to end**: requirement → design → code → verification → risk control → release. At the first broken link, they write a finding.

Tools already build traceability matrices. Nothing lets a team **rehearse the walk**: watch an auditor pick its sample, follow each thread, stop where the evidence runs out, and ask the awkward question before the real auditor does.

## What it does

Walkdown is a mock auditor that lives in Jira.

- **Samples like an auditor.** Requirements are weighted by IEC 62304 safety class, safety relevance and recent change. The sample is seeded, so it's reproducible, and the sampling ledger shows why each requirement was picked.
- **Walks every trace.** Each sampled requirement is walked through design (Confluence), code (commits and pull requests from **Teamwork Graph**), verification (linked tests and their results), risk control (linked hazards whose controls were verified) and release. The walk stops at the first broken link, and every station shows where its evidence came from.
- **Grades like an auditor.** Gaps are graded as **major nonconformity, minor nonconformity or observation**, with clause references (IEC 62304 §5.7, ISO 14971 §7.1, ISO 13485 §7.3.6, 21 CFR 820.30(f)…) and the question an auditor would ask. For example: *"GLU-6 is safety-related. Which hazard does it relate to, and where is the risk control that covers it?"* A **readiness score** rises as gaps are fixed.
- **You can assign it a ticket.**
  - Pick **Walkdown Auditor** from a work item's Agents menu, and it runs an agent session on that ticket.
  - Or create `Audit rehearsal: Class C, 8 samples`: Walkdown answers on the ticket and raises its questions on each affected requirement.
- **Chat with it in Rovo**, or call the same tools from Claude, Cursor or any MCP client through Atlassian's MCP server.
- **Blocks broken releases.** A workflow rule refuses to move a requirement to Done or Release while its trace is broken, and says exactly why.
- **Try it in a minute.** One button builds **GlucoLoop**, a fictional insulin-dosing app (IEC 62304 Class C):
  - Jira: 4 user needs, 20 requirements, 20 verification tests, a 9-hazard risk file, the links between them and a release.
  - Confluence: a space with 4 design pages.
  - Code: 19 sample commits, which flow into Teamwork Graph.

  A few traces are broken on purpose. The hero gap is **bolus rounding**: the over-delivery hazard is in the risk file, but no risk control is linked, so it's graded a major nonconformity.

## How we built it

- **Forge, Runs on Atlassian.** No egress, no external services, Forge storage only. The Runs on Atlassian check passes on every deploy.
- **An audit engine that is plain code, not an LLM.** Sampling (weighted, seeded), walking and grading are pure functions with 14 automated tests. In a regulated setting that matters: the same data always gives the same findings, and every finding can be explained. Rovo does the conversation; the engine does the judging.
- **Rovo agent with 5 actions and a skill.** `run-rehearsal`, `get-findings`, `get-readiness`, `trace-requirement` and `post-auditor-question`, packaged as the `audit-sampling` skill. The write action goes through Rovo's review step before it posts.
- **Rovo MCP.** The same read actions are exposed through `rovo:mcp`, and were tested end to end from Claude Code via `mcp.atlassian.com/forge/<appId>`.
- **Teamwork Graph.**
  - The app reads work-item-to-commit links with a **persisted Cypher query** (`jira_work_item_links_external_commit`) and pull requests with a **curated query**, both run as the signed-in user so permissions are respected.
  - The sample loader writes commits as Jira development information, and Teamwork Graph links them to the work items on its own.
  - The walk labels each piece of evidence with its source, so the graph's contribution is visible.
- **Workflow validator, trigger and queues.** A `jira:workflowValidator` gates releases. A `trigger` picks up "Audit rehearsal" tickets and hands the work to an async **queue consumer**, because triggers can't run long; the sample loader works the same way.
- **Custom UI on Atlassian Design System tokens.** The main page and the ticket panel use `--ds-*` tokens, so they follow Jira's light and dark themes. The design borrows the structure of an inspection report, not a dashboard:
  - one dark verdict band;
  - an animated **walk** where a marker stops at the first broken link;
  - an auditor's log numbered NC-01, NC-02…;
  - red only where something actually failed.

## Challenges we ran into

- **Assigning a ticket to our own agent.** The docs describe assignable agents only for remote (A2A) agents, which would break Runs on Atlassian. In testing, our Forge `rovo:agent` itself appeared in the work item's Agents menu, so we built the "assign" experience on that, plus a ticket trigger.
- **Teamwork Graph details.**
  - Every query needs an operation name of the form `company_operation`.
  - Raw Cypher is closed to new apps, so commits come from a registered persisted query.
  - Missing scopes return empty results without an error.
- **MCP exposure is per installation.** With the app installed in Jira and Confluence, tools only listed once *both* installations had "Expose tools" switched on.
- **Marketplace versus judging.** An app submitted to the Marketplace can no longer be shared by install link. So the Marketplace listing uses a second app ID built from the same code by a script, and judges get the original app's install link.
- **"Agent not allowed" on deploy.** This was fixed by moving the agent's prompt out of the manifest into a resource file.

## Accomplishments that we're proud of

- A full audit loop inside Atlassian: sample → walk → grade → ask → block → re-score, with every number coming from real data.
- The "assign the auditor a ticket" moment, with no external server.
- Findings that cite the clause and phrase the question the way an auditor would.
- A Runs on Atlassian app that uses Rovo agents, skills, MCP, Teamwork Graph, a workflow validator, triggers, queues and Custom UI together.

## What we learned

- Rovo is strongest as the voice on top of deterministic logic. For compliance, the grading must be explainable and repeatable.
- Teamwork Graph turns "is there code for this requirement?" into a single query that works across products.
- Many Preview-feature details are only visible on a real site. Testing each one first saved days.

## What's next for Walkdown

- More standards: IEC 82304-1, ISO 27001 controls and FDA cybersecurity (SBOM, threat model) traces.
- Evidence freshness: flag tests run before the last code change.
- Scheduled rehearsals with a readiness trend per release.
- Export an audit-ready trace report to Confluence.

---

## Bonus prize write-ups

**Best Agents: Rovo/Assignable agents.** Walkdown Auditor is a Forge `rovo:agent` with five `action`s and a reusable `rovo:skill` (`audit-sampling`) that other agents can call. It runs from Rovo chat and from a work item's Agents menu, as an agent session on that ticket. Its write action, posting an auditor question as a comment, goes through Rovo's review step. The agent explains and asks; a deterministic engine grades, so its findings are reproducible.

**Best app with Atlassian MCP.** The `rovo:mcp` module exposes `run-rehearsal`, `get-findings`, `get-readiness` and `trace-requirement` through Atlassian's MCP server at `https://mcp.atlassian.com/forge/<appId>`. A QA lead can ask Claude, Cursor or any MCP client to "run an audit rehearsal on GLU, 10 samples" and get the graded findings. Tested end to end from Claude Code. Calls run with the user's own permissions.

**Best apps with Teamwork Graph integration.** Walkdown reads the graph to prove the "code" link in each trace: a persisted Cypher query follows `jira_work_item_links_external_commit` to `ExternalCommit`s, and the curated `jiraWorkItemLinkedExternalPullRequests` query follows PRs. Both run as the signed-in user. The sample loader writes development information, which Teamwork Graph links to the work items. The UI labels every station with its evidence source, so the graph's part is visible.

**Best Marketplace published app.** Walkdown is submitted to the Atlassian Marketplace as a free, Runs on Atlassian app ("Walkdown: Audit Rehearsal for Medical Device Software"), with a privacy policy, documentation, Apache-2.0 code and the Bonterms standard end-user agreement. Link: *(listing or review ticket)*.

---

## Testing instructions for judges

1. Open the installation link and install Walkdown on your site, in **Jira and Confluence**.
2. Jira → **Apps → Walkdown** → **Load the GlucoLoop sample**. It takes about a minute and creates project `GLU`, a Confluence space `GLUCO` and sample commits.
3. Click **Run rehearsal**. Read the verdict, the walk and the auditor's log.
4. Open **GLU-6** (**Open GLU-6** in the log) and see the **Walkdown trace** panel in the ticket's right sidebar.
5. Assign the auditor:
   - on any GLU ticket, choose **Agents → Walkdown Auditor**; or
   - create a work item in GLU called `Audit rehearsal: Class C, 8 samples`.
6. Rovo chat: choose **Walkdown Auditor**, then ask *"Run an audit rehearsal on GLU, 10 samples"* or *"Trace GLU-6 like an auditor would"*.
7. Optional release gate: in Jira settings → Workflows, edit *Software Simplified Workflow for Project GLU*. On the transition to **Done**, add the rule **Walkdown trace check**. Moving GLU-6 to Done is then refused with the ISO 14971 reason.
8. Optional MCP:
   1. In Atlassian Administration → your site → **Connected apps** → Walkdown → Details, click **Enable tools** on both the Jira and Confluence installations.
   2. Add `https://mcp.atlassian.com/forge/b76b5155-9742-4c85-b2ec-10bf789babad` to your MCP client.

Requirements: Jira and Confluence Cloud with Rovo enabled (a Forge demo site from `forge site provision` has everything).

## How it meets the main technology requirement

Walkdown is a Forge app built during the submission period, with a Forge manifest declaring Rovo, Jira and Teamwork Graph modules. It integrates with **Jira** (work items, links, workflow validator, issue context panel, triggers), **Confluence** (design pages), **Rovo** (agent, actions, skill, MCP) and **Teamwork Graph** (persisted and curated queries).
