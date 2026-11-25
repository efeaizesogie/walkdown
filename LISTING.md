# Walkdown: Marketplace listing draft

Draft for your review. Nothing has been submitted.

## Basics
- **App name:** Walkdown
- **Tagline:** Rehearse your medical-device software audit before the auditor does.
- **Category:** Project management / Compliance (closest Marketplace categories: "Quality assurance", "Compliance & security")
- **Hosting:** Forge, Runs on Atlassian (badge applied automatically)
- **Pricing:** Free
- **Products:** Jira (required), Confluence (for design records)

## Summary
Walkdown samples your requirements the way an auditor would, weighted by IEC 62304 safety class and risk. It walks each trace from design to code, verification, risk control and release, and stops at the first broken link. Gaps are graded as major, minor or observation, with clause references and the auditor's question, and a readiness score rises as you fix them.

## Highlights (exactly 3: title ≤ 50, summary ≤ 220, screenshot 1840×900 cropped to 580×330)

1. **Title:** See your traces the way an auditor will (42)
   **Summary:** A risk-weighted sample of requirements, each walked from design to release. The walk stops at the first broken link and shows where every piece of evidence came from: Confluence, Teamwork Graph or Jira. (205)
   **Screenshot:** the main page with the walk visible and the GLU-6 rail stopped at "Risk control: Missing".

2. **Title:** Findings graded like a real audit (35)
   **Summary:** Major and minor nonconformities and observations, with IEC 62304, ISO 14971, ISO 13485 and 21 CFR 820.30 references and the question an auditor would ask. Ask it on the ticket in one click. (205)
   **Screenshot:** the auditor's log with NC-01 to NC-03.

3. **Title:** Assign the auditor; block broken releases (41)
   **Summary:** Assign Walkdown Auditor to a ticket, chat with it in Rovo, or call it from any MCP client. A workflow rule refuses to release a requirement whose trace is broken, and says exactly why. (196)
   **Screenshot:** the ticket view with the Walkdown trace panel and the "Transition failed" message.

## More screenshots (up to 5; caption ≤ 220)
1. Rovo chat: "Run an audit rehearsal on GLU, 10 samples", with the agent's findings table.
2. The "Audit rehearsal: Class C, 8 samples" ticket with Walkdown's comments.
3. The sampling ledger: why each requirement was picked.
4. Dark mode.
5. The GlucoLoop sample loading on an empty site.

## Assets to make
- **Logo:** 144×144 PNG. It's the rail mark (three stations, the last one red) on a slate square; source is ui/public/icon.svg.
- **Banner:** 1120×548 PNG with the app name, partner name and one line: "Rehearse your audit before the auditor does."
- **Screenshots:** 1840×900 captures from the demo site.

## Links needed (must be public URLs)
- Documentation: the README (for example a public GitHub repo or a GitHub Pages page)
- Privacy policy: a short page (draft below)
- Support: an email address or URL you're happy to publish
- Partner (vendor) profile: your Developer Space name, logo and contact

## Scope justifications
| Scope | Why |
|---|---|
| read:jira-work | Read requirements, tests, risks, links, fix versions and remote links to build each trace. |
| write:jira-work | Post auditor questions as comments; create the optional GlucoLoop sample project's work items and links. |
| read:jira-user | Identify the user who starts a rehearsal (shown in run history). |
| manage:jira-configuration | Create the two link types (Verifies, Risk control) when loading the sample, if they are missing. |
| manage:jira-project | Create the optional GlucoLoop sample project and its release. |
| read:dev-info:jira, write:dev-info:jira | Store and read the sample project's example commits as development information. |
| storage:app | Keep rehearsal history and scores in Forge storage. |
| Confluence read/write content and space scopes | Read design-record links; create the sample design space and pages only when the user loads the sample. |
| read:graph:* (issue, page, commit, pull-request, branch, repository, deployment, build) | Read code and design evidence linked to a work item from Teamwork Graph, as the signed-in user. |

## Privacy & Security answers (draft)
- **Data egress:** none. All processing runs on Atlassian's Forge platform.
- **Storage:** Forge storage (app storage) only: rehearsal results (keys, summaries, grades, scores), stored on the customer's site and following Atlassian's data residency.
- **Personal data:** account ID of the user who started a run. No email addresses, names or end-user content leave the site.
- **AI/LLM:** none called by the app. Rovo features use the customer's own Rovo allowance.
- **Logging:** standard Forge logs (no personal data beyond Atlassian account IDs).
- **Data deletion:** uninstalling the app removes Forge storage. Sample content created by the loader is normal Jira/Confluence content the customer can delete.

## Privacy policy (draft text for a public page)
> Walkdown runs entirely on Atlassian Forge. It does not send data to any external service. It stores rehearsal results (work item keys and summaries, grades and scores, and the Atlassian account ID of the person who ran each rehearsal) in Forge app storage on your Atlassian site. That data is removed when the app is uninstalled. Walkdown does not use cookies or trackers and does not call AI models; Rovo features use your organisation's Rovo service. Contact: <support email>.
