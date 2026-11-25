---
name: audit-sampling
description: Rehearse a medical-device software audit. Trace sampled Jira requirements end to end (design, code, verification, risk control, release) and report the first broken link as an auditor would.
---

# Audit sampling

Use this skill when someone asks to rehearse an audit, check traceability, or test whether a requirement is audit-ready.

1. For each requirement key, call `trace-requirement`.
2. Report each link in order: design → implementation → verification → risk control → release.
3. Stop at the first broken link. Phrase the gap as an auditor's request for evidence, e.g. "Show me the verification record for GLU-12."
4. Never claim evidence exists unless the action returned it.
