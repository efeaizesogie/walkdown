# Walkdown: build plan (draft for approval, 2026-11-25)

Codegeist 2026, Specialized Industries track. Deadline: Tue Dec 22 2026, 12:00 PT (20:00 Lagos).
Bonus targets: Best Rovo Agent, Best MCP App, Best Teamwork Graph Integration, Best Marketplace Published App ($1.5K each).

## What the docs say (checked 2026-11-25)

| Capability | Status | What it means for Walkdown |
|---|---|---|
| `rovo:agent` + `action` | GA | The core agent. Action verbs: GET, CREATE, UPDATE, DELETE, TRIGGER. Known issue FRGE-1601: non-GET verbs are unreliable. |
| Assigning a work item to an agent | Only through `rovo:agentConnector` (remote A2A agents) | That needs an external endpoint, which breaks "Runs on Atlassian". **Not used.** |
| Agent in an Automation rule | GA | Works, but Automation-run agents may only call **GET** actions. |
| `rovo:skill` | Preview | One skill, "audit-sampling", bundling the actions. |
| `rovo:mcp` | Preview | Endpoint `mcp.atlassian.com/forge/<appId>`, OAuth, runs with the user's permissions, at most 50 tools. A site admin must switch it on (off by default). |
| Teamwork Graph API | Preview | **Runs as the user only (asUser).** Uses curated queries or persisted Cypher; raw Cypher is closed to new apps. A missing scope returns an empty result with no error. Whether the graph links issue → page → commit/PR is **not documented**: spike it. |
| `jira:workflowValidator` | Preview | Function validator returns `{result, errorMessage}`. Set `projectTypes` to both project types. Timeout is not documented. |
| Bitbucket | One app cannot mix workspace and site scopes | Read code evidence through Teamwork Graph or Jira development info. There is no Bitbucket module. |
| Demo site | `forge site provision` | 90 days; enterprise Jira, Confluence, JSM and Rovo. |
| Cost | Rovo credits come from the customer org's allowance. Forge LLMs cost money with no free quota. | **The audit engine is plain code, with no LLM.** Rovo only phrases the conversation. Cost to you: $0, apart from Forge compute, which stays inside the free tier. |
| Marketplace (free app) | Review takes about 1 week | Submit by **Dec 11** so a decision lands before Dec 22. |

Not confirmed (Devpost blocks automated reads, so you check by hand): video length (2025's limit was under 5 minutes), install-link wording, and exact bonus criteria.

## Devpost rules (read in the user's Chrome, 2026-11-25)

- **One submission can win at most ONE grand prize plus ONE bonus prize.** The bonus prizes don't stack: the realistic total is $15K + $1.5K. Still build the agent, MCP and Teamwork Graph parts, because they lift the "Technological Implementation" score, but pick one bonus to lead with. Best Agents is the strongest fit, as its wording names "Assignable agents" and `rovo:skill`/`action`.
- Stage 1 is pass/fail on fitting the theme and using the platform properly. Stage 2 scores five criteria equally: Technological Implementation ("not … a single hardcoded demo path"), Design, Potential Impact, Innovation, and Presentation.
- **Judges install the app on their own site through an install link.** So the app needs a **"Load GlucoLoop sample project"** button inside it, plus clear setup steps (including how to switch on MCP). Without them a judge sees an empty site.
- Video: under 5 minutes, public on YouTube, no third-party trademarks or copyrighted music.
- Judging runs Jan 5 – Feb 3 2027, so the app must keep working through Feb 3. Winners are announced around Feb 15.
- The user is already registered for the hackathon. No project has been started on Devpost yet.

## Architecture

Every decision comes from **plain code that is the same on every run**: the risk-weighted sampler, the trace walker, the grading rules and the readiness score. The Rovo agent explains and asks follow-up questions; it never decides a finding. That suits a regulated buyer and costs $0 to run.

**Trace model (IEC 62304 / ISO 14971):**
User need → Software requirement (REQ) → Design (Confluence page) → Implementation (commit/PR) → Verification test (TC + result) → Risk control (RISK hazard → control measure) → Release (fixVersion).
Each link is checked in this order: Teamwork Graph (as the user), then Jira issue links and remote links (REST), then development info. The UI shows which source proved each link.

**Ways to run a rehearsal:**
1. **Work item, the "assign it a ticket" demo:** create an "Audit rehearsal: Class B, 10 samples" work item, or add the `walkdown` label. A Forge **Jira event trigger** runs the engine and posts the auditor's opening comment, then one follow-up comment on each sampled requirement ("Show me the verification record for REQ-114"). The trigger handles all writes, so it avoids the unreliable non-GET actions.
2. **Rovo chat:** the Walkdown Auditor agent. You say "rehearse Class C, 8 samples", and its GET actions return the sample, the walk and the findings, which it explains in an auditor's voice. If CREATE turns out reliable, it can also file the rehearsal ticket.
3. **Claude Desktop through `rovo:mcp`:** the same actions (`walkdown_run_rehearsal`, `walkdown_get_findings`, `walkdown_trace_requirement`, `walkdown_readiness`).
4. **Automation rule (optional):** a weekly scheduled rehearsal that posts its summary.

**Grading:** major nonconformity for a missing verification or risk control on a Class C or safety-related requirement; minor nonconformity for a stale design or a test with no result; observation for naming or traceability hygiene. Each finding cites a clause (e.g. IEC 62304 §5.1.1, §5.7; ISO 14971 §7.4; ISO 13485 §7.3; 21 CFR 820.30). Readiness score from 0 to 100, kept per run in Forge storage, so the trend line rises as gaps close.

**Surfaces:** a global page "Walkdown" (run history, readiness trend, findings report, a trace "walk" animation showing a dot that moves along the chain and stops red at the first broken link); an issue panel on each REQ (its trace chain plus open findings); a workflow validator that blocks Released/Done on a REQ whose trace is broken.

Stack: Forge + Custom UI (React + Vite + TS) styled with Atlassian Design System tokens (`@atlaskit/tokens`, `@atlaskit/*` primitives) and drawn SVG for the trace walk. Forge storage only. No egress, so it qualifies for "Runs on Atlassian".

## Seed demo: "GlucoLoop" (fictional insulin-dosing companion app, IEC 62304 Class C)

A script uses the Jira and Confluence REST APIs with your API token, run locally, never committed. It creates about 40 REQs, 15 RISKs, 30 TCs, 12 design pages and a Bitbucket repo whose commits reference issue keys. About 6 traces are broken on purpose. The worst: "bolus calculation rounding", a Class C requirement with a passing test but no risk control linked to the over-delivery hazard. That gives a major nonconformity on screen, then a fix, then the score rising, all within the video.

## Schedule (27 days)

| Dates | Work |
|---|---|
| Nov 26-27 | **Spike.** Forge CLI, demo site, a hello agent, a Teamwork Graph query from issue → page → commit, the validator, and an MCP call from Claude Desktop. Go/no-go on each bonus. |
| Nov 28-Dec 1 | Seed script and the GlucoLoop dataset. Trace walker and grading engine, with unit tests on fixtures. |
| Dec 2-5 | Event-trigger rehearsal, comments, Rovo agent, skill, actions, and the MCP module. |
| Dec 6-9 | Design pass (Framer and Refero references → ADS tokens), global page, issue panel, walk animation, unslop pass, validator. |
| Dec 10-11 | Hardening, README, privacy/security tab. **Marketplace submission (needs your OK).** |
| Dec 12-17 | 4K code-drawn demo video (under 5 min) and the Devpost write-up. |
| Dec 18-21 | Buffer, review fixes, final deploy, install link. **Submit (needs your OK).** |

## What only you can do
1. Install the Forge CLI (`npm i -g @forge/cli`; I can run this) → **you run `forge login`** with an Atlassian API token.
2. **You run `forge site provision`** (or approve me running it after login). It creates the demo site under your account.
3. Create the Bitbucket workspace and repo for the seed, and connect it to Jira on the demo site.
4. Turn on MCP for the app in Atlassian Administration, and connect Claude Desktop (OAuth).
5. Approve: Marketplace submission, public GitHub repo (if wanted), YouTube upload, Devpost submission.

## Risks and fallbacks
- Teamwork Graph doesn't link commits or PRs: walk commits through Jira development info, and use Teamwork Graph for issue ↔ page ↔ team (still a real integration).
- Validator timeout is unknown: the validator reads a trace verdict cached in an issue property, which the trigger refreshes on every link change, so the check itself is cheap.
- Non-GET Rovo actions are flaky: writes go through triggers or the UI; the agent stays read-only plus explanation.
- Marketplace review misses the deadline: submit the listing anyway and note the review ticket in Devpost.
